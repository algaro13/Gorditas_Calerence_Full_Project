# Diseño: respaldo externo y recuperación

## La dependencia circular

Es la decisión que ordena todo lo demás. Si el respaldo va cifrado, la llave no puede estar
dentro del respaldo; y si va sin cifrar, los hashes de credenciales de todos los restaurantes
quedan legibles para quien tenga acceso al bucket. Se elige cifrar y aceptar que un puñado de
secretos viva fuera, en el gestor de contraseñas, como **sobre de arranque**:

| Dato | Para qué |
|---|---|
| `RESTIC_REPOSITORY` y `RESTIC_PASSWORD` | Descifrar el respaldo |
| Access key y secret de R2 | Alcanzar el respaldo |
| `ZITADEL_MASTERKEY` | Descifrar la base de identidad |
| URL del repositorio y rama | Recuperar el código |

Con esas cuatro cosas se reconstruye el resto. Es el único punto de fallo aceptable, y por eso
va en un lugar distinto al servidor.

## Por qué restic y R2

**R2**: la cuenta de Cloudflare ya existe con la zona del dominio; no cobra egreso, así que una
restauración completa no cuesta ni se demora por facturación; y el volumen —decenas de MB por
instantánea— cabe en la capa gratuita.

**restic**: cifra del lado del cliente, deduplica (instantáneas cada 6 h de un volcado casi
idéntico ocupan casi nada) y `forget --prune` aplica la retención sin trabajo adicional.

Se descartó `rclone` sin cifrar por dejar identidades legibles en un bucket ajeno. Se descartó
la réplica en un segundo VPS por costo y complejidad desproporcionados al tamaño del servicio.

## Guion de host, no servicio de compose

El trabajo corre como cron del host y no como servicio del compose, por tres razones concretas:
necesita leer el `.git` del despliegue para anotar el commit en el manifiesto; necesita disparar
`pg-backup` **antes** de la instantánea (lo que elimina la carrera entre el volcado y el
respaldo, en vez de sortearla con horarios escalonados); y tiene que poder ejecutarse a mano
durante un ensayo sin levantar nada.

## Qué se respalda y qué no

Entra: `./backups/` completo, el volumen `uploads` montado directo (restic deduplica archivo por
archivo, no hace falta empaquetar en tar), los cinco archivos de secretos, y `MANIFIESTO.txt`.

No entra, deliberadamente: `postgres_data` en crudo (los volcados lo sustituyen y son portables
entre versiones), `pos_dist` (se reconstruye), `caddy_data` y `caddy_config` (certificados que se
reemiten solos), `node_modules` y `dist`.

## El manifiesto

Fecha, commit desplegado, `ZITADEL_VERSION`, versión de la imagen de Postgres, `APP_DOMAIN` y el
listado de archivos con su tamaño. Resuelve lo que más falla en una restauración real: saber qué
versión del código corresponde a estos datos. Restaurar `zitadel` contra otra versión de Zitadel,
o la base de negocio contra un esquema más nuevo, rompe de formas difíciles de diagnosticar.

## Dos decisiones que acortan la recuperación

**La restauración de emergencia usa `docker-compose.yaml`, no `docker-compose.behind-proxy.yaml`.**
En un servidor limpio los puertos 80 y 443 están libres, así que Caddy emite sus propios
certificados con el token de Cloudflare que ya viene en el `.env`. Reproducir la configuración de
Nginx Proxy Manager tomaría más tiempo y no aporta nada en una emergencia.

**No se vuelve a ejecutar `prod:bootstrap`.** El volcado de `zitadel` ya trae el proyecto, los
roles, las apps y todas las organizaciones; correr el bootstrap encima crearía un proyecto
duplicado. El guion lo advierte de forma explícita porque es el error natural de quien recuerda
el procedimiento de instalación y no el de restauración.

Tras `pg_restore --no-owner` hace falta `REASSIGN OWNED BY postgres TO pos_migrator`, porque el
init fija `POS_MIGRATOR_CREATEDB=false` y el volcado llega sin dueños.

## Alcance del ensayo

El ensayo trimestral local prueba integridad de datos y de secretos, pero **no** prueba la parte
de identidad: el dominio externo de Zitadel está grabado en su base, y una restauración con otro
dominio no se comporta igual. Por eso el ensayo completo se hace una vez en un VPS desechable,
apuntando el dominio a esa IP solo desde el archivo `hosts` de la máquina de pruebas. Así Zitadel
se ve a sí mismo con el dominio correcto sin que ningún cliente real se entere.
