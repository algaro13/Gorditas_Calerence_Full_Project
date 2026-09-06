## Why

El backend ya autentica con Zitadel, resuelve el tenant por organización y expone onboarding público, usuarios y billing nuevos. El SPA sigue usando MSAL/Entra, guarda el ID token en `localStorage`, reintenta cambios de estatus como `admin`, administra usuarios con contraseña y construye URLs con `localhost:5000` fijo. Esta fase alinea el frontend con el backend nuevo.

## What Changes

- **Autenticación**: se reemplaza MSAL por `oidc-client-ts` + `react-oidc-context` (PKCE). El login resuelve el restaurante desde el subdominio (`<slug>.<APP_DOMAIN>`) o de `localStorage.devTenantSlug` en local, consulta `GET /api/tenants/by-slug/:slug` y redirige a Zitadel con el scope `urn:zitadel:iam:org:id:<orgId>`. Los roles salen de los claims del access token filtrados por organización; el rol principal se conserva como `nombreTipoUsuario` para las pantallas existentes.
- **Cliente HTTP único** (`services/api.ts`): access token del contexto, sin login/logout propios, sin reintento con rol admin, `assetUrl()` para archivos, y métodos nuevos para tenants, onboarding, usuarios y billing. Se eliminan `api-client.ts`, `mockApi.ts`, `useToken.ts` y `msal-config.ts`.
- **Contexto de tenant**: `AuthContext` expone `tenant` (nombre, config, plan, trial); `Header`, `Dashboard` (banner de suscripción) y `Configuración` lo leen del contexto en vez de `localStorage`.
- **Onboarding**: paso inicial "Tu cuenta" (nombre, apellido, correo, contraseña) y pantalla final que lleva al subdominio del restaurante (o instrucciones de `devTenantSlug` en local). Vista previa de la dirección con `VITE_APP_DOMAIN`.
- **Usuarios**: panel dedicado en Catálogos sobre `/api/usuarios` (invitar, cambiar rol, activar/desactivar, eliminar, reenviar invitación), sin campo de contraseña.
- **Configuración**: logo por `POST /api/tenants/me/logo`; paleta por `PUT /api/tenants/me/config`; refresco del contexto sin recargar la página.
- **Planes**: `POST /api/billing/create-checkout` vía el cliente único; página de éxito sin cambios.
- **Ruta `/callback`** para el retorno de Zitadel y página "sin restaurante" cuando la organización no tiene tenant.
- Dockerfile del frontend solo construye (`dist` para Caddy); `.env.example`; título de la app.

## Capabilities

### New Capabilities
- `spa-authentication`: login por subdominio con Zitadel, sesión con refresh silencioso, roles por organización y logout.
- `spa-onboarding`: wizard público con cuenta del administrador y redirección al restaurante.
- `spa-staff-management`: administración del personal desde la interfaz sin contraseñas.

### Modified Capabilities
- `tenant-branding`: la interfaz consume logo y paleta desde el contexto del tenant.

## Impact

- **Frontend**: `src/config/{auth-config,tenant-host,app-config}.ts`, `src/utils/claims.ts`, `src/services/api.ts`, `src/context/AuthContext.tsx`, `src/main.tsx`, `src/App.tsx`, `src/pages/{Login,Onboarding,Plans,Configuracion,Callback,SinRestaurante}.tsx`, `src/components/UsuariosPanel.tsx`, `src/components/Layout/Header.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Catalogos.tsx`, `src/types/index.ts`, `Dockerfile`, `index.html`.
- **Dependencias**: `oidc-client-ts`, `react-oidc-context`; se eliminan `@azure/msal-browser`, `@azure/msal-react`.
- **Backend**: sin cambios.
