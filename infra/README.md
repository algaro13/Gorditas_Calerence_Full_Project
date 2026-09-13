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

Dos capas. La local sirve para deshacer un error; la externa, para sobrevivir a la pérdida del servidor.

| Capa | Qué hace | Dónde |
|---|---|---|
| `pg-backup` | Vuelca `kustodela` y `zitadel` cada 6 h (14 diarios, 4 semanales, 6 mensuales) | `./backups/` en el mismo disco |
| `respaldar.sh` | Instantánea cifrada con volcados, logos y secretos | Cloudflare R2, fuera del servidor |

```bash
npm run prod:backup             # volcado local manual
npm run prod:respaldo           # volcado + instantánea cifrada a R2
npm run prod:verificar-respaldo # ensayo: ¿de verdad vuelve todo?
```

**El procedimiento completo de recuperación está en [`docs/recuperacion.md`](../docs/recuperacion.md)**: qué hacer si se pierde el servidor, qué contiene el sobre de arranque, y los errores que se cometen al restaurar. Este README solo cubre la operación normal.

> Los archivos se llaman `.sql.gz` pero **no son gzip**: son volcados en el formato propio de PostgreSQL, ya comprimidos por dentro. `gunzip` falla con ellos; se leen y restauran con `pg_restore`.

### El respaldo local no basta

Vive en el mismo disco que la base, así que no protege de perder la máquina. Y solo cubre las dos bases: los logos (volumen `uploads`) y los secretos (`.env`, `.local/`, los dos `.env.production`) no están ahí. Eso es lo que añade el respaldo externo.

Configúralo copiando `infra/respaldo/.env.respaldo.example` y completándolo con las credenciales de R2, luego instala el cron:

```
0 */6 * * *  /bin/bash /home/debian/apps/kustodela/infra/respaldo/respaldar.sh >> /var/log/kustodela-respaldo.log 2>&1
```

### Fallo silencioso

Si arrancas el stack nombrando servicios, `pg-backup` se queda fuera y no se genera ningún respaldo sin que nada avise. Por eso `respaldar.sh` hace ping a un vigilante externo solo cuando termina bien: si el respaldo deja de ocurrir, llega un correo. Comprobación manual:

```bash
docker compose ps pg-backup          # debe aparecer "Up"
find backups -name '*.sql.gz' | head # debe haber archivos
```

### La masterkey

Un volcado de `zitadel` **no sirve de nada sin la `ZITADEL_MASTERKEY`**: cifra los datos de identidad, y sin ella se pierden todas las cuentas aunque la base esté intacta. Va en el gestor de contraseñas, nunca solo en el servidor. Para comprobar que lo guardado coincide, sin exponerla:

```bash
grep '^ZITADEL_MASTERKEY=' .env | cut -d= -f2- | tr -d '\n' | sha256sum | cut -c1-16
```


## 9. VPS con un proxy existente (Nginx Proxy Manager)

Cuando el servidor ya tiene otro proxy ocupando 80/443, se usa `docker-compose.behind-proxy.yaml` en lugar del compose de producción: el stack no publica ningún puerto y expone un router interno (`kustodela_router`) en la red del proxy. El TLS lo sigue terminando el proxy existente.

```
Cloudflare (proxied)  ─►  proxy del host :443  ─►  kustodela_router:80  ─►  zitadel / backend / SPA
```

Requisitos: una red de docker compartida con el proxy (`EDGE_NETWORK`, por omisión `n8n_network`) y un certificado válido en el proxy. Con registros DNS en modo *proxied* de Cloudflare basta un **Cloudflare Origin Certificate** para `*.<dominio>`, que no caduca en años y no necesita ACME.

```bash
cp .env.example .env    # APP_DOMAIN, secretos, EDGE_NETWORK, MAILPIT_PASSWORD_HASH
C="docker compose -f docker-compose.behind-proxy.yaml"
$C up -d --wait postgres zitadel-api zitadel-login router mailpit

# El bootstrap habla con Zitadel por la red interna: el alias del router conserva el Host público,
# así no hace falta que el DNS ya exista ni salir a internet.
docker run --rm --network kustodela_internal -v $PWD:/app -w /app \
  -e ZITADEL_API_BASE_URL=http://auth.$APP_DOMAIN \
  node:22-alpine sh -c "npm install --silent && npx tsx scripts/zitadel-bootstrap.ts --env production --smtp mailpit"

$C up -d --build backend
$C run --rm --build frontend-build
```

El hash de `MAILPIT_PASSWORD_HASH` se genera con `docker run --rm kustodela/caddy:latest caddy hash-password --plaintext '<contraseña>'`; en el `.env` cada `$` del hash se escribe `$$`.

En el proxy hay que crear un host que mande `*.<dominio>` a `http://kustodela_router:80` conservando el `Host` original. Con Nginx Proxy Manager se hace desde su interfaz (Proxy Host con *Custom locations* vacío y el certificado de Cloudflare cargado en *SSL Certificates*), o a mano copiando `infra/npm/kustodela.conf` al archivo `nginx/custom/http.conf` de NPM y recargando (`nginx -t && nginx -s reload`). Los hosts con nombre exacto ya configurados siguen teniendo prioridad sobre el comodín.

DNS: un único registro `A *` hacia la IP del VPS en modo *proxied* cubre `app`, `api`, `auth`, `mail` y el subdominio de cada restaurante.

Para sembrar datos de prueba y ver qué incluye el entorno, ver [docs/entorno-pruebas.md](../docs/entorno-pruebas.md).

## 10. Problemas conocidos

- **Caddy no obtiene el certificado**: revisa `docker compose logs caddy`; casi siempre es el token de Cloudflare (permiso o zona equivocada). Ensaya con `ACME_CA` de staging para no agotar la cuota.
- **`zitadel-api` no pasa el healthcheck**: primer arranque lento (hasta 60 s) o `ZITADEL_MASTERKEY` cambiada después de crear la base.
- **Backend en bucle de reinicio**: falta `Gorditas_Calerence_Backend/.env.production` (ejecuta el bootstrap) o `ZITADEL_PAT` inválido.
- **Login rechaza al usuario**: pertenece a otra organización; el subdominio decide la organización (`urn:zitadel:iam:org:id`).
