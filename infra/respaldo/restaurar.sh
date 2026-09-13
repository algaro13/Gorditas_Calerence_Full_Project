#!/usr/bin/env bash
#
# Recuperación de Kustodela en una máquina limpia.
#
# Requisitos previos (ver docs/recuperacion.md):
#   - Un servidor con Docker y el repositorio ya clonado en el commit que indica el manifiesto.
#   - El sobre de arranque: infra/respaldo/.env.respaldo con las credenciales de R2 y la
#     contraseña de restic.
#
# Este guion NO ejecuta prod:bootstrap, y no debes ejecutarlo tú después: el volcado de
# zitadel ya trae el proyecto, los roles, las apps y todas las organizaciones. Una segunda
# pasada del bootstrap crearía un proyecto duplicado. Es el error natural de quien recuerda el
# procedimiento de instalación y no el de restauración.
#
# Uso:  ./infra/respaldo/restaurar.sh

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONF="${RESPALDO_ENV:-$RAIZ/infra/respaldo/.env.respaldo}"
DESTINO="${DESTINO_RESTAURACION:-/tmp/kustodela-restauracion}"

log()  { printf '\n=== %s\n' "$*"; }
paso() { printf '  %s\n' "$*"; }

confirmar() {
  printf '\n  %s\n  Escribe SÍ para continuar: ' "$1"
  read -r r
  [ "$r" = "SÍ" ] || [ "$r" = "SI" ] || { echo "  Cancelado."; exit 1; }
}

[ -f "$CONF" ] || { echo "Falta $CONF — está en el sobre de arranque."; exit 1; }
set -a
# shellcheck disable=SC1090
. "$CONF"
set +a

# En una emergencia se usa el compose con Caddy, no la variante detrás de proxy: en un
# servidor limpio los puertos 80 y 443 están libres, así que Caddy emite sus propios
# certificados con el token de Cloudflare que ya viene en el .env restaurado. Reproducir la
# configuración de Nginx Proxy Manager tomaría más y no aporta nada ahora.
COMPOSE_FILE="${COMPOSE_RESTAURACION:-docker-compose.yaml}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-kustodela}"
VOL_UPLOADS="${COMPOSE_PROJECT}_uploads"
C=(docker compose -f "$RAIZ/$COMPOSE_FILE")

cd "$RAIZ"

restic_run() {
  docker run --rm \
    -e RESTIC_REPOSITORY -e RESTIC_PASSWORD \
    -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY \
    -v kustodela_restic_cache:/root/.cache/restic \
    -v "$DESTINO:/destino" \
    restic/restic:latest "$@"
}

# --- 1. Traer la instantánea -------------------------------------------------------------

log "1. Descargando la instantánea más reciente"
mkdir -p "$DESTINO"
chmod 700 "$DESTINO"
restic_run restore latest --target /destino
DATOS="$DESTINO/origen"
[ -d "$DATOS" ] || { echo "La instantánea no tiene la estructura esperada en $DATOS"; exit 1; }

log "2. Manifiesto del respaldo"
cat "$DATOS/MANIFIESTO.txt"

commit_local="$(git -C "$RAIZ" rev-parse --short HEAD 2>/dev/null || echo '?')"
commit_resp="$(grep -m1 '^Commit desplegado:' "$DATOS/MANIFIESTO.txt" | awk '{print $3}')"
if [ "$commit_local" != "$commit_resp" ]; then
  paso ""
  paso "ATENCIÓN: este clon está en $commit_local y el respaldo se tomó en $commit_resp."
  paso "Restaurar datos contra otra versión del código puede fallar de forma difícil de"
  paso "diagnosticar. Lo correcto es 'git checkout $commit_resp' antes de seguir."
fi

confirmar "Se va a restaurar sobre este servidor. Los datos actuales se perderán."

# --- 3. Secretos -------------------------------------------------------------------------

log "3. Colocando secretos"
S="$DATOS/secretos"
mkdir -p "$RAIZ/.local/zitadel-bootstrap"
colocar() { [ -f "$1" ] && { install -m 600 "$1" "$2"; paso "$(basename "$2")"; } || paso "aviso: el respaldo no traía $(basename "$1")"; }
colocar "$S/env.raiz"                              "$RAIZ/.env"
colocar "$S/env.production.backend"                "$RAIZ/Gorditas_Calerence_Backend/.env.production"
colocar "$S/env.production.frontend"               "$RAIZ/Gorditas_frontend/project/.env.production"
colocar "$S/local/mailpit-relay.yaml"              "$RAIZ/.local/mailpit-relay.yaml"
colocar "$S/local/zitadel-bootstrap/backend.pat"   "$RAIZ/.local/zitadel-bootstrap/backend.pat"
colocar "$S/local/zitadel-bootstrap/login-client.pat" "$RAIZ/.local/zitadel-bootstrap/login-client.pat"

