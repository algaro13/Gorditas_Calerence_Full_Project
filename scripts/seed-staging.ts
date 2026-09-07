/**
 * Siembra un entorno de pruebas: varios restaurantes y un usuario por rol con contraseña conocida.
 *
 *   ZITADEL_API_BASE=http://auth.<dominio> API_BASE=http://api.<dominio> npx tsx scripts/seed-staging.ts
 *
 * Es idempotente: los restaurantes o usuarios que ya existen se omiten.
 * Con SEED_SQL_OUT=<archivo> escribe además el SQL que da de alta a esos usuarios en el espejo
 * local (`tenant_users`), para que aparezcan en la pantalla de personal sin esperar a que entren.
 * Confirma también los correos pendientes leyendo el código de Mailpit, porque el API bloquea a
 * quien no lo ha confirmado y estas direcciones son inventadas.
 * Solo para entornos de prueba: las contraseñas son públicas y cualquiera puede leer esa bandeja.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1');
  }
  return out;
}

const rootEnv = { ...loadDotEnv(resolve(ROOT, '.env')), ...loadDotEnv(resolve(ROOT, 'Gorditas_Calerence_Backend/.env.production')), ...process.env } as Record<string, string>;

const APP_DOMAIN = rootEnv.APP_DOMAIN ?? 'localhost';
const API_BASE = (rootEnv.API_BASE ?? `http://api.${APP_DOMAIN}`).replace(/\/+$/, '');
const ZITADEL_API_BASE = (rootEnv.ZITADEL_API_BASE ?? `http://auth.${APP_DOMAIN}`).replace(/\/+$/, '');
const PROJECT_ID = rootEnv.ZITADEL_PROJECT_ID ?? '';
const DEFAULT_ORG_ID = rootEnv.ZITADEL_DEFAULT_ORG_ID ?? '';
const PASSWORD = rootEnv.SEED_PASSWORD ?? 'Kustodela1234!';

function readPat(): string {
  if (rootEnv.ZITADEL_PAT) return rootEnv.ZITADEL_PAT.trim();
  const patFile = resolve(ROOT, '.local/zitadel-bootstrap/backend.pat');
  if (!existsSync(patFile)) throw new Error(`No se encontró el PAT en ${patFile}`);
  return readFileSync(patFile, 'utf8').trim();
}
const PAT = readPat();

const SQL_OUT = rootEnv.SEED_SQL_OUT ?? '';
const log = (m: string) => console.log(`[seed-staging] ${m}`);

/** Filas del espejo local que se emiten como SQL (el backend solo las crea al primer acceso). */
const mirrorRows: string[] = [];
const sqlLiteral = (v: string) => `'${v.replace(/'/g, "''")}'`;

async function zitadel<T = Record<string, unknown>>(method: string, path: string, body?: unknown, orgId?: string): Promise<T> {
  const res = await fetch(`${ZITADEL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(orgId ? { 'x-zitadel-orgid': orgId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Zitadel ${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

interface StaffSeed {
  role: 'Admin' | 'Encargado' | 'Mesero' | 'Despachador' | 'Cocinero';
  nombre: string;
  apellido: string;
}

interface TenantSeed {
  slug: string;
  nombre: string;
  paleta: string;
  mesas: number;
  /** Nota que se imprime al final para saber para qué sirve cada restaurante. */
  proposito: string;
  staff: StaffSeed[];
}

const PLATILLOS = [
  { nombre: 'Gordita de chicharrón', precio: 25 },
  { nombre: 'Gordita de rajas con queso', precio: 30 },
  { nombre: 'Gordita de picadillo', precio: 28 },
  { nombre: 'Quesadilla', precio: 20 },
  { nombre: 'Taco dorado', precio: 15 },
];
const GUISOS = ['Chicharrón prensado', 'Rajas con queso', 'Picadillo', 'Mole verde', 'Frijoles con queso', 'Deshebrada', 'Papas con chorizo'];

const TENANTS: TenantSeed[] = [
  {
    slug: 'demo',
    nombre: 'Gorditas Demo',
    paleta: 'orange',
    mesas: 8,
    proposito: 'Restaurante principal de pruebas, con un usuario por cada rol.',
    staff: [
      { role: 'Encargado', nombre: 'Elena', apellido: 'Encargada' },
      { role: 'Mesero', nombre: 'Mario', apellido: 'Mesero' },
      { role: 'Despachador', nombre: 'Diana', apellido: 'Despachadora' },
      { role: 'Cocinero', nombre: 'Carlos', apellido: 'Cocinero' },
    ],
  },
  {
    slug: 'taqueria-lupita',
    nombre: 'Taquería Lupita',
    paleta: 'red',
    mesas: 4,
    proposito: 'Segundo restaurante: sirve para comprobar el aislamiento de datos entre negocios.',
    staff: [{ role: 'Mesero', nombre: 'Lucía', apellido: 'Mesera' }],
  },
  {
    slug: 'prueba-vencida',
    nombre: 'Fonda Prueba Vencida',
    paleta: 'green',
    mesas: 3,
    proposito: 'Su prueba gratuita se marca como vencida para ver el bloqueo por plan (403 TRIAL_EXPIRED).',
    staff: [],
  },
];

async function tenantExists(slug: string): Promise<{ orgId: string | null } | null> {
  const res = await fetch(`${API_BASE}/api/tenants/by-slug/${slug}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`by-slug ${slug} -> ${res.status}`);
  const body = (await res.json()) as { data?: { orgId: string | null } };
  return { orgId: body.data?.orgId ?? null };
}

