# Kustodela POS

Punto de venta multi-tenant para restaurantes: cada negocio vive en `https://<slug>.<dominio>`, con su organización en Zitadel, sus datos aislados por Row Level Security en una sola base PostgreSQL y su suscripción en Stripe.

| Carpeta | Contenido |
|---------|-----------|
| `Gorditas_Calerence_Backend/` | API Express + TypeScript, Prisma, arquitectura limpia por módulos ([README](Gorditas_Calerence_Backend/README.md)) |
| `Gorditas_frontend/project/` | SPA React + Vite (autenticación OIDC con Zitadel) |
| `infra/` | Caddy (TLS wildcard), init de PostgreSQL, [guía de despliegue](infra/README.md) |
| `scripts/` | `zitadel-bootstrap.ts` (configura Zitadel y escribe los `.env`), `dev-seed.ts` |
| `docs/` | [Entorno local](docs/local-testing.md), [entorno de pruebas en el VPS](docs/entorno-pruebas.md), [cambiar de dominio](docs/cambiar-dominio.md) |
| `openspec/` | Especificaciones y changes (OpenSpec) |

## Desarrollo local

```bash
cp .env.example .env
npm ci
npm run dev:up        # PostgreSQL, Zitadel, Mailpit, bootstrap y migraciones
npm run dev:seed      # restaurante demo (demo@kustodela.local / Demo1234!)
npm run dev:backend   # http://localhost:5000
npm run dev:frontend  # http://localhost:5173  (en /login elige el restaurante "demo")
npm test              # unit + integración + e2e del backend
```

## Producción

`npm run prod:up` → `npm run prod:bootstrap` → `npm run prod:up`. Detalles, DNS, secretos y respaldos en [infra/README.md](infra/README.md).
