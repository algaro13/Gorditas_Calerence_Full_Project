#!/usr/bin/env bash
#
# Respaldo cifrado de Kustodela fuera del servidor.
#
# Vuelca ambas bases, reúne todo el estado que no se puede reconstruir (logos y secretos),
# anota qué versión del código corresponde a esos datos, y sube una instantánea cifrada a
# Cloudflare R2 con restic. Al terminar bien avisa a un vigilante externo; si el respaldo deja
# de ocurrir, ese vigilante manda un correo sin que nadie revise el servidor.
#
# Corre como cron del host, no como servicio de compose, porque necesita leer el .git del
# despliegue, disparar pg-backup ANTES de la instantánea (así no hay carrera entre el volcado
# y el respaldo) y poder ejecutarse a mano durante un ensayo.
#
# Uso:   ./infra/respaldo/respaldar.sh
# Cron:  0 */6 * * *  /bin/bash /home/debian/apps/kustodela/infra/respaldo/respaldar.sh >> /var/log/kustodela-respaldo.log 2>&1

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONF="${RESPALDO_ENV:-$RAIZ/infra/respaldo/.env.respaldo}"
ETAPA=""

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

# Si algo falla, avisamos al vigilante con el código de salida y el tramo donde murió. Sin
# esto un fallo a mitad quedaría como silencio, que es indistinguible de "todo bien".
al_salir() {
  local codigo=$?
  [ -n "$ETAPA" ] && rm -rf "$ETAPA"
  if [ $codigo -ne 0 ]; then
    log "FALLÓ con código $codigo"
    [ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS -m 10 --retry 3 \
      --data-raw "respaldar.sh falló con código $codigo" "$HEALTHCHECK_URL/fail" >/dev/null || true
  fi
  exit $codigo
}
trap al_salir EXIT

# --- Configuración -----------------------------------------------------------------------

[ -f "$CONF" ] || { log "Falta $CONF (copia .env.respaldo.example y complétalo)"; exit 1; }
set -a
# shellcheck disable=SC1090
. "$CONF"
set +a

for v in RESTIC_REPOSITORY RESTIC_PASSWORD AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  [ -n "${!v:-}" ] || { log "Falta $v en $CONF"; exit 1; }
done

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.behind-proxy.yaml}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-kustodela}"
VOL_UPLOADS="${COMPOSE_PROJECT}_uploads"
C=(docker compose -f "$RAIZ/$COMPOSE_FILE")

cd "$RAIZ"

# --- 1. Volcar las bases -----------------------------------------------------------------
# Disparamos pg-backup en vez de esperar a su horario: así la instantánea siempre lleva un
# volcado recién hecho. Si el contenedor no está levantado esto falla, que es justo el aviso
# que hoy falta: un stack arrancado nombrando servicios deja pg-backup fuera sin decir nada.

log "Volcando kustodela y zitadel..."
"${C[@]}" exec -T pg-backup /backup.sh < /dev/null >/dev/null

# --- 2. Reunir todo en un directorio de paso ---------------------------------------------
# Se arma la estructura exacta que tendrá dentro del respaldo, para que restaurar sea copiar
# de vuelta sin adivinar rutas.

ETAPA="$(mktemp -d /tmp/kustodela-respaldo.XXXXXX)"
chmod 700 "$ETAPA"
mkdir -p "$ETAPA"/{postgres,secretos/local/zitadel-bootstrap,uploads}

log "Reuniendo volcados..."
# Solo los enlaces "latest", que pg-backup mantiene apuntando al volcado más reciente, y con
# un nombre fijo. Copiar backups/last/*.sql.gz traía también el volcado del turno anterior, y
# la restauración escogía el primero por orden alfabético: el más VIEJO. El histórico local se
# queda en el servidor, que la retención remota la lleva restic.
for base in kustodela zitadel; do
  origen="$RAIZ/backups/last/$base-latest.sql.gz"
  [ -e "$origen" ] || { log "Falta $origen — ¿corrió pg-backup?"; exit 1; }
  cp -L "$origen" "$ETAPA/postgres/$base.dump"
  log "  $base <- $(basename "$(readlink -f "$origen")")"
