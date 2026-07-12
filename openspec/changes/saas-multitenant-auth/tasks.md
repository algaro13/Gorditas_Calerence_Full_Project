## 1. Configuración de Microsoft Entra

- [x] 1.1 Registrar una aplicación SPA en Microsoft Entra External ID (tenant `calerence.onmicrosoft.com`) con redirect URIs: `http://localhost:5173`, `https://pos.kustodela.com`, `https://pos-*.kustodela.com`
- [x] 1.2 Configurar User Flow en Entra: Sign-up + Sign-in + Password Reset
- [x] 1.3 Obtener Client ID y Authority URL y agregarlos a la configuración del proyecto
- [x] 1.4 Agregar configuración de Entra al `appsettings.json` del backend (tenantId, clientId, authority, audience)

## 2. Frontend — Integrar MSAL React

- [x] 2.1 Instalar `@azure/msal-browser` y `@azure/msal-react`
- [x] 2.2 Crear `src/config/msal-config.ts` con la configuración de MSAL (clientId, authority, redirectUri)
- [x] 2.3 Envolver la app con `<MsalProvider>` en `main.tsx`
- [x] 2.4 Reemplazar `AuthContext.tsx` para usar MSAL: login redirect, logout, obtener token silenciosamente
- [x] 2.5 Crear hook `useToken()` que obtiene el access token de MSAL para enviar al backend
- [x] 2.6 Actualizar `api-client.ts` para usar el token de MSAL en lugar de localStorage

## 3. Backend — Validar tokens de Entra

- [x] 3.1 Instalar `jwks-rsa` y `jsonwebtoken` (ya existe) para validación de tokens de Entra
- [x] 3.2 Crear `src/middleware/entra-auth.ts` que valide el token JWT de Microsoft usando JWKS endpoint
- [x] 3.3 Extraer `oid` (Object ID de Entra) y `email` del token decodificado y adjuntarlo al request
- [x] 3.4 Reemplazar el middleware `authenticate` actual por `entra-auth` en todas las rutas
- [x] 3.5 Cachear las JWKS keys para evitar llamadas de red por cada request

## 4. Master Database y modelo de tenants

- [x] 4.1 Crear schemas Mongoose para Master DB: `Tenant` (slug, nombre, dbName, plan, activo, config), `TenantUser` (entraOid, tenantId, email, nombre, role)
- [x] 4.2 Crear `src/config/master-db.ts` que conecta a `kustodela_master` independientemente de la conexión por tenant
- [x] 4.3 Crear `src/repositories/tenant.repository.ts` con métodos: findBySlug, create, findUserByOid, createUser
- [x] 4.4 Crear `src/services/tenant.service.ts` con lógica: resolverTenant, provisionarTenant, vincularUsuario

## 5. Middleware multi-tenant

- [x] 5.1 Crear `src/middleware/tenant-resolver.ts` que extrae el slug del header `Origin` o `X-Tenant-Slug`
- [x] 5.2 Implementar cache en memoria (Map con TTL de 5 min) para resolución slug → tenant
- [x] 5.3 Crear `src/config/tenant-connection.ts` que gestiona conexiones Mongoose dinámicas por tenant
- [x] 5.4 Integrar el middleware en el pipeline: `entra-auth` → `tenant-resolver` → controller
- [x] 5.5 Adaptar el composition-root para que use la conexión del tenant activo en lugar de la conexión fija

## 6. API de registro de tenants

- [x] 6.1 Crear endpoint `POST /api/tenants/register` (nombre, slug) — valida slug único, crea tenant y DB
- [x] 6.2 Crear función `provisionDatabase(dbName)` que crea la DB con todos los indexes y colecciones base
- [x] 6.3 Crear endpoint `GET /api/tenants/check-slug/:slug` — verifica disponibilidad del slug
- [x] 6.4 Crear endpoint `GET /api/tenants/me` — retorna info del tenant del usuario autenticado

## 7. Migración del tenant existente

- [x] 7.1 Crear script de migración que registra `mi_tienda_gorditas` como tenant `gorditas-calerence` en la master DB
- [x] 7.2 Crear script que vincula los usuarios existentes (por email) a sus cuentas de Entra una vez que hagan login

## 8. Configuración Nginx

- [x] 8.1 Crear config Nginx para `posapi.kustodela.com` → proxy al backend en puerto 5000
- [x] 8.2 Crear config Nginx para `pos-*.kustodela.com` → sirve el build estático de React (SPA fallback)
- [x] 8.3 Crear config Nginx para `pos.kustodela.com` → landing page / registro
- [x] 8.4 Documentar la configuración de Cloudflare (wildcard DNS `*.kustodela.com` → IP del VPS)

## 9. Verificación

- [x] 9.1 Verificar login con Microsoft Entra en localhost (frontend obtiene token, backend lo valida)
- [x] 9.2 Verificar resolución de tenant por subdominio (simular con header X-Tenant-Slug en desarrollo)
- [x] 9.3 Verificar registro de nuevo tenant (crear slug, provisionar DB, acceder)
- [x] 9.4 Verificar que el tenant "gorditas-calerence" sigue funcionando con sus datos migrados
- [x] 9.5 Verificar que el proyecto compila sin errores
