# Recuperación de Kustodela

Qué hacer si se pierde el servidor. Lo urgente va primero; la explicación, después.

---

## Si el servidor se perdió

Necesitas: el **sobre de arranque** (§2) y una máquina con Docker y git.

```bash
# 1. El código, en la versión que corresponde a los datos
git clone https://github.com/algaro13/Gorditas_Calerence_Full_Project.git kustodela
cd kustodela
git checkout <rama del sobre>

# 2. Las credenciales del respaldo
cp infra/respaldo/.env.respaldo.example infra/respaldo/.env.respaldo
chmod 600 infra/respaldo/.env.respaldo
#    ...y complétalo con los valores del sobre de arranque

# 3. Restaurar
bash infra/respaldo/restaurar.sh
```

El guion descarga la instantánea, te enseña el manifiesto, pide confirmación, coloca los
secretos, levanta PostgreSQL, restaura ambas bases, repuebla los logos y levanta el resto.

**Falta un paso manual:** apuntar el DNS de Cloudflare a la IP nueva —`A` para el dominio,
`auth.`, `api.` y `*.`—. Hasta que propague, nada responde desde fuera.

> **No ejecutes `prod:bootstrap` después de restaurar.** El volcado de `zitadel` ya trae el
> proyecto, los roles, las apps y todas las organizaciones. Una segunda pasada crearía un
> proyecto duplicado y romperías los tokens. Es el error natural de quien recuerda el
> procedimiento de instalación y no el de restauración.

---

## 2. El sobre de arranque

Si el respaldo va cifrado, la llave no puede estar dentro del respaldo. Estos cuatro datos
viven en el gestor de contraseñas, en una entrada llamada **«Kustodela — sobre de arranque»**,
y son lo único que no se puede reconstruir desde ningún lado:

| Dato | Para qué |
|---|---|
| `RESTIC_REPOSITORY` y `RESTIC_PASSWORD` | Descifrar el respaldo |
| Access key y secret de Cloudflare R2 | Alcanzar el respaldo |
| `ZITADEL_MASTERKEY` | Descifrar la base de identidad |
| URL del repositorio y rama desplegada | Recuperar el código |

Perder cualquiera de ellos deja el respaldo inservible. Perder la `ZITADEL_MASTERKEY` en
particular significa perder todas las cuentas de todos los restaurantes aunque los datos estén
intactos. Su huella actual, para comprobar sin exponerla, es `8be663786edc73d3`:

```bash
grep '^ZITADEL_MASTERKEY=' .env | cut -d= -f2- | tr -d '\n' | sha256sum | cut -c1-16
```

---

## 3. Qué hay dentro del respaldo

| Contenido | Por qué está |
|---|---|
| Volcado de `kustodela` | Restaurantes, menús, órdenes, inventario |
| Volcado de `zitadel` | Organizaciones, personas, roles, sesiones |
| Volumen `uploads` | Logos. La base guarda rutas `/uploads/<tenantId>/logo.<ext>`, así que restaurar solo la base los deja rotos |
| `.env` raíz | Contraseñas de PostgreSQL, masterkey, token de Cloudflare |
| `.env.production` del backend | Ids de Zitadel y el PAT del usuario máquina |
| `.env.production` del frontend | Configuración del SPA |
| `.local/zitadel-bootstrap/*.pat` | Los dos tokens de máquina |
| `.local/mailpit-relay.yaml` | Clave del proveedor de correo |
| `MANIFIESTO.txt` | Fecha, commit desplegado, versiones de Zitadel y Postgres, dominio |

Deliberadamente **no** entran: `postgres_data` en crudo (los volcados lo sustituyen y son
portables entre versiones), el build del SPA, los certificados de Caddy (se reemiten solos) y
`node_modules`.

El manifiesto existe por una razón concreta: lo que más falla en una restauración real no es
recuperar los datos, sino saber qué versión del código les corresponde. Restaurar `zitadel`
contra otra versión de Zitadel, o la base de negocio contra un esquema más nuevo, rompe de
formas difíciles de diagnosticar.

---

## 4. Cómo funciona el respaldo

El respaldo es **un servicio más del compose** (`respaldo`), no un cron del host. Levantar el
stack basta para dejarlo armado: en producción, en una instalación nueva y en un servidor
salido de un respaldo. **No hay nada que instalar ni que recordar.**

Se hizo así por lo que enseñó el ensayo de recuperación: un paso manual es un paso que se
olvida el día que hay prisa. Antes el horario vivía en el crontab del VPS, y `restaurar.sh` ni
lo reinstalaba ni lo mencionaba — un servidor recién restaurado se quedaba sin respaldos.

Cómo encaja con el volcado:

```
   :00   pg-backup vuelca kustodela y zitadel a ./backups/
   :15   el servicio respaldo fotografía ese volcado y lo sube cifrado a R2
```

