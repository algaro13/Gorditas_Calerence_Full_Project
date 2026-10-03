/**
 * Crea (o reutiliza) un operador de plataforma: un usuario de la organización de la plataforma con
 * el rol «Plataforma» del proyecto. Es quien entra a la consola `/plataforma`.
 *
 *   npx tsx scripts/crear-operador.ts --email tu@correo.com --nombre "Tu Nombre"
 *   npx tsx scripts/crear-operador.ts --email op@kustodela.local --nombre "Operador" --password '...'   (solo local)
 *   npx tsx scripts/crear-operador.ts --env production --email tu@correo.com --nombre "Tu Nombre"
 *
 * Sin `--password`, Zitadel le manda al correo un enlace para crear su contraseña (en local llega a
 * Mailpit). Con `--password` se la fija directamente: úsalo solo en desarrollo.
 *
 * Es idempotente: si el rol, el usuario o el permiso ya existen, no los duplica.
 *
 * Variables: las mismas que `zitadel-bootstrap.ts` (`.env` de la raíz, `ZITADEL_API_BASE_URL`, el
 * PAT en `.local/zitadel-bootstrap/backend.pat` o `ZITADEL_PAT`).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const IS_PROD = arg('env') === 'production';
const ROL = 'Plataforma';
const PROJECT_NAME = 'Kustodela POS';

function loadDotEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
  }
  return out;
}
const env = { ...loadDotEnv(resolve(ROOT, '.env')), ...process.env } as Record<string, string>;

const APP_DOMAIN = env.APP_DOMAIN ?? 'localhost';
const ZITADEL_URL = IS_PROD ? `https://${env.ZITADEL_EXTERNAL_DOMAIN ?? `auth.${APP_DOMAIN}`}` : 'http://localhost:8080';
const API_BASE = (env.ZITADEL_API_BASE_URL ?? ZITADEL_URL).replace(/\/+$/, '');

function readPat(): string {
  if (env.ZITADEL_PAT) return env.ZITADEL_PAT.trim();
  const patFile = resolve(ROOT, '.local/zitadel-bootstrap/backend.pat');
  if (!existsSync(patFile)) throw new Error(`No se encontró el PAT en ${patFile}`);
  return readFileSync(patFile, 'utf8').trim();
}

const log = (msg: string) => console.log(`[crear-operador] ${msg}`);

async function api<T = Record<string, unknown>>(pat: string, method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown, orgId?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(orgId ? { 'x-zitadel-orgid': orgId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Zitadel ${res.status} en ${path}: ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

async function main(): Promise<void> {
  const email = arg('email');
  const nombre = arg('nombre') ?? 'Operador';
  const password = arg('password');
  if (!email) throw new Error('Falta --email');
  if (password && IS_PROD) throw new Error('--password es solo para desarrollo: en producción la persona crea la suya por correo');

  const pat = readPat();
  const org = (await api<{ org: { id: string; name: string } }>(pat, 'GET', '/management/v1/orgs/me')).org;
  log(`Organización de la plataforma: ${org.name} (${org.id})`);

  const proyectos = await api<{ result?: { id: string; name: string }[] }>(pat, 'POST', '/management/v1/projects/_search', {
    queries: [{ nameQuery: { name: PROJECT_NAME, method: 'TEXT_QUERY_METHOD_EQUALS' } }],
  }, org.id);
  const projectId = proyectos.result?.[0]?.id;
  if (!projectId) throw new Error(`No existe el proyecto «${PROJECT_NAME}». Corre primero el bootstrap.`);

  // 1. El rol en el proyecto.
  const roles = await api<{ result?: { key: string }[] }>(pat, 'POST', `/management/v1/projects/${projectId}/roles/_search`, {}, org.id);
  if (!roles.result?.some((r) => r.key === ROL)) {
    await api(pat, 'POST', `/management/v1/projects/${projectId}/roles`, { roleKey: ROL, displayName: ROL, group: 'plataforma' }, org.id);
    log(`Rol «${ROL}» creado en el proyecto`);
  }

  // 2. El usuario, en la organización de la plataforma.
  const encontrados = await api<{ result?: { id: string }[] }>(pat, 'POST', '/management/v1/users/_search', {
    queries: [{ emailQuery: { emailAddress: email, method: 'TEXT_QUERY_METHOD_EQUALS_IGNORE_CASE' } }],
  }, org.id);
  let userId = encontrados.result?.[0]?.id;
  if (userId) {
    log(`El usuario ${email} ya existe (${userId})`);
  } else {
    const [givenName, ...resto] = nombre.split(' ');
    const creado = await api<{ userId: string }>(pat, 'POST', '/v2/users/human', {
      organization: { orgId: org.id },
      username: email,
      profile: { givenName, familyName: resto.join(' ') || givenName },
      email: password ? { email, isVerified: true } : { email, sendCode: {} },
      ...(password ? { password: { password, changeRequired: false } } : {}),
    });
    userId = creado.userId;
    log(`Usuario ${email} creado (${userId})`);
    if (!password) {
      await api(pat, 'POST', `/v2/users/${userId}/password_reset`, { sendLink: {} });
      log('Se le envió un correo para crear su contraseña');
    }
  }

  // 3. El permiso: el rol «Plataforma» directo en el proyecto, dentro de su organización.
  const grants = await api<{ result?: { id: string; projectId: string; roleKeys?: string[] }[] }>(pat, 'POST', '/management/v1/users/grants/_search', {
    queries: [{ userIdQuery: { userId } }],
  }, org.id);
  const grant = grants.result?.find((g) => g.projectId === projectId);
  if (!grant) {
    await api(pat, 'POST', `/management/v1/users/${userId}/grants`, { projectId, roleKeys: [ROL] }, org.id);
    log(`Rol «${ROL}» concedido`);
  } else if (!grant.roleKeys?.includes(ROL)) {
    await api(pat, 'PUT', `/management/v1/users/${userId}/grants/${grant.id}`, { roleKeys: [...(grant.roleKeys ?? []), ROL] }, org.id);
    log(`Rol «${ROL}» agregado a su permiso`);
  } else {
    log(`Ya tenía el rol «${ROL}»`);
  }

  log(`Listo. Entra en /plataforma con ${email}.`);
}

main().catch((err) => {
  console.error('[crear-operador]', err instanceof Error ? err.message : err);
  process.exit(1);
});
