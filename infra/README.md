# Despliegue en producción (VPS)

Stack: PostgreSQL 17, Zitadel (API + Login v2), backend Express, SPA estática, Caddy con certificado wildcard y respaldos diarios. Todo se orquesta con `docker-compose.yaml` en la raíz del repositorio. Solo Caddy publica puertos.

```
<slug>.<APP_DOMAIN>  ──►  Caddy (TLS wildcard, DNS-01 Cloudflare)  ──►  SPA estática (volumen pos_dist)
app.<APP_DOMAIN>     ──►  Caddy                                    ──►  SPA estática (landing y registro)
api.<APP_DOMAIN>     ──►  Caddy                                    ──►  backend:5000  ──►  postgres (db kustodela, RLS)
auth.<APP_DOMAIN>    ──►  Caddy                                    ──►  zitadel-login:3000 (/ui/v2/login) y zitadel-api:8080 (h2c)  ──►  postgres (db zitadel)
```

## 1. Requisitos

- VPS Linux con Docker Engine 27+ y el plugin `docker compose`; 2 vCPU / 4 GB RAM mínimo.
- Node 22 en el VPS (solo para `npm run prod:bootstrap`, que usa `tsx`).
- Dominio en Cloudflare. El dominio se conserva en una sola variable (`APP_DOMAIN`); ver [docs/cambiar-dominio.md](../docs/cambiar-dominio.md).

## 2. DNS en Cloudflare

Todos los registros en modo **DNS only** (nube gris). El proxy naranja rompe el gRPC/h2c de Zitadel y la emisión del certificado la hace Caddy, no Cloudflare.

| Tipo | Nombre | Contenido | Uso |
|------|--------|-----------|-----|
| A | `auth` | IP del VPS | Zitadel |
| A | `api` | IP del VPS | backend |
| A | `app` | IP del VPS | landing y registro |
| A | `*` | IP del VPS | un subdominio por restaurante |
| A | `@` | IP del VPS | redirige a `app` |
| CNAME | `www` | `app.<APP_DOMAIN>` | redirige a `app` |

Token de API: *My Profile → API Tokens → Create Token → Edit zone DNS*, con permisos `Zone:DNS:Edit` y `Zone:Zone:Read` limitados a la zona de `APP_DOMAIN`. Es lo único que Caddy necesita para el reto DNS-01 del wildcard.

Registros antiguos a retirar en el corte: `pos`, `posapi`, `appback`, `calerence`, `calerenceapi` y el `app` anterior.

## 3. Firewall

Solo `22/tcp` (idealmente restringido a tu IP), `80/tcp`, `443/tcp` y `443/udp` (HTTP/3). PostgreSQL y Zitadel no publican puertos.

```bash
ufw default deny incoming && ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443 && ufw enable
```

## 4. Secretos (`.env` en la raíz del VPS)

```bash
git clone <repo> /opt/kustodela && cd /opt/kustodela
cp .env.example .env && chmod 600 .env
```

Rellena con valores nuevos (nunca reutilices los de desarrollo ni los del repositorio antiguo):

| Variable | Cómo generarla |
|----------|----------------|
| `APP_DOMAIN`, `APP_SCHEME=https` | tu dominio |
| `POSTGRES_ADMIN_PASSWORD`, `POS_MIGRATOR_PASSWORD`, `POS_APP_PASSWORD`, `ZITADEL_DB_PASSWORD` | `openssl rand -base64 24` |
| `ZITADEL_MASTERKEY` | `openssl rand -hex 16` (32 caracteres). **Guárdala también fuera del VPS**: sin ella la base de Zitadel no se puede leer |
| `ZITADEL_ADMIN_PASSWORD`, `ZITADEL_ADMIN_EMAIL` | contraseña inicial del admin (se obliga a cambiarla al primer acceso) |
| `ACME_EMAIL` | correo para avisos de Let's Encrypt |
| `CLOUDFLARE_API_TOKEN` | token de la sección 2 |