done

log "Reuniendo logos..."
docker run --rm -v "$VOL_UPLOADS:/u:ro" -v "$ETAPA/uploads:/dst" \
  alpine:3 sh -c 'cp -a /u/. /dst/ 2>/dev/null || true'

log "Reuniendo secretos..."
copiar() { [ -f "$1" ] && cp "$1" "$2" || log "  aviso: no existe $1"; }
copiar "$RAIZ/.env"                                          "$ETAPA/secretos/env.raiz"
copiar "$RAIZ/Gorditas_Calerence_Backend/.env.production"    "$ETAPA/secretos/env.production.backend"
copiar "$RAIZ/Gorditas_frontend/project/.env.production"     "$ETAPA/secretos/env.production.frontend"
copiar "$RAIZ/.local/mailpit-relay.yaml"                     "$ETAPA/secretos/local/mailpit-relay.yaml"
copiar "$RAIZ/.local/zitadel-bootstrap/backend.pat"          "$ETAPA/secretos/local/zitadel-bootstrap/backend.pat"
copiar "$RAIZ/.local/zitadel-bootstrap/login-client.pat"     "$ETAPA/secretos/local/zitadel-bootstrap/login-client.pat"

# --- 3. Manifiesto -----------------------------------------------------------------------
# Lo que más falla en una restauración real no es recuperar los datos, sino saber qué versión
# del código les corresponde. Un volcado de zitadel restaurado contra otra versión de Zitadel,
# o la base de negocio contra un esquema más nuevo, rompe de formas difíciles de diagnosticar.

commit="$(git -C "$RAIZ" rev-parse --short HEAD 2>/dev/null || echo 'desconocido')"
rama="$(git -C "$RAIZ" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'desconocida')"
# El manifiesto existe para decir que codigo corresponde a estos datos. Si el despliegue
# tiene cambios sin commitear, el commit por si solo mentiria.
if [ -n "$(git -C "$RAIZ" status --porcelain 2>/dev/null)" ]; then
  commit="$commit+sucio"
fi
if git -C "$RAIZ" branch -r --contains HEAD >/dev/null 2>&1 && \
   [ -n "$(git -C "$RAIZ" branch -r --contains HEAD 2>/dev/null)" ]; then
  en_origin="sí"
else
  en_origin="NO — este commit solo existe en este servidor"
fi

{
  echo "Kustodela — respaldo"
  echo "===================="
  echo "Fecha:             $(date --iso-8601=seconds)"
  echo "Servidor:          $(hostname)"
  echo "Commit desplegado: $commit  (rama $rama)"
  echo "¿Está en origin?:  $en_origin"
  echo "APP_DOMAIN:        $(grep -m1 '^APP_DOMAIN=' "$RAIZ/.env" 2>/dev/null | cut -d= -f2- || echo '?')"
  echo "ZITADEL_VERSION:   $(grep -m1 '^ZITADEL_VERSION=' "$RAIZ/.env" 2>/dev/null | cut -d= -f2- || echo 'por omisión del compose')"
  echo "Postgres:          $(grep -m1 'image: postgres' "$RAIZ/$COMPOSE_FILE" | awk '{print $2}')"
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

restic_run() {
  docker run --rm \
    -e RESTIC_REPOSITORY -e RESTIC_PASSWORD \
    -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY \
    -v kustodela_restic_cache:/root/.cache/restic \
    -v "$ETAPA:/origen:ro" \
    restic/restic:latest "$@"
}

log "Subiendo instantánea..."
restic_run backup /origen \
  --host "$(hostname)" \
  --tag kustodela \
  --tag "commit:$commit"

log "Aplicando retención..."
restic_run forget \
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
