## Context

Cuarta fase. El backend expone: `GET /api/tenants/by-slug/:slug` (público), `GET /api/tenants/me`, `PUT /api/tenants/me/config`, `POST /api/tenants/me/logo`, `POST /api/onboarding/{upload-image,complete}`, `/api/usuarios`, `/api/billing/*`. Zitadel local en `http://localhost:8080` con la app SPA de desarrollo (`http://localhost:5173/callback`).

## Goals / Non-Goals

**Goals**
- Un solo camino de autenticación (Zitadel), sin tokens en `localStorage` manejados a mano.
- Cero cambios funcionales en las pantallas operativas (órdenes, cocina, cobro, reportes).
- El dominio no aparece en el código: `VITE_APP_DOMAIN`.

**Non-Goals**
- Reestructurar todas las páginas por features (se hará al tocarlas).
- Cambiar el diseño visual.

## Decisions

- **Librería**: `react-oidc-context` sobre `oidc-client-ts` (PKCE, renovación silenciosa con refresh token, `WebStorageStateStore` en `localStorage`). El `AuthProvider` de la librería envuelve a nuestro `AuthProvider`.
- **Selección de organización**: `login()` obtiene el slug del host (`^([a-z0-9-]+)\.${VITE_APP_DOMAIN}$`, excluyendo `www, app, api, auth, admin, mail, docs, status, blog`) o de `localStorage.devTenantSlug`; llama `by-slug`; guarda `orgId` en `sessionStorage`; `signinRedirect({ scope: baseScope + ' urn:zitadel:iam:org:id:' + orgId })`. Sin slug, la página de login muestra el enlace al registro y, en local, un campo para fijar `devTenantSlug`.
- **Roles**: se decodifica el payload del access token (`urn:zitadel:iam:org:project:<PROJECT_ID>:roles`, filtrado por `urn:zitadel:iam:user:resourceowner:id`). `AuthUser.roles` es la lista; `nombreTipoUsuario` = rol principal por precedencia Admin > Encargado > Mesero > Despachador > Cocinero. `hasPermission` acepta si cualquier rol coincide.
- **Token para el API**: `apiService.setTokenProvider(() => oidc.user?.access_token)`; en 401 el cliente llama `onUnauthorized` que dispara `signinRedirect`.
- **Contexto**: `AuthContext` expone `user`, `tenant`, `loading`, `tenantMissing`, `login`, `logout`, `refreshTenant`, `hasPermission`, `getDefaultRoute`. Nadie más lee `localStorage` para datos del tenant.
- **Callback**: `/callback` renderiza un spinner mientras `oidc.isLoading`; con sesión, navega a la ruta por defecto del rol; con error muestra el mensaje y un botón para reintentar.
- **Sin tenant**: `GET /tenants/me` 404 `NO_TENANT` → página "Este acceso no tiene restaurante" con enlace al registro y cierre de sesión (ya no existe `NeedOnboarding`).
- **Onboarding**: público; paso 0 con validación de contraseña según la política de Zitadel (8+, mayúscula, minúscula, número y símbolo; coincidencia); al completar muestra el correo de verificación y un botón "Ir a mi restaurante" hacia `data.url` (en local fija `devTenantSlug` y lleva a `/login`).
- **Usuarios**: `UsuariosPanel` reemplaza el modelo `usuario` del CRUD genérico dentro de la página Catálogos; reglas de rol visibles (Encargado solo roles operativos) y errores del API mostrados tal cual.
- **Assets**: `assetUrl(path)` = base del API sin `/api` + path.
- **Build**: `Dockerfile` de dos etapas que produce `dist`; Caddy lo sirve en producción. `.env.production` lo escribe el bootstrap con `--env production`.

## Risks / Trade-offs

- `react-oidc-context` guarda el usuario en `localStorage` (`oidc.user:*`); es lo estándar para SPA con PKCE y refresh tokens de rotación.
- La renovación silenciosa depende de `offline_access` y del refresh token habilitado en la app de Zitadel (el bootstrap lo activa).

## Migration Plan

Instalar dependencias, sustituir archivos, `npm run build`, probar en local con el restaurante `demo` (login v2 de Zitadel, verificación de correo desde Mailpit).

## Open Questions

Ninguna.