Detalles que importan:

- **Cifrado del lado del cliente.** El volcado de identidades nunca queda legible en el bucket.
- **Deduplicado.** Cuatro instantáneas diarias de datos casi idénticos cuestan prácticamente lo
  mismo que una.
- **Retención remota**: 14 diarias, 8 semanales, 12 mensuales. La local (14/4/6 en `./backups/`)
  sigue igual y sirve para restaurar rápido sin bajar nada.
- **Pérdida máxima: 6 horas** de órdenes. Ahora viene de `BACKUP_SCHEDULE`, la cadencia del
  volcado: el respaldo ya no dispara el suyo, fotografía el que encuentra.
- **Sin socket de Docker.** El contenedor *es* restic y lee lo que necesita por montajes de
  solo lectura. Montar el socket le habría dado control equivalente a root sobre el host para
  un trabajo que sólo lee archivos.
- **Comprobación de frescura.** Como ya no dispara el volcado, comprueba que el más reciente
  tenga menos de `RESPALDO_FRESCURA_HORAS` (7 por omisión). Si está viejo, falla y no avisa al
  vigilante, así que llega el correo. Esto cubre el fallo más peligroso —`pg-backup` fuera del
  stack— y además uno que antes se escapaba: `pg-backup` levantado pero fallando en silencio.
- **Vigilante de fallo silencioso.** El servicio avisa a healthchecks.io solo cuando termina
  bien. Si el respaldo deja de ocurrir, llega un correo sin que nadie revise el servidor.

Para forzar un respaldo ahora mismo, sin esperar al turno:

```
docker compose run --rm respaldo respaldar.sh
```

Si ya hay uno en curso, ese se rinde solo: comparten un candado, así que no se pisan.

### Migrar desde el cron viejo

Sólo aplica a un servidor que aún tenga la línea en el crontab. El orden importa por dos
razones, y conviene tenerlas claras antes de empezar:

- **`git pull` rompe el cron en el acto.** `respaldar.sh` se reescribió para correr dentro del
  contenedor: en el host ya no encuentra ni `/despliegue` ni `restic`. La línea del crontab hay
  que quitarla en la misma ventana, no después.
- **No conviven bien.** No comparten candado —el viejo lo tenía en `/var/lock`, el nuevo en su
  volumen— y `restic forget --prune` toma un bloqueo exclusivo del repositorio. Dos pasadas
  solapadas harían fallar a una y dispararían el vigilante sin motivo real.

Hazlo de una sentada:

1. **Antes de nada, averigua con qué host están guardadas las instantáneas existentes.** Si
   `RESPALDO_SERVIDOR` no coincide, `restic forget` tratará las viejas como un grupo aparte y
   la retención se descuadra:

   ```bash
   docker run --rm --env-file infra/respaldo/.env.respaldo restic/restic:latest snapshots | tail -5
   ```

2. **Quita la línea del crontab** (`crontab -e`). A partir de aquí no hay respaldos hasta el
   paso 5, así que no lo dejes a medias.

3. **Actualiza el código y la configuración**: `git pull`, luego en
   `infra/respaldo/.env.respaldo` pon `RESPALDO_SERVIDOR` con el valor del paso 1, y en `.env`
   baja `BACKUP_SCHEDULE` a `0 0 */6 * * *`. Antes daba igual porque el guion disparaba su
   propio volcado; ahora es la cadencia que fija la pérdida máxima, y dejarlo en `@daily` haría
   fallar el respaldo por falta de frescura.

4. **Levanta el servicio y fuerza una corrida:**

   ```bash
   docker compose up -d --build pg-backup respaldo
   docker compose run --rm respaldo respaldar.sh
   ```

5. **Comprueba** que la instantánea llegó y que el vigilante quedó en verde:

   ```bash
   docker compose run --rm respaldo restic snapshots | tail -5
   ```

   Si el paso 4 falló por falta de frescura, es que `pg-backup` aún no ha hecho su primer
   volcado con el horario nuevo. Fuérzalo con
   `docker compose exec pg-backup /backup.sh` y repite.

**Ya no queda ningún cron del host.** Lo otro que corre solo —la evaluación de cupos que hace
vencer el plazo de 15 días— lo programa el propio backend (`src/trabajos.ts`), al arrancar y
cada 24 horas.

Para forzar una evaluación en producción, sin esperar al ciclo, se reinicia el backend: la
primera corrida ocurre un minuto después de arrancar.

```
docker compose restart backend
```

(En la imagen de producción no está `scripts/` ni `tsx`, así que `scripts/evaluar-cupos.ts`
sirve en desarrollo — `npx tsx scripts/evaluar-cupos.ts` — pero no dentro del contenedor.)

---

