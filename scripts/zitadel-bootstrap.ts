/**
 * Bootstrap idempotente de Zitadel para Kustodela POS.
 *
 * Crea (si no existen) el proyecto "Kustodela POS", sus roles, la aplicación SPA,
 * el proveedor SMTP y ajusta la política de login. Escribe los ids resultantes en
 * los archivos .env.development del backend y del frontend.
 *
 * Uso:
 *   tsx scripts/zitadel-bootstrap.ts                # local (lee .env de la raíz)
 *   tsx scripts/zitadel-bootstrap.ts --env production
 *
 * Variables (raíz .env): APP_DOMAIN, APP_SCHEME, ZITADEL_EXTERNAL_DOMAIN, ZITADEL_EXTERNAL_PORT
 * Opcionales: ZITADEL_API_BASE_URL (llamar a Zitadel por una URL interna), --smtp mailpit|skip
 * Opcionales: ZITADEL_PAT (si no, se lee de .local/zitadel-bootstrap/backend.pat)
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const ENV_NAME = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'development';
const IS_PROD = ENV_NAME === 'production';

// ---------- .env de la raíz ----------
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
const rootEnv = { ...loadDotEnv(resolve(ROOT, '.env')), ...process.env } as Record<string, string>;

const APP_DOMAIN = rootEnv.APP_DOMAIN ?? 'localhost';
const APP_SCHEME = rootEnv.APP_SCHEME ?? (IS_PROD ? 'https' : 'http');
const ZITADEL_DOMAIN = rootEnv.ZITADEL_EXTERNAL_DOMAIN ?? (IS_PROD ? `auth.${APP_DOMAIN}` : 'localhost');
const ZITADEL_PORT = rootEnv.ZITADEL_EXTERNAL_PORT ?? (IS_PROD ? '443' : '8080');
const ZITADEL_SCHEME = IS_PROD ? 'https' : 'http';
const ZITADEL_URL =
  (ZITADEL_SCHEME === 'https' && ZITADEL_PORT === '443') || (ZITADEL_SCHEME === 'http' && ZITADEL_PORT === '80')
    ? `${ZITADEL_SCHEME}://${ZITADEL_DOMAIN}`
    : `${ZITADEL_SCHEME}://${ZITADEL_DOMAIN}:${ZITADEL_PORT}`;

/**
 * Base para las llamadas de administración. Por defecto la URL pública; en un VPS detrás de un proxy
 * ajeno se apunta al router interno (`ZITADEL_API_BASE_URL=http://auth.<dominio>`) para no salir a
 * internet y volver. El Host debe seguir siendo el dominio externo o Zitadel no resuelve la instancia.
 */
const ZITADEL_API_BASE = (rootEnv.ZITADEL_API_BASE_URL ?? ZITADEL_URL).replace(/\/+$/, '');

/** Dónde apunta el SMTP de Zitadel: mailpit (captura local) o nada (se configura a mano en la consola). */
const SMTP_MODE = args.includes('--smtp') ? args[args.indexOf('--smtp') + 1] : IS_PROD ? 'skip' : 'mailpit';
const SMTP_HOST = rootEnv.SMTP_HOST ?? 'mailpit:1025';

const PROJECT_NAME = 'Kustodela POS';
const ROLES = ['Admin', 'Encargado', 'Mesero', 'Despachador', 'Cocinero'];
/** Subdominio de la plataforma (landing y registro). Configurable si `app` ya está ocupado. */
const PLATFORM_HOST = (rootEnv.APP_PLATFORM_HOST ?? 'app').toLowerCase();
const FRONTEND_ORIGIN = IS_PROD ? `${APP_SCHEME}://${PLATFORM_HOST}.${APP_DOMAIN}` : 'http://localhost:5173';
const SPA_APP_NAME = IS_PROD ? 'Kustodela POS Web' : 'Kustodela POS Web (dev)';

// ---------- PAT ----------
function readPat(): string {
  if (rootEnv.ZITADEL_PAT) return rootEnv.ZITADEL_PAT.trim();
  const patFile = resolve(ROOT, '.local/zitadel-bootstrap/backend.pat');
  if (!existsSync(patFile)) {
    throw new Error(`No se encontró el PAT en ${patFile}. ¿Arrancó zitadel-api? (npm run dev:up)`);
  }
  return readFileSync(patFile, 'utf8').trim();
}

