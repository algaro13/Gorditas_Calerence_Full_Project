## Why

El respaldo actual es el contenedor `pg-backup`, que vuelca `kustodela` y `zitadel` a `./backups/` **en el mismo disco que la base de datos**. Si se pierde el VPS se pierde también el respaldo, así que hoy el sistema no está protegido contra el único fallo que importa.

Al inventariar qué haría falta para reconstruir el sistema en una máquina limpia aparecieron tres huecos más graves que el de la ubicación:

1. **Estado único sin respaldar.** El volumen `uploads` (logos de los restaurantes) no lo respalda nada automático; solo hay un comando manual en `infra/README.md`. Como la base persiste rutas `/uploads/<tenantId>/logo.<ext>` (`LocalFileStorage.ts:33`), restaurar solo la base deja los logos rotos.
2. **Secretos sin respaldar.** `./.env`, `./.local/zitadel-bootstrap/backend.pat`, `./.local/zitadel-bootstrap/login-client.pat`, `./.local/mailpit-relay.yaml` y `Gorditas_Calerence_Backend/.env.production` están en `.gitignore` y existen solo en el disco del VPS. Sin ellos el volcado de `zitadel` es ilegible y el backend no arranca.
3. **Fallo silencioso.** `infra/README.md` ya advierte que si el stack se levanta nombrando servicios, `pg-backup` queda fuera y no se genera ningún respaldo **sin que nada avise**. Un respaldo que falla en silencio es peor que no tenerlo, porque da confianza falsa.

## What Changes

- Respaldo cifrado fuera del servidor con **restic** hacia **Cloudflare R2**, que incluye los volcados de ambas bases, el volumen `uploads`, los cinco archivos de secretos y un manifiesto con la versión desplegada.
- **Sobre de arranque**: el conjunto mínimo de secretos que por definición no puede ir dentro del respaldo (contraseña de restic, credenciales de R2, `ZITADEL_MASTERKEY`, URL del repositorio), documentado como una entrada única del gestor de contraseñas.
- **Vigilante de fallo silencioso**: ping a un *dead man's switch* al terminar cada corrida; si el respaldo deja de ocurrir, llega un aviso sin que nadie tenga que revisarlo.
- El respaldo externo corre cada 6 horas y dispara su propio volcado en cada pasada, así que la pérdida máxima pasa de un día de órdenes a seis horas sin tocar el horario de `pg-backup`, que sigue alimentando el histórico local a diario.
- Guion de restauración para máquina limpia y guion de verificación periódica, más `docs/recuperacion.md` escrito para leerse bajo presión.
- Ensayo completo de recuperación en un VPS desechable, que fija el tiempo real de recuperación en vez de estimarlo.

## Capabilities

### Modified Capabilities
- `production-deployment`: el requisito «Backups and restore procedure» se amplía de «respaldar dos bases a disco local y documentar la restauración» a «respaldar todo el estado necesario fuera del servidor, cifrado, con aviso de fallo y procedimiento de recuperación probado».

## Impact

- **Infra**: `infra/respaldo/respaldar.sh`, `infra/respaldo/restaurar.sh`, `infra/respaldo/verificar.sh`, `infra/respaldo/.env.respaldo.example`; cron del host en el VPS.
- **Documentación**: `docs/recuperacion.md` nuevo; `infra/README.md` §8 reescrito.
- **Configuración**: `.env.example` documenta `BACKUP_SCHEDULE` y las variables de la variante behind-proxy que hoy no documenta (`EDGE_NETWORK`, `MAILPIT_USER`, `MAILPIT_PASSWORD_HASH`, `MAILPIT_RELAY_CONFIG`, `MAILPIT_RELAY_ALL`, `ROUTER_NAME`).
- **Scripts**: `prod:respaldo` y `prod:verificar-respaldo` en el `package.json` raíz.
- **Sin cambios de código de aplicación**: no se toca el backend, el frontend ni el esquema.
- **Fuera del repositorio**: bucket y token de R2, vigilante en healthchecks.io, entrada del gestor de contraseñas, y subir la rama de trabajo a `origin` (hoy no tiene upstream, así que el manifiesto apuntaría a un commit inexistente).