Variables opcionales: `ACME_CA` (staging de Let's Encrypt para ensayar), `BACKEND_LOG_LEVEL`, `BACKUP_SCHEDULE`, `BACKUP_KEEP_DAYS`.

## 5. Primer arranque

```bash
npm ci                       # tsx para el bootstrap
npm run prod:up              # postgres, zitadel, caddy, backup, backend (el backend reinicia hasta tener .env.production)
curl -sI https://auth.$APP_DOMAIN/.well-known/openid-configuration | head -1   # 200 con certificado de Let's Encrypt
npm run prod:bootstrap       # proyecto "Kustodela POS", roles, app SPA, deshabilita auto-registro; escribe los .env.production
npm run prod:up              # backend con los ids y construcción del frontend
```

`prod:bootstrap` lee el PAT del usuario máquina desde `./.local/zitadel-bootstrap/backend.pat` (lo escribe Zitadel en su primer arranque). Si ejecutas el bootstrap desde otra máquina, exporta `ZITADEL_PAT` con ese contenido.

Pasos manuales en la consola (`https://auth.<APP_DOMAIN>/ui/console`, usuario `admin`):

1. Cambiar la contraseña inicial (obligatorio en el primer acceso).
2. *Default settings → SMTP*: configurar el proveedor real (remitente `no-reply@<APP_DOMAIN>`). Sin SMTP no salen los correos de verificación ni las invitaciones.
3. Opcional: *Branding* con el logo de Kustodela.

Stripe (`Gorditas_Calerence_Backend/.env.production`): agrega `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASICO`, `STRIPE_PRICE_PROFESIONAL`, `STRIPE_PRICE_EMPRESARIAL` y `PAYMENT_PROVIDER=stripe`; registra el webhook `https://api.<APP_DOMAIN>/api/billing/webhook` con los eventos `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`; luego `docker compose up -d backend`.

> **Rotación obligatoria**: las claves de Stripe del repositorio anterior estuvieron versionadas en `.env`. Revócalas en el dashboard de Stripe (*Developers → API keys → Roll key*) y crea claves y webhook nuevos antes del corte.

## 6. Verificación

```bash
curl -sI https://api.$APP_DOMAIN/health | head -1          # 200
curl -sI https://app.$APP_DOMAIN/ | head -1                # 200
curl -sI https://cualquiera.$APP_DOMAIN/ | head -1         # 200 (SPA)
curl -s  https://api.$APP_DOMAIN/api/tenants/check-slug/demo
```

Flujo completo: registrar un restaurante en `https://app.<APP_DOMAIN>/onboarding`, verificar el correo, entrar en `https://<slug>.<APP_DOMAIN>/login`, invitar un mesero desde Catálogos → Usuarios y comprobar que su token no ve datos de otro restaurante.

## 7. Actualizaciones

```bash
git pull
npm run prod:up            # reconstruye backend, caddy y frontend; el backend aplica migraciones al arrancar
```

Solo frontend: `npm run prod:build-frontend`. Solo backend: `docker compose up -d --build backend`.

## 8. Respaldos y restauración

`pg-backup` guarda diariamente `kustodela` y `zitadel` en `./backups/` (formato custom, 14 diarios, 4 semanales, 6 mensuales). Copia esa carpeta y la `ZITADEL_MASTERKEY` fuera del VPS (rclone, S3, etc.). Respaldo manual: `npm run prod:backup`.

Restauración (en un VPS limpio con el mismo `.env`):

```bash
docker compose up -d postgres
docker compose cp backups/daily/kustodela-<fecha>.sql.gz postgres:/tmp/k.dump
docker compose cp backups/daily/zitadel-<fecha>.sql.gz postgres:/tmp/z.dump
docker compose exec postgres sh -c 'gunzip -c /tmp/k.dump | pg_restore -U postgres -d kustodela --clean --if-exists --no-owner'
docker compose exec postgres sh -c 'gunzip -c /tmp/z.dump  | pg_restore -U postgres -d zitadel   --clean --if-exists --no-owner'
docker compose exec postgres psql -U postgres -d kustodela -c 'REASSIGN OWNED BY postgres TO pos_migrator'
docker compose up -d
```

Los logos viven en el volumen `uploads`; respáldalo con `docker run --rm -v kustodela_uploads:/u -v $PWD/backups:/b alpine tar czf /b/uploads.tgz -C /u .`.

## 9. Problemas conocidos

- **Caddy no obtiene el certificado**: revisa `docker compose logs caddy`; casi siempre es el token de Cloudflare (permiso o zona equivocada). Ensaya con `ACME_CA` de staging para no agotar la cuota.
- **`zitadel-api` no pasa el healthcheck**: primer arranque lento (hasta 60 s) o `ZITADEL_MASTERKEY` cambiada después de crear la base.
- **Backend en bucle de reinicio**: falta `Gorditas_Calerence_Backend/.env.production` (ejecuta el bootstrap) o `ZITADEL_PAT` inválido.
- **Login rechaza al usuario**: pertenece a otra organización; el subdominio decide la organización (`urn:zitadel:iam:org:id`).
