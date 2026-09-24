#!/usr/bin/env bash
#
# Respaldo cifrado de Kustodela fuera del servidor.
#
# Vuelca ambas bases, reúne todo el estado que no se puede reconstruir (logos y secretos),
# anota qué versión del código corresponde a esos datos, y sube una instantánea cifrada a
# Cloudflare R2 con restic. Al terminar bien avisa a un vigilante externo; si el respaldo deja
# de ocurrir, ese vigilante manda un correo sin que nadie revise el servidor.
#
# Corre DENTRO de un contenedor del propio compose (servicio `respaldo`), no como cron del
# host. Así el horario vive en el repositorio: levantar el stack basta para dejar los
# respaldos armados, también en un servidor reconstruido desde una instantánea.
#
# No usa el socket de Docker a propósito. El contenedor *es* restic y lee lo que necesita por
# montajes de solo lectura; montar el socket le habría dado control equivalente a root sobre
# el host para un trabajo que sólo lee archivos.
#
# A mano:  docker compose run --rm respaldo respaldar.sh

set -euo pipefail

DESPLIEGUE="${DESPLIEGUE:-/despliegue}"   # raíz del repo, solo lectura
VOLCADOS="${VOLCADOS:-/backups}"          # lo que produce pg-backup, solo lectura
LOGOS="${LOGOS:-/uploads}"                # volumen uploads, solo lectura
CACHE="${CACHE:-/cache}"                  # volumen propio: caché de restic y candado

# Ruta FIJA a propósito. `restic forget` agrupa por host y por rutas: si la etapa fuera un
# mktemp distinto en cada corrida, cada instantánea caería en su propio grupo y la retención
# no podaría nada, creciendo para siempre. Es además la misma ruta que usaban las
# instantáneas hechas desde el host, así que la serie no se parte al migrar.
ETAPA_FIJA="/origen"
ETAPA=""
CANDADO="$CACHE/respaldo.lock"
# Restic reintenta contra el almacenamiento con espera exponencial. Sin un tope, un fallo
# tarda muchisimo en manifestarse y el aviso llega tardisimo; con el, se rinde y avisa.
TOPE="${TOPE_RESTIC:-1800}"
# Un volcado más viejo que esto significa que pg-backup dejó de producir. Se deja un margen
# sobre su cadencia para tolerar un volcado lento, pero no una tanda entera saltada: ese es
# justo el fallo silencioso que hay que cazar.
FRESCURA_H="${RESPALDO_FRESCURA_HORAS:-7}"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