// ---------- cliente HTTP ----------
class ZitadelError extends Error {
  constructor(public status: number, public body: string, public path: string) {
    super(`Zitadel ${status} en ${path}: ${body}`);
  }
}

type Json = Record<string, unknown>;

async function api<T = Json>(
  pat: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  orgId?: string,
): Promise<T> {
  const res = await fetch(`${ZITADEL_API_BASE}${path}`, {
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
  if (!res.ok) throw new ZitadelError(res.status, text, path);
  return (text ? JSON.parse(text) : {}) as T;
}

async function waitForZitadel(): Promise<void> {
  const url = `${ZITADEL_API_BASE}/.well-known/openid-configuration`;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const cfg = (await res.json()) as { issuer: string };
        log(`Zitadel listo. issuer=${cfg.issuer}`);
        return;
      }
    } catch {
      /* reintentar */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Zitadel no respondió en ${url}`);
}

const log = (msg: string) => console.log(`[zitadel-bootstrap] ${msg}`);

// ---------- pasos ----------
async function getDefaultOrgId(pat: string): Promise<string> {
  const res = await api<{ org: { id: string; name: string } }>(pat, 'GET', '/management/v1/orgs/me');
  log(`Organización por defecto: ${res.org.name} (${res.org.id})`);
  return res.org.id;
}

async function ensureProject(pat: string, orgId: string): Promise<string> {
  const search = await api<{ result?: Array<{ id: string; name: string }> }>(
    pat,
    'POST',
    '/management/v1/projects/_search',
    { queries: [{ nameQuery: { name: PROJECT_NAME, method: 'TEXT_QUERY_METHOD_EQUALS' } }] },
    orgId,
  );
  const settings = { projectRoleAssertion: true, projectRoleCheck: true, hasProjectCheck: true };
  const existing = search.result?.[0];
  if (existing) {
    await api(pat, 'PUT', `/management/v1/projects/${existing.id}`, { name: PROJECT_NAME, ...settings }, orgId).catch(
      (e: ZitadelError) => {
        // 400 "no changes" cuando ya está igual
        if (e.status !== 400) throw e;
      },
    );
    log(`Proyecto existente: ${existing.id}`);
    return existing.id;
  }
  const created = await api<{ id: string }>(pat, 'POST', '/management/v1/projects', { name: PROJECT_NAME, ...settings }, orgId);
  log(`Proyecto creado: ${created.id}`);
  return created.id;
}

async function ensureRoles(pat: string, orgId: string, projectId: string): Promise<void> {
  const res = await api<{ result?: Array<{ key: string }> }>(
    pat,
    'POST',
    `/management/v1/projects/${projectId}/roles/_search`,
    { query: { limit: 100 } },
    orgId,
  );
  const existing = new Set((res.result ?? []).map((r) => r.key));
  const missing = ROLES.filter((r) => !existing.has(r));
  if (missing.length === 0) {
    log('Roles ya existen');
    return;
  }
  await api(
    pat,
    'POST',
    `/management/v1/projects/${projectId}/roles/_bulk`,
    { roles: missing.map((key) => ({ key, displayName: key, group: 'pos' })) },
    orgId,
  );
  log(`Roles creados: ${missing.join(', ')}`);
}

interface AppResult {
  id: string;
  name: string;
  oidcConfig?: { clientId: string; redirectUris?: string[]; postLogoutRedirectUris?: string[] };
}

async function ensureSpaApp(pat: string, orgId: string, projectId: string): Promise<{ appId: string; clientId: string }> {
  const search = await api<{ result?: AppResult[] }>(
    pat,
    'POST',
    `/management/v1/projects/${projectId}/apps/_search`,
    { queries: [{ nameQuery: { name: SPA_APP_NAME, method: 'TEXT_QUERY_METHOD_EQUALS' } }] },
    orgId,
  );
  const existing = search.result?.[0];
  if (existing?.oidcConfig) {
    log(`App SPA existente: ${existing.id} (clientId ${existing.oidcConfig.clientId})`);
    return { appId: existing.id, clientId: existing.oidcConfig.clientId };
  }
  const created = await api<{ appId: string; clientId: string }>(
    pat,
    'POST',
    `/management/v1/projects/${projectId}/apps/oidc`,
    {
      name: SPA_APP_NAME,
      redirectUris: [`${FRONTEND_ORIGIN}/callback`],
      postLogoutRedirectUris: [FRONTEND_ORIGIN],
      responseTypes: ['OIDC_RESPONSE_TYPE_CODE'],
      grantTypes: ['OIDC_GRANT_TYPE_AUTHORIZATION_CODE', 'OIDC_GRANT_TYPE_REFRESH_TOKEN'],
      appType: 'OIDC_APP_TYPE_USER_AGENT',
      authMethodType: 'OIDC_AUTH_METHOD_TYPE_NONE',
      version: 'OIDC_VERSION_1_0',
      devMode: !IS_PROD,
      accessTokenType: 'OIDC_TOKEN_TYPE_JWT',
      accessTokenRoleAssertion: true,
      idTokenRoleAssertion: true,
      idTokenUserinfoAssertion: true,
      skipNativeAppSuccessPage: true,
    },
    orgId,
  );
  log(`App SPA creada: ${created.appId} (clientId ${created.clientId})`);
  return { appId: created.appId, clientId: created.clientId };
}

async function ensureSmtp(pat: string): Promise<void> {
  if (SMTP_MODE !== 'mailpit') {
    log('SMTP: omitido (configúralo en la consola: Instance > SMTP).');
    return;
  }
  const list = await api<{ result?: Array<{ id: string; description?: string; state?: string }> }>(
    pat,
    'POST',
    '/admin/v1/email/_search',
    { query: { limit: 50 } },
  );
  const mailpit = (list.result ?? []).find((p) => p.description === 'mailpit');
  let id = mailpit?.id;
  if (!id) {
    const created = await api<{ id: string }>(pat, 'POST', '/admin/v1/email/smtp', {
      senderAddress: rootEnv.SMTP_SENDER ?? `no-reply@${APP_DOMAIN}`,
      senderName: 'Kustodela POS',
      host: SMTP_HOST,
      tls: false,
      description: 'mailpit',
    });
    id = created.id;
    log(`SMTP Mailpit creado: ${id}`);
  } else {
    log(`SMTP Mailpit existente: ${id}`);
  }
  const active = await api<{ config?: { id?: string } }>(pat, 'GET', '/admin/v1/email').catch(() => ({ config: undefined }));
  if (active.config?.id === id) {
    log('SMTP Mailpit ya activo');
    return;
  }
  await api(pat, 'POST', `/admin/v1/email/${id}/_activate`, {});
  log('SMTP Mailpit activado');
}

/**
 * Texto del correo de invitación. El de fábrica dice "ZITADEL" y habla en abstracto; se cambia por
 * uno que nombra al producto y explica para qué es. Solo se escribe si no está ya personalizado.
 */
async function ensureInviteText(pat: string): Promise<void> {
  const idioma = 'es';
  const actual = await api<{ customText?: { text?: string; isDefault?: boolean } }>(pat, 'GET', `/admin/v1/text/message/invite_user/${idioma}`);
  if (actual.customText?.isDefault === false && actual.customText.text?.includes(PROJECT_NAME)) {
    log('Texto de invitación ya personalizado');
    return;
  }
  await api(pat, 'PUT', `/admin/v1/text/message/invite_user/${idioma}`, {
    title: `Te invitaron a ${PROJECT_NAME}`,
    preHeader: `Crea tu contraseña para entrar a ${PROJECT_NAME}`,
    subject: `Te invitaron a ${PROJECT_NAME}`,
    greeting: 'Hola {{.DisplayName}},',
    text: `Te dieron acceso a ${PROJECT_NAME}, el sistema de punto de venta de tu restaurante. Usa el botón de abajo para crear tu contraseña y entrar. Si no esperabas esta invitación, ignora este correo.`,
    buttonText: 'Crear mi contraseña',
    footerText: `${PROJECT_NAME}`,
  });
  log('Texto del correo de invitación personalizado');
}

/**
 * Política de acceso: sin registro público, y con un destino al terminar un acceso que no venía
 * de la aplicación. Ese caso ocurre al aceptar una invitación desde el correo: sin destino, Zitadel
 * deja a la persona en su propia página de perfil en vez de llevarla al POS.
 */
async function ensureLoginPolicy(pat: string): Promise<void> {
  const current = await api<{ policy: Record<string, unknown> }>(pat, 'GET', '/admin/v1/policies/login');
  const p = current.policy;
  const destino = `${FRONTEND_ORIGIN}/login`;

  // proto3 JSON omite los booleanos en false: ausente == false
  if (!p.allowRegister && p.defaultRedirectUri === destino) {
    log('Política de login ya configurada');
    return;
  }

  await api(pat, 'PUT', '/admin/v1/policies/login', {
    allowUsernamePassword: p.allowUsernamePassword ?? true,
    allowRegister: false,
    allowExternalIdp: p.allowExternalIdp ?? false,
    forceMfa: p.forceMfa ?? false,
    forceMfaLocalOnly: p.forceMfaLocalOnly ?? false,
    passwordlessType: p.passwordlessType ?? 'PASSWORDLESS_TYPE_NOT_ALLOWED',
    hidePasswordReset: p.hidePasswordReset ?? false,
    ignoreUnknownUsernames: p.ignoreUnknownUsernames ?? false,
    defaultRedirectUri: destino,
    passwordCheckLifetime: p.passwordCheckLifetime,
    externalLoginCheckLifetime: p.externalLoginCheckLifetime,
    mfaInitSkipLifetime: p.mfaInitSkipLifetime,
    secondFactorCheckLifetime: p.secondFactorCheckLifetime,
    multiFactorCheckLifetime: p.multiFactorCheckLifetime,
    allowDomainDiscovery: p.allowDomainDiscovery ?? false,
    disableLoginWithEmail: p.disableLoginWithEmail ?? false,
    disableLoginWithPhone: p.disableLoginWithPhone ?? false,
  });
  log(`Política de login: sin registro público, destino tras aceptar invitaciones ${destino}`);
}

// ---------- escritura de .env ----------
function upsertEnvFile(path: string, values: Record<string, string>): void {
  mkdirSync(dirname(path), { recursive: true });
  const lines = existsSync(path) ? readFileSync(path, 'utf8').split(/\r?\n/) : [];
  const pending = { ...values };
  const out = lines.map((line) => {
    const m = line.match(/^([A-Z0-9_]+)=/);
    if (m && m[1] in pending) {
      const v = pending[m[1]];
      delete pending[m[1]];
      return `${m[1]}=${v}`;
    }
    return line;
  });
  while (out.length && out[out.length - 1] === '') out.pop();
  for (const [k, v] of Object.entries(pending)) out.push(`${k}=${v}`);
  writeFileSync(path, out.join('\n') + '\n');
  log(`Escrito ${path}`);
}

// ---------- main ----------
async function main(): Promise<void> {
  log(`Entorno: ${ENV_NAME}. Zitadel: ${ZITADEL_URL}${ZITADEL_API_BASE === ZITADEL_URL ? '' : ` (API por ${ZITADEL_API_BASE})`}. Frontend: ${FRONTEND_ORIGIN}`);
  await waitForZitadel();
  const pat = readPat();
  const orgId = await getDefaultOrgId(pat);
  const projectId = await ensureProject(pat, orgId);
  await ensureRoles(pat, orgId, projectId);
  const spa = await ensureSpaApp(pat, orgId, projectId);
  await ensureSmtp(pat);
  await ensureInviteText(pat);
  await ensureLoginPolicy(pat);

  const envSuffix = IS_PROD ? 'production' : 'development';
  const apiOrigin = IS_PROD ? `${APP_SCHEME}://api.${APP_DOMAIN}` : 'http://localhost:5000';

  const dbValues: Record<string, string> = IS_PROD
    ? {}
    : {
        DATABASE_URL: `postgresql://pos_app:${rootEnv.POS_APP_PASSWORD}@localhost:5432/kustodela?schema=public&connection_limit=15`,
        DIRECT_URL: `postgresql://pos_migrator:${rootEnv.POS_MIGRATOR_PASSWORD}@localhost:5432/kustodela?schema=public`,
      };

  const backendEnvPath = resolve(ROOT, 'Gorditas_Calerence_Backend', `.env.${envSuffix}`);
  const existingBackendEnv = loadDotEnv(backendEnvPath);
  // Sin claves de Stripe el backend usa el proveedor de pagos falso (se cambia a 'stripe' al agregar STRIPE_*).
  const paymentProvider = existingBackendEnv.STRIPE_SECRET_KEY && existingBackendEnv.STRIPE_WEBHOOK_SECRET ? 'stripe' : 'fake';

  upsertEnvFile(backendEnvPath, {
    NODE_ENV: envSuffix,
    PORT: '5000',
    APP_TZ: 'America/Mexico_City',
    PAYMENT_PROVIDER: existingBackendEnv.PAYMENT_PROVIDER ?? paymentProvider,
    ...dbValues,
    APP_DOMAIN,
    APP_SCHEME,
    APP_PLATFORM_HOST: PLATFORM_HOST,
    ZITADEL_ISSUER: ZITADEL_URL,
    ZITADEL_JWKS_URL: `${ZITADEL_URL}/oauth/v2/keys`,
    ZITADEL_API_URL: ZITADEL_URL,
    ZITADEL_AUDIENCE: projectId,
    ZITADEL_PROJECT_ID: projectId,
    ZITADEL_DEFAULT_ORG_ID: orgId,
    ZITADEL_SPA_APP_ID: spa.appId,
    ZITADEL_PAT: pat,
    FRONTEND_BASE_URL: FRONTEND_ORIGIN,
  });

  if (!IS_PROD) {
    upsertEnvFile(resolve(ROOT, 'Gorditas_Calerence_Backend', '.env.test'), {
      NODE_ENV: 'test',
      PORT: '5001',
      APP_TZ: 'America/Mexico_City',
      DATABASE_URL: `postgresql://pos_app:${rootEnv.POS_APP_PASSWORD}@localhost:5432/kustodela_test?schema=public&connection_limit=10`,
      DIRECT_URL: `postgresql://pos_migrator:${rootEnv.POS_MIGRATOR_PASSWORD}@localhost:5432/kustodela_test?schema=public`,
      APP_DOMAIN: 'test.local',
      APP_SCHEME: 'http',
      ZITADEL_ISSUER: 'http://zitadel.test',
      ZITADEL_JWKS_URL: 'http://zitadel.test/oauth/v2/keys',
      ZITADEL_JWKS_MODE: 'local',
      ZITADEL_API_URL: 'http://zitadel.test',
      ZITADEL_AUDIENCE: 'test-project',
      ZITADEL_PROJECT_ID: 'test-project',
      ZITADEL_DEFAULT_ORG_ID: 'test-default-org',
      ZITADEL_SPA_APP_ID: 'test-app',
      ZITADEL_PAT: 'test-pat',
      IDENTITY_PROVIDER: 'fake',
      PAYMENT_PROVIDER: 'fake',
      FRONTEND_BASE_URL: 'http://app.test.local',
    });
  }

  upsertEnvFile(resolve(ROOT, 'Gorditas_frontend', 'project', `.env.${envSuffix}`), {
    VITE_APP_DOMAIN: APP_DOMAIN,
    VITE_APP_PLATFORM_HOST: PLATFORM_HOST,
    VITE_API_URL: `${apiOrigin}/api`,
    VITE_ZITADEL_AUTHORITY: ZITADEL_URL,
    VITE_ZITADEL_CLIENT_ID: spa.clientId,
    VITE_ZITADEL_PROJECT_ID: projectId,
    VITE_BRAND_NAME: 'Kustodela POS',
  });

  log('Listo.');
  if (!IS_PROD) {
    log(`Consola: ${ZITADEL_URL}/ui/console (usuario admin, contraseña ZITADEL_ADMIN_PASSWORD del .env)`);
    log('Correos: http://localhost:8025');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
