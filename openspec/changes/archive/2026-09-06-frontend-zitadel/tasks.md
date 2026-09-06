## 1. Base

- [x] 1.1 Dependencias: agregar `oidc-client-ts`, `react-oidc-context`; quitar `@azure/msal-*`; `vite-env.d.ts` con las variables `VITE_*`; `index.html` con título "Kustodela POS"
- [x] 1.2 `config/app-config.ts` (API y assets desde `VITE_API_URL`), `config/auth-config.ts` (authority, client id, scopes, PKCE, renovación), `config/tenant-host.ts` (slug del host, `devTenantSlug`, URLs del tenant)
- [x] 1.3 `utils/claims.ts` (decodificar JWT, roles por organización, rol principal) y `types/index.ts` (`AuthUser.roles`, `TenantInfo`)

## 2. Cliente y contexto

- [x] 2.1 `services/api.ts` unificado: proveedor de token, `onUnauthorized`, `assetUrl`, métodos de tenants/onboarding/usuarios/billing; sin login/logout ni reintento con rol admin; borrar `api-client.ts`, `mockApi.ts`, `hooks/useToken.ts`, `config/msal-config.ts`
- [x] 2.2 `context/AuthContext.tsx` sobre `react-oidc-context`: user con roles, tenant, `tenantMissing`, `login` con scope de organización, `logout`, `refreshTenant`
- [x] 2.3 `main.tsx` con el `AuthProvider` de OIDC; `App.tsx` con `/callback`, página "sin restaurante" y sin `NeedOnboarding`

## 3. Pantallas

- [x] 3.1 `Login.tsx` (nombre y logo del restaurante, botón único, enlace a registro, campo `devTenantSlug` en local), `Callback.tsx`, `SinRestaurante.tsx`
- [x] 3.2 `Onboarding.tsx` con paso de cuenta, vista previa con `VITE_APP_DOMAIN`, pantalla final
- [x] 3.3 `Header.tsx`, `Dashboard.tsx` (banner) y `Configuracion.tsx` desde el contexto; logo vía `POST /tenants/me/logo`
- [x] 3.4 `Plans.tsx` vía `apiService.createCheckout`
- [x] 3.5 `components/UsuariosPanel.tsx` y su integración en `Catalogos.tsx` (modelo `usuario`)

## 4. Build y verificación

- [x] 4.1 `Dockerfile` de dos etapas que produce `dist`; `.env.example`; `npm run build` y `npm run lint` en verde
- [x] 4.2 Prueba en navegador contra el backend y Zitadel locales con el restaurante `demo`: login v2, verificación de correo desde Mailpit, dashboard, catálogos, invitar usuario, configuración de logo/paleta, planes (checkout falso), logout