## 5. Ensayo

Un respaldo que nunca se ha restaurado es una hipótesis.

**Cada trimestre**, sin tocar nada en marcha:

```bash
npm run prod:verificar-respaldo
```

Comprueba que la instantánea descifra, que trae los seis archivos de secretos, que la
masterkey respaldada coincide con la que está en uso, que ambos volcados se leen, y restaura
la base de negocio en una base desechable comparando las cuentas con producción.

**Lo que ese ensayo no prueba** es la parte de identidad: el dominio externo de Zitadel está
grabado en su base, así que restaurarla en otro sitio no se comporta igual. Eso solo se
verifica con el ensayo completo.

### Ensayo completo

Se hace una vez, en un VPS desechable, y fija el tiempo real de recuperación en vez de
estimarlo. En lugar de mover el DNS —que afectaría a los clientes— se apunta el dominio a la
IP de prueba **solo desde la máquina desde la que pruebas**, con entradas en su archivo
`hosts`:

```
<IP del VPS de prueba>  kustodela.com auth.kustodela.com api.kustodela.com demo.kustodela.com
```

Así Zitadel se ve a sí mismo con el dominio correcto, que es lo que exige su base, sin que
ningún cliente real se entere. Se prueba el flujo entero: entrar, tomar una orden, cobrarla,
verla en reportes, y que el logo del restaurante cargue. Al terminar se destruye el VPS.

### Tiempo medido

Primer ensayo completo: **13 de septiembre de 2026**, sobre un VPS ajeno con Docker ya instalado.

| Tramo | Medido |
|---|---|
| Descargar la instantánea y restaurar ambas bases | menos de 4 min |
| Repoblar los logos y arrancar todos los servicios | 1 min |
| **Con las imágenes ya presentes** | **~5 min** |
| Obtener las imágenes en un servidor nuevo | no medible ahí (ver abajo); 10-20 min estimados |

**Objetivo realista: entre 15 y 25 minutos**, más lo que tarde en propagar el DNS.

El ensayo terminó con una persona entrando por el navegador, tomando una orden y cobrándola
sobre los datos recuperados; la orden apareció en la base restaurada. Eso es lo que hace que
el número de arriba signifique algo.

### Lo que el ensayo destapó

Ninguno de estos fallos se veía leyendo el código. Aparecieron todos al ejecutar el
procedimiento de verdad, y por eso conviene repetirlo de vez en cuando:

- **`REASSIGN OWNED BY postgres` no funciona.** PostgreSQL lo rechaza porque alcanza objetos
  del sistema. Estaba en el procedimiento desde antes y nunca se había ejecutado.
- **Zitadel guarda sus 144 tablas en ocho esquemas propios**, no en `public`. Un arreglo que
  solo mirara `public` habría dejado toda la identidad a nombre de `postgres`, y la primera
  actualización posterior a la recuperación habría fallado semanas después.
- **Los errores no fatales de `pg_restore` abortaban el guion a media restauración**, que es
  peor que continuar e informar.
- **La restauración elegía el volcado más viejo** cuando había dos del mismo día.
- **Un fallo de red tardaba más de diez minutos en avisar**, porque restic reintenta en
  silencio.

### Si el servidor de destino tiene la red limitada

El ensayo se hizo en un servidor **sin salida IPv4**, donde los contenedores no alcanzan
internet. Dos variables del guion existen por eso:

- `RED_RESTIC=host` hace que restic use la pila de red del anfitrión.
- `COMPOSE_RESTAURACION` permite usar el compose detrás de proxy cuando otro servicio ya
  ocupa los puertos 80 y 443.

Si además el registro de imágenes es inalcanzable, se pueden trasladar desde otro servidor:
`docker save <imágenes> | gzip` en origen, `gunzip | docker load` en destino.

---

## 6. Errores que se cometen

- **Ejecutar `prod:bootstrap` después de restaurar.** Duplica el proyecto de Zitadel. Ver §1.
- **Intentar `gunzip` los volcados.** Se llaman `.sql.gz` pero no son gzip: son volcados en el
  formato propio de PostgreSQL, ya comprimidos por dentro. Se leen con `pg_restore`.
- **Olvidar `REASSIGN OWNED`.** Tras `pg_restore --no-owner`, `pos_app` se queda sin permisos
  bajo RLS y el backend arranca con errores de permiso. El guion ya lo hace.
- **Restaurar solo la base.** Los logos viven en un volumen aparte y la base guarda sus rutas.
- **Dejar la copia descomprimida.** `/tmp/kustodela-restauracion` contiene todos los secretos
  en claro. Bórrala al terminar.
- **Instalar un cron para la evaluación de cupos.** No hace falta: el backend se la programa
  sola. Un cron encima solo duplicaría el trabajo. Ver §4.
