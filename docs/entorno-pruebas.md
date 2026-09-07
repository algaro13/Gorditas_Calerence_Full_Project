# Entorno de pruebas en el VPS

Instancia completa de Kustodela POS pensada para probar sin límites: se puede romper, vaciar y volver a sembrar en minutos. Corre en el VPS junto al resto de servicios, detrás del Nginx Proxy Manager que ya estaba instalado, y **no toca** el POS anterior (`calerence.kustodela.com`), que sigue funcionando igual.

## Direcciones

| Dirección | Qué es |
|-----------|--------|
| `https://<APP_PLATFORM_HOST>.<APP_DOMAIN>` | Registro de restaurantes nuevos (`/onboarding`) y landing. En el VPS actual es `pos.kustodela.com`, porque `app` ya lo usa otro sitio |
| `https://<slug>.<APP_DOMAIN>` | El POS de cada restaurante (`/login` para entrar) |
| `https://api.<APP_DOMAIN>` | API |
| `https://auth.<APP_DOMAIN>` | Zitadel: pantalla de inicio de sesión y consola de administración (`/ui/console`) |
| `https://mail.<APP_DOMAIN>` | Mailpit: guarda copia de **todos** los correos que envía el sistema. Protegido con usuario y contraseña |

## Restaurantes sembrados

`scripts/seed-staging.ts` crea tres restaurantes. Todas las cuentas usan la misma contraseña (`SEED_PASSWORD`, por omisión `Kustodela1234!`).

| Restaurante | Slug | Estado | Para qué sirve |
|-------------|------|--------|----------------|
| Gorditas Demo | `demo` | Prueba gratuita vigente | Restaurante principal, con un usuario por cada rol |
| Taquería Lupita | `taqueria-lupita` | Plan profesional activo | Comprobar el aislamiento entre negocios y el límite de 10 usuarios |
| Fonda Prueba Vencida | `prueba-vencida` | Prueba gratuita vencida | Ver el bloqueo por suscripción (403 `TRIAL_EXPIRED`) |

Cuentas: `admin@<slug>.<APP_DOMAIN>` en los tres, y en `demo` además `encargado@`, `mesero@`, `despachador@` y `cocinero@` del mismo dominio. Cada restaurante nace con 5 platillos, 7 guisos y sus mesas.

El script siembra los usuarios directamente en Zitadel; con `SEED_SQL_OUT=<archivo>` genera además el SQL que los da de alta en el espejo local (`tenant_users`), para que salgan en la pantalla de personal sin esperar a que entren por primera vez:

```bash
docker run --rm --network kustodela_internal -v $PWD:/app -w /app   -e SEED_SQL_OUT=/app/.local/seed-mirror.sql node:22-alpine npx tsx scripts/seed-staging.ts
docker compose -f docker-compose.behind-proxy.yaml exec -T postgres   psql -U postgres -d kustodela -f - < .local/seed-mirror.sql
```

## Qué se puede probar

- **Registro público**: desde `<APP_PLATFORM_HOST>.<APP_DOMAIN>/onboarding`, con un correo cualquiera. El correo de verificación llega a Mailpit.
- **Aislamiento**: entrar como `admin@demo` y como `admin@taqueria-lupita` en dos navegadores; ninguno ve datos del otro. Un usuario de un restaurante no puede iniciar sesión en el subdominio de otro (Zitadel lo rechaza).
- **Roles**: cada rol entra a su pantalla por omisión y solo ve su menú (Mesero a Nueva Orden, Despachador y Cocinero a Surtir Orden, Admin y Encargado al panel).
- **Personal**: en Catálogos → Usuarios se invita gente; el correo de invitación aparece en Mailpit. El límite del plan devuelve un error visible.
- **Planes**: `prueba-vencida` responde 403 al operar. El cobro usa un proveedor falso (sin claves de Stripe), así que "Elegir plan" avisa que el plan no está configurado.
- **Marca**: subir logo y cambiar paleta en Configuración cambia el aspecto solo de ese restaurante.

## Operación

Desde `/home/debian/apps/kustodela` en el VPS (`C` es el compose de esta variante):

```bash
C="docker compose -f docker-compose.behind-proxy.yaml"
$C ps                          # estado
$C logs -f backend             # logs
$C up -d --build backend       # actualizar el API tras un git pull
$C run --rm --build frontend-build   # reconstruir el SPA
```

Volver a sembrar (idempotente, no borra nada):

```bash
docker run --rm --network kustodela_internal -v /home/debian/apps/kustodela:/app -w /app \
  node:22-alpine npx tsx scripts/seed-staging.ts
```

Vaciar y empezar de cero (borra restaurantes, usuarios y la instancia de Zitadel):

```bash
$C down -v && rm -rf .local/zitadel-bootstrap/*
$C up -d --wait postgres zitadel-api zitadel-login router mailpit
docker run --rm --network kustodela_internal -v $PWD:/app -w /app \
  -e ZITADEL_API_BASE_URL=http://auth.$APP_DOMAIN \
  node:22-alpine npx tsx scripts/zitadel-bootstrap.ts --env production --smtp mailpit
$C up -d backend && $C run --rm frontend-build
```

## Dónde vive

En el VPS, `/home/debian/apps/kustodela`. Los secretos generados (contraseñas de PostgreSQL, masterkey de Zitadel, administrador de Zitadel y contraseña de Mailpit) están en el `.env` de esa carpeta, que no se versiona. La `ZITADEL_MASTERKEY` conviene respaldarla aparte: sin ella la base de Zitadel es ilegible.

## Correo

Zitadel siempre envía a Mailpit, que guarda copia de cada mensaje y lo retransmite a un proveedor real. Así se conserva la bandeja completa para revisar plantillas y enlaces, y a la vez llegan los correos a las personas de verdad.

- La configuración del reenvío vive en `.local/mailpit-relay.yaml` del despliegue, fuera de git porque lleva la clave del proveedor. Se activa con `MAILPIT_RELAY_CONFIG` y `MAILPIT_RELAY_ALL` en el `.env`.
- `blocked-recipients` deja capturados los correos de los restaurantes de prueba, cuyas direcciones terminan en `@<slug>.<APP_DOMAIN>`. Nunca salen a internet.
- Mientras el dominio no esté verificado en el proveedor, `override-from` reescribe el remitente por uno del propio proveedor. Al verificarlo se borra esa línea y los correos salen desde `no-reply@<APP_DOMAIN>`.
- Sin `MAILPIT_RELAY_CONFIG`, Mailpit vuelve a ser solo una trampa: captura todo y no entrega nada.

## Diferencias con producción

- Los correos de los restaurantes de prueba se quedan en Mailpit y no salen a internet.
- El proveedor de cobros es falso: no hay cargos reales ni webhooks de Stripe.
- La contraseña del administrador de Zitadel no obliga a cambiarse al primer acceso.
- Las cuentas sembradas tienen contraseñas conocidas y correos sin verificar.

Para convertirlo en producción: borrar los restaurantes de prueba, poner claves reales de Stripe con su webhook, configurar el SMTP real en la consola de Zitadel y activar el cambio de contraseña del administrador.
