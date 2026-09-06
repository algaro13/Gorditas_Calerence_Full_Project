## 1. Infraestructura

- [x] 1.1 `infra/caddy/Dockerfile` (xcaddy + caddy-dns/cloudflare) y `infra/caddy/Caddyfile` con `{$APP_DOMAIN}`
- [x] 1.2 `docker-compose.yaml` de producción (postgres, zitadel-api, zitadel-login, backend, frontend-build, caddy, pg-backup) y eliminación de `nginx/`
- [x] 1.3 `Gorditas_frontend/Dockerfile` que construye con `.env.production` y publica `dist` en el volumen
- [x] 1.4 `.env.example` raíz con la sección de producción; `Gorditas_Calerence_Backend/.env.example`; scripts `prod:*` en `package.json`

## 2. Documentación

- [x] 2.1 `infra/README.md`: DNS, firewall, secretos, primer arranque, actualizaciones, respaldo/restauración, Stripe (webhook y rotación de claves), SMTP
- [x] 2.2 `docs/cambiar-dominio.md`
- [x] 2.3 README del backend y del repositorio actualizados al stack nuevo

## 3. Verificación

- [x] 3.1 `docker compose config` con variables de ejemplo (OK). Construcción de las imágenes `caddy`, `frontend-build` y `backend`: no verificable en la máquina de desarrollo (los contenedores no completan handshakes TLS hacia proxy.golang.org ni registry.npmjs.org: interceptación TLS local); se verifica en el VPS con `npm run prod:up`
- [x] 3.2 Caddyfile validado con `caddy validate` (imagen `caddy:2-alpine`, sin las líneas del proveedor DNS que requieren el módulo de Cloudflare)
- [x] 3.3 Suite del backend en verde (`npm test`) y build del frontend
