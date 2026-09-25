# Que el respaldo se programe desde el compose, sin cron del host

## Por qué

El respaldo funciona, pero su **horario** es la última pieza de Kustodela que vive fuera del
repositorio: una línea en el crontab del VPS. Eso tiene dos consecuencias concretas.

La primera la encontramos al revisar el guion de restauración: **`restaurar.sh` no reinstala el
cron y ni siquiera lo menciona** entre sus pasos manuales. Un servidor recién restaurado se
queda sin respaldos. El vigilante acabaría avisando, pero enterarse de eso el día después de un
desastre es exactamente lo que el ensayo de recuperación existía para evitar.

La segunda es deriva: cambiar la frecuencia de respaldo hoy es entrar por SSH y editar el
crontab, no un commit. Lo que el repositorio dice y lo que el servidor hace pueden separarse
sin que nada lo note.

## Qué cambia

El respaldo pasa a ser un servicio más del `docker-compose`, con su propio horario dentro.
`docker compose up` deja los respaldos armados: en producción, en una instalación nueva y en un
servidor salido de un respaldo, sin nada que instalar ni recordar.

**Sin socket de Docker.** Hoy el guion lanza `docker run restic`, `docker run alpine` para
copiar los logos y `docker compose exec pg-backup`. Las dos primeras desaparecen si el servicio
*es* el contenedor de restic y lleva los volúmenes montados. La tercera es la única que
obligaría a montar el socket, y se sustituye (ver abajo). Montar el socket habría dado al
contenedor acceso equivalente a root sobre el host, y no vale la pena.

Lo que el servicio necesita montado, todo de solo lectura salvo la caché:

- la raíz del despliegue — para los secretos y para leer `.git` (qué commit corresponde a estos
  datos, que es lo que más falta hace en una restauración real);
- el volumen `uploads` — los logos;
- `./backups` — los volcados que produce `pg-backup`;
- un volumen propio para la caché de restic y el candado.

## El disparo del volcado

Hoy el guion hace `docker compose exec pg-backup /backup.sh` justo antes de la instantánea, así
que la foto lleva un volcado de hace segundos. Sin el socket eso no se puede.

Se sustituye por dos cosas que juntas dan la misma protección:

1. Los horarios se alinean: `pg-backup` vuelca en punto, el respaldo fotografía unos minutos
   después.
2. **El respaldo comprueba que el volcado sea fresco** y falla si no lo es. Al fallar no hace
   ping, así que el vigilante manda el correo.

Esto conserva el aviso que hoy da el disparo, y de hecho lo hace más directo: hoy detecta «no
pude disparar el volcado» y así detecta «el volcado no está fresco», que es el problema que de
verdad importa. Cubre además un caso que hoy se escapa: `pg-backup` levantado pero fallando en
silencio.

El precio honesto: pasan a ser dos relojes independientes en vez de uno, y la instantánea lleva
datos de hace minutos en vez de segundos. Con un objetivo de pérdida máxima de 6 horas, la
diferencia es irrelevante.

## Migración

El cron actual **no se toca** hasta que el servicio esté probado contra R2. Un respaldo que
parece correr y guarda algo inservible no se descubre hasta que se necesita, así que el orden
es: montar el servicio, comprobar que la instantánea sale y que el vigilante responde, y sólo
entonces quitar la línea del crontab.

## Qué no cambia

- Qué entra en la instantánea, el cifrado, la retención y el manifiesto.
- El vigilante externo y el sobre de arranque.
- `restaurar.sh` y el procedimiento de recuperación, salvo que deja de haber cron que instalar.