async function createTenant(t: TenantSeed): Promise<void> {
  const payload = {
    admin: { nombre: 'Admin', apellido: t.nombre.split(' ')[0], email: `admin@${t.slug}.${APP_DOMAIN}`, password: PASSWORD },
    nombre: t.nombre,
    slug: t.slug,
    paleta: t.paleta,
    imagen: null,
    mesas: Array.from({ length: t.mesas }, (_, i) => ({ nombre: `Mesa ${i + 1}` })),
    platillos: PLATILLOS,
    guisos: GUISOS.map((nombre) => ({ nombre })),
  };
  const res = await fetch(`${API_BASE}/api/onboarding/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || !body.success) throw new Error(`onboarding ${t.slug} -> ${res.status} ${body.message ?? ''}`);
  log(`restaurante creado: ${t.slug} (admin@${t.slug}.${APP_DOMAIN})`);
}

async function findProjectGrant(orgId: string): Promise<string> {
  const res = await zitadel<{ result?: Array<{ grantId: string; grantedOrgId: string }> }>(
    'POST',
    `/management/v1/projects/${PROJECT_ID}/grants/_search`,
    { query: { offset: '0', limit: 200, asc: true } },
    DEFAULT_ORG_ID,
  );
  const grant = (res.result ?? []).find((g) => g.grantedOrgId === orgId);
  if (!grant) throw new Error(`No hay project grant para la organización ${orgId}`);
  return grant.grantId;
}

async function findUser(orgId: string, email: string): Promise<string | null> {
  const res = await zitadel<{ result?: Array<{ userId: string }> }>('POST', '/v2/users', {
    query: { offset: '0', limit: 5, asc: true },
    queries: [{ organizationIdQuery: { organizationId: orgId } }, { emailQuery: { emailAddress: email, method: 'TEXT_QUERY_METHOD_EQUALS' } }],
  });
  return res.result?.[0]?.userId ?? null;
}

/** Autorización del usuario sobre el proyecto (la necesita el espejo local para cambiar de rol). */
async function findUserGrant(orgId: string, userId: string): Promise<string | null> {
  const res = await zitadel<{ result?: Array<{ id: string }> }>(
    'POST',
    '/management/v1/users/grants/_search',
    { query: { offset: '0', limit: 50, asc: true }, queries: [{ userIdQuery: { userId } }] },
    orgId,
  );
  return res.result?.[0]?.id ?? null;
}

async function createStaff(orgId: string, projectGrantId: string, slug: string, s: StaffSeed): Promise<void> {
  const email = `${s.role.toLowerCase()}@${slug}.${APP_DOMAIN}`;
  let userId = await findUser(orgId, email);
  let grantId: string | null;

  if (userId) {
    grantId = await findUserGrant(orgId, userId);
    log(`  ya existía: ${email}`);
  } else {
    const user = await zitadel<{ userId: string }>('POST', '/v2/users/human', {
      organization: { orgId },
      profile: { givenName: s.nombre, familyName: s.apellido },
      email: { email, isVerified: true },
      password: { password: PASSWORD, changeRequired: false },
    });
    userId = user.userId;
    const grant = await zitadel<{ userGrantId: string }>(
      'POST',
      `/management/v1/users/${userId}/grants`,
      { projectId: PROJECT_ID, projectGrantId, roleKeys: [s.role] },
      orgId,
    );
    grantId = grant.userGrantId;
    log(`  ${s.role}: ${email}`);
  }

  mirrorRows.push(
    `INSERT INTO tenant_users (tenant_id, zitadel_user_id, email, nombre, role, grant_id, activo, updated_at) ` +
      `SELECT t.id, ${sqlLiteral(userId)}, ${sqlLiteral(email)}, ${sqlLiteral(`${s.nombre} ${s.apellido}`)}, ` +
      `${sqlLiteral(s.role)}::"TenantRole", ${grantId ? sqlLiteral(grantId) : 'NULL'}, true, now() ` +
      `FROM tenants t WHERE t.slug = ${sqlLiteral(slug)} ` +
      `ON CONFLICT (tenant_id, email) DO NOTHING;`,
  );
}

const MAILPIT_URL = (rootEnv.MAILPIT_URL ?? 'http://mailpit:8025').replace(/\/+$/, '');

async function mailpit<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${MAILPIT_URL}${path}`, { headers: { Accept: 'application/json' } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

interface MensajeMailpit {
  ID: string;
}

/** Identificadores de los correos que ya hay para esa dirección. */
async function correosDe(direccion: string): Promise<string[]> {
  const busq = await mailpit<{ messages?: MensajeMailpit[] }>(`/api/v1/search?query=${encodeURIComponent(`to:${direccion}`)}&limit=20`);
  return (busq?.messages ?? []).map((m) => m.ID);
}

/**
 * Código del primer correo que llegue después de pedir el reenvío. Hay que esperar al nuevo: el
 * reenvío invalida los códigos anteriores, así que leer el correo viejo daría un código muerto.
 */
async function codigoDelCorreoNuevo(direccion: string, previos: string[]): Promise<string | null> {
  const yaVistos = new Set(previos);
  for (let intento = 0; intento < 10; intento++) {
    await new Promise((r) => setTimeout(r, 1500));
    const busq = await mailpit<{ messages?: MensajeMailpit[] }>(`/api/v1/search?query=${encodeURIComponent(`to:${direccion}`)}&limit=20`);
    const nuevo = (busq?.messages ?? []).find((m) => !yaVistos.has(m.ID));
    if (!nuevo) continue;
    const det = await mailpit<{ Text?: string; HTML?: string }>(`/api/v1/message/${nuevo.ID}`);
    const texto = `${det?.Text ?? ''} ${(det?.HTML ?? '').replace(/<[^>]+>/g, ' ')}`;
    const m = texto.match(/[Cc]ódigo ([A-Z0-9]{4,10})/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Confirma los correos que queden pendientes en la organización. El registro deja al dueño con el
 * correo sin verificar, y el API bloquea a quien no lo confirma; como estas direcciones son
 * inventadas, se toma el código de la bandeja de pruebas igual que haría una persona.
 * Solo tiene sentido con Mailpit delante: si no responde, se avisa y se sigue.
 */
async function confirmarCorreos(orgId: string, slug: string): Promise<void> {
  const res = await zitadel<{ result?: Array<{ userId: string; human?: { email?: { email?: string; isVerified?: boolean } } }> }>(
    'POST',
    '/v2/users',
    { query: { offset: '0', limit: 100, asc: true }, queries: [{ organizationIdQuery: { organizationId: orgId } }] },
  );
  const pendientes = (res.result ?? []).filter((u) => u.human?.email?.isVerified !== true);
  if (pendientes.length === 0) return;

  for (const u of pendientes) {
    const direccion = u.human?.email?.email;
    if (!direccion) continue;
    const previos = await correosDe(direccion);
    await zitadel('POST', `/v2/users/${u.userId}/email/resend`, {});
    const codigo = await codigoDelCorreoNuevo(direccion, previos);
    if (!codigo) {
      log(`  ${slug}: no se pudo confirmar ${direccion} (¿Mailpit no responde en ${MAILPIT_URL}?)`);
      continue;
    }
    await zitadel('POST', `/v2/users/${u.userId}/email/verify`, { verificationCode: codigo });
    log(`  correo confirmado: ${direccion}`);
  }
}

async function main(): Promise<void> {
  if (!PROJECT_ID || !DEFAULT_ORG_ID) throw new Error('Faltan ZITADEL_PROJECT_ID / ZITADEL_DEFAULT_ORG_ID');
  log(`API ${API_BASE} · Zitadel ${ZITADEL_API_BASE} · dominio ${APP_DOMAIN}`);

  for (const t of TENANTS) {
    const existing = await tenantExists(t.slug);
    if (existing) log(`restaurante existente: ${t.slug}`);
    else await createTenant(t);

    const info = await tenantExists(t.slug);
    if (!info?.orgId) throw new Error(`El restaurante ${t.slug} no tiene organización`);

    if (t.staff.length > 0) {
      const grantId = await findProjectGrant(info.orgId);
      for (const s of t.staff) await createStaff(info.orgId, grantId, t.slug, s);
    }

    // El dueño nace con el correo sin confirmar y el API le cierra el paso hasta que lo abra.
    await confirmarCorreos(info.orgId, t.slug);
  }

  if (SQL_OUT && mirrorRows.length > 0) {
    writeFileSync(SQL_OUT, mirrorRows.join('\n') + '\n');
    log(`SQL del espejo local escrito en ${SQL_OUT} (${mirrorRows.length} usuarios)`);
  }

  console.log('\n=== Restaurantes de prueba ===');
  for (const t of TENANTS) {
    console.log(`\n${t.nombre}  ->  https://${t.slug}.${APP_DOMAIN}`);
    console.log(`  ${t.proposito}`);
    console.log(`  Admin        admin@${t.slug}.${APP_DOMAIN}`);
    for (const s of t.staff) console.log(`  ${s.role.padEnd(12)} ${s.role.toLowerCase()}@${t.slug}.${APP_DOMAIN}`);
  }
  console.log(`\nContraseña de todas las cuentas: ${PASSWORD}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