grep -q '^ZITADEL_MASTERKEY=' "$RAIZ/.env" || {
  echo "El .env restaurado no tiene ZITADEL_MASTERKEY. Sin ella la base de identidad es"
  echo "ilegible: tómala del sobre de arranque y agrégala antes de seguir."
  exit 1
}

# --- 4. PostgreSQL vacío -----------------------------------------------------------------
# Al ser un volumen nuevo corre infra/postgres/init/01-roles.sh, que crea los roles
# pos_migrator y pos_app, la base kustodela y la base zitadel con sus permisos.

log "4. Levantando PostgreSQL"
"${C[@]}" up -d --wait postgres
paso "listo"

# --- 5. Restaurar las bases --------------------------------------------------------------

log "5. Restaurando las dos bases"
k="$(ls -1 "$DATOS"/postgres/kustodela-*.sql.gz | head -1)"
z="$(ls -1 "$DATOS"/postgres/zitadel-*.sql.gz | head -1)"
paso "negocio:   $(basename "$k")"
paso "identidad: $(basename "$z")"

# Los archivos se llaman .sql.gz pero no son gzip: son volcados en el formato propio de
# PostgreSQL, ya comprimidos por dentro. gunzip falla con ellos; se leen con pg_restore.
"${C[@]}" cp "$k" postgres:/tmp/kustodela.dump
"${C[@]}" cp "$z" postgres:/tmp/zitadel.dump
"${C[@]}" exec -T postgres pg_restore -U postgres -d kustodela --clean --if-exists --no-owner /tmp/kustodela.dump < /dev/null
"${C[@]}" exec -T postgres pg_restore -U postgres -d zitadel   --clean --if-exists --no-owner /tmp/zitadel.dump   < /dev/null

# El volcado llega sin dueños (--no-owner) y el init fija POS_MIGRATOR_CREATEDB=false, así
# que hay que devolver la propiedad o pos_app se queda sin permisos bajo RLS.
"${C[@]}" exec -T postgres psql -U postgres -d kustodela -c 'REASSIGN OWNED BY postgres TO pos_migrator' < /dev/null
"${C[@]}" exec -T postgres rm -f /tmp/kustodela.dump /tmp/zitadel.dump < /dev/null
paso "restauradas"

# --- 6. Logos ----------------------------------------------------------------------------
# La base guarda rutas /uploads/<tenantId>/logo.<ext>, así que sin esto los restaurantes
# quedan sin su marca aunque los datos estén completos.

log "6. Repoblando los logos"
docker volume create "$VOL_UPLOADS" >/dev/null
docker run --rm -v "$VOL_UPLOADS:/u" -v "$DATOS/uploads:/src:ro" \
  alpine:3 sh -c 'cp -a /src/. /u/ 2>/dev/null || true'
paso "$(find "$DATOS/uploads" -type f | wc -l) archivos"

# --- 7. El resto del sistema -------------------------------------------------------------

log "7. Levantando el resto"
"${C[@]}" up -d --build --wait postgres zitadel-api zitadel-login caddy pg-backup backend
"${C[@]}" run --rm --build frontend-build

# --- 8. Lo que falta y es manual ---------------------------------------------------------

dominio="$(grep -m1 '^APP_DOMAIN=' "$RAIZ/.env" | cut -d= -f2-)"
cat <<FIN

=== Restaurado. Falta lo que este guion no puede hacer solo:

  1. Apuntar el DNS de Cloudflare a la IP de este servidor:
       A  auth.$dominio, api.$dominio, *.$dominio, $dominio
     Mientras el DNS no propague, nada responderá desde fuera.

  2. Comprobar, ya con DNS o con el archivo hosts local:
       curl -sI https://auth.$dominio/.well-known/openid-configuration
       curl -s  https://api.$dominio/health

  3. Entrar a un restaurante, tomar una orden y cobrarla.

  NO ejecutes prod:bootstrap. El volcado de zitadel ya trae el proyecto, los roles y las
  organizaciones; una segunda pasada los duplicaría.

  Borra la copia descomprimida cuando termines, que tiene los secretos en claro:
       rm -rf $DESTINO

FIN