# Si algo falla, avisamos al vigilante con el código de salida. Sin esto un fallo a mitad
# quedaría como silencio, que es indistinguible de "todo bien".
al_salir() {
  local codigo=$?
  if [ -n "$ETAPA" ]; then rm -rf "$ETAPA"; fi
  if [ $codigo -ne 0 ]; then
    log "FALLÓ con código $codigo"
    [ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS -m 10 --retry 3 \
      --data-raw "respaldar.sh falló con código $codigo" "$HEALTHCHECK_URL/fail" >/dev/null || true
  fi
  exit $codigo
}
trap al_salir EXIT

# --- Configuración -----------------------------------------------------------------------
# Llega por el entorno (`env_file` del compose apunta a infra/respaldo/.env.respaldo). Ese
# archivo NO entra en el respaldo a propósito: contiene la llave que lo descifra.

for v in RESTIC_REPOSITORY RESTIC_PASSWORD AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  [ -n "${!v:-}" ] || { log "Falta $v (revisa infra/respaldo/.env.respaldo)"; exit 1; }
done

# El nombre con el que restic agrupa las instantáneas. Importa más de lo que parece: `forget`
# aplica la retención por grupo, así que cambiarlo dejaría las instantáneas viejas en un grupo
# aparte con su propia política. Debe seguir siendo el mismo que ya usan las existentes.
SERVIDOR="${RESPALDO_SERVIDOR:-}"
[ -n "$SERVIDOR" ] || { log "Falta RESPALDO_SERVIDOR (ver .env.respaldo.example: debe coincidir con el host de las instantáneas ya existentes)"; exit 1; }

mkdir -p "$CACHE"

# Una corrida a mano no debe pisarse con la programada: dos respaldos a la vez se pelean por
# el candado del repositorio. Si ya hay una en curso, esta se rinde sin avisar al vigilante,
# para que la atascada acabe disparando la alarma por silencio.
exec 9>"$CANDADO"
if ! flock -n 9; then
  log "Ya hay un respaldo en curso; esta corrida se salta."
  exit 0
fi

# --- 1. Comprobar que hay un volcado fresco ----------------------------------------------
# Antes este guion disparaba pg-backup y fotografiaba el resultado. Desde dentro del compose
# no puede (haría falta el socket de Docker), así que en vez de producir el volcado comprueba
# que exista y sea reciente. Cubre lo mismo y algo más: el disparo detectaba "pg-backup no
# está levantado", y esto detecta además "está levantado pero no produce".

log "Comprobando volcados..."
limite=$(( $(date +%s) - FRESCURA_H * 3600 ))
for base in kustodela zitadel; do
  origen="$VOLCADOS/last/$base-latest.sql.gz"
  [ -e "$origen" ] || { log "Falta $origen — ¿está corriendo pg-backup?"; exit 1; }
  edad="$(stat -Lc %Y "$origen")"
  if [ "$edad" -lt "$limite" ]; then
    log "El volcado de $base es de $(date -d "@$edad" '+%Y-%m-%d %H:%M') — más de ${FRESCURA_H}h. pg-backup dejó de producir."
    exit 1
  fi
done

# --- 2. Reunir todo en un directorio de paso ---------------------------------------------
# Se arma la estructura exacta que tendrá dentro del respaldo, para que restaurar sea copiar
# de vuelta sin adivinar rutas.

rm -rf "$ETAPA_FIJA"
ETAPA="$ETAPA_FIJA"
mkdir -p "$ETAPA"
chmod 700 "$ETAPA"
mkdir -p "$ETAPA"/{postgres,secretos/local/zitadel-bootstrap,uploads}

log "Reuniendo volcados..."
# Solo los enlaces "latest", que pg-backup mantiene apuntando al volcado más reciente, y con
# un nombre fijo. Copiar backups/last/*.sql.gz traía también el volcado del turno anterior, y
# la restauración escogía el primero por orden alfabético: el más VIEJO. El histórico local se
# queda en el servidor, que la retención remota la lleva restic.
for base in kustodela zitadel; do
  origen="$VOLCADOS/last/$base-latest.sql.gz"
  cp -L "$origen" "$ETAPA/postgres/$base.dump"
  log "  $base <- $(basename "$(readlink -f "$origen")")"
done

log "Reuniendo logos..."
cp -a "$LOGOS/." "$ETAPA/uploads/" 2>/dev/null || true

log "Reuniendo secretos..."
copiar() { [ -f "$1" ] && cp "$1" "$2" || log "  aviso: no existe $1"; }
copiar "$DESPLIEGUE/.env"                                          "$ETAPA/secretos/env.raiz"
copiar "$DESPLIEGUE/Gorditas_Calerence_Backend/.env.production"    "$ETAPA/secretos/env.production.backend"
copiar "$DESPLIEGUE/Gorditas_frontend/project/.env.production"     "$ETAPA/secretos/env.production.frontend"
copiar "$DESPLIEGUE/.local/mailpit-relay.yaml"                     "$ETAPA/secretos/local/mailpit-relay.yaml"
copiar "$DESPLIEGUE/.local/zitadel-bootstrap/backend.pat"          "$ETAPA/secretos/local/zitadel-bootstrap/backend.pat"
copiar "$DESPLIEGUE/.local/zitadel-bootstrap/login-client.pat"     "$ETAPA/secretos/local/zitadel-bootstrap/login-client.pat"

# --- 3. Manifiesto -----------------------------------------------------------------------
# Lo que más falla en una restauración real no es recuperar los datos, sino saber qué versión
# del código les corresponde. Un volcado de zitadel restaurado contra otra versión de Zitadel,
# o la base de negocio contra un esquema más nuevo, rompe de formas difíciles de diagnosticar.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.behind-proxy.yaml}"

commit="$(git -C "$DESPLIEGUE" rev-parse --short HEAD 2>/dev/null || echo 'desconocido')"
rama="$(git -C "$DESPLIEGUE" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'desconocida')"
# El manifiesto existe para decir que codigo corresponde a estos datos. Si el despliegue
# tiene cambios sin commitear, el commit por si solo mentiria.
if [ -n "$(git -C "$DESPLIEGUE" status --porcelain 2>/dev/null)" ]; then
  commit="$commit+sucio"
fi
if [ -n "$(git -C "$DESPLIEGUE" branch -r --contains HEAD 2>/dev/null)" ]; then
  en_origin="sí"
else
  en_origin="NO — este commit solo existe en este servidor"
fi

{
  echo "Kustodela — respaldo"
  echo "===================="
  echo "Fecha:             $(date --iso-8601=seconds)"
  echo "Servidor:          $SERVIDOR"
  echo "Commit desplegado: $commit  (rama $rama)"
  echo "¿Está en origin?:  $en_origin"
  echo "APP_DOMAIN:        $(grep -m1 '^APP_DOMAIN=' "$DESPLIEGUE/.env" 2>/dev/null | cut -d= -f2- || echo '?')"
  echo "ZITADEL_VERSION:   $(grep -m1 '^ZITADEL_VERSION=' "$DESPLIEGUE/.env" 2>/dev/null | cut -d= -f2- || echo 'por omisión del compose')"
  echo "Postgres:          $(grep -m1 'image: postgres' "$DESPLIEGUE/$COMPOSE_FILE" 2>/dev/null | awk '{print $2}')"
  echo "Compose:           $COMPOSE_FILE"
  echo
  echo "Para restaurar:    infra/respaldo/restaurar.sh   (ver docs/recuperacion.md)"
  echo "NO ejecutes prod:bootstrap después de restaurar: el volcado de zitadel ya trae el"
  echo "proyecto, los roles y las organizaciones, y una segunda pasada los duplicaría."
  echo
  echo "Contenido"
  echo "---------"
  ( cd "$ETAPA" && find . -type f -printf '%10s  %p\n' | sort -k2 )
} > "$ETAPA/MANIFIESTO.txt"

# --- 4. Instantánea cifrada --------------------------------------------------------------
# restic cifra del lado del cliente, así que el volcado de identidades nunca queda legible en
# el bucket, y deduplica, así que cuatro instantáneas diarias de datos casi idénticos cuestan
# prácticamente lo mismo que una.

log "Subiendo instantánea..."
timeout "$TOPE" restic backup "$ETAPA" \
  --host "$SERVIDOR" \
  --tag kustodela \
  --tag "commit:$commit"

log "Aplicando retención..."
# Sin --host a propósito, igual que cuando corría en el host: filtrar por servidor dejaría las
# instantáneas de un nombre anterior sin podar para siempre si RESPALDO_SERVIDOR cambiara.
timeout "$TOPE" restic forget \
  --keep-daily "${RETENCION_DIARIA:-14}" \
  --keep-weekly "${RETENCION_SEMANAL:-8}" \
  --keep-monthly "${RETENCION_MENSUAL:-12}" \
  --prune

# --- 5. Avisar que sí ocurrió ------------------------------------------------------------

if [ -n "${HEALTHCHECK_URL:-}" ]; then
  curl -fsS -m 10 --retry 3 --data-raw "commit $commit" "$HEALTHCHECK_URL" >/dev/null
  log "Vigilante avisado."
else
  log "Aviso: HEALTHCHECK_URL vacío, nadie se enterará si esto deja de correr."
fi

log "Listo."
