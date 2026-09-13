#!/usr/bin/env bash
#
# Ensayo del respaldo. Un respaldo que nunca se ha restaurado es una hipótesis.
#
# Comprueba que la instantánea descifra, que trae los secretos completos, que los volcados se
# leen, y que los datos vuelven: restaura la base de negocio en una base desechable y compara
# las cuentas con producción. No toca nada del sistema en marcha.
#
# Lo que este ensayo NO prueba: la parte de identidad. El dominio externo de Zitadel está
# grabado en su base, así que restaurarla en otro sitio no se comporta igual. Eso solo se
# comprueba con el ensayo completo en un VPS desechable (docs/recuperacion.md).
#
# Uso:  ./infra/respaldo/verificar.sh

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONF="${RESPALDO_ENV:-$RAIZ/infra/respaldo/.env.respaldo}"
TMP=""
FALLOS=0

ok()    { printf '  \033[32m✓\033[0m %s\n' "$*"; }
mal()   { printf '  \033[31m✗\033[0m %s\n' "$*"; FALLOS=$((FALLOS+1)); }
log()   { printf '\n=== %s\n' "$*"; }

limpiar() {
  [ -n "$TMP" ] && rm -rf "$TMP"
  "${C[@]}" exec -T postgres psql -U postgres -q -c 'DROP DATABASE IF EXISTS ensayo_respaldo' < /dev/null >/dev/null 2>&1 || true
  "${C[@]}" exec -T postgres rm -f /tmp/ensayo.dump < /dev/null >/dev/null 2>&1 || true
}

[ -f "$CONF" ] || { echo "Falta $CONF"; exit 1; }
set -a
# shellcheck disable=SC1090
. "$CONF"
set +a

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.behind-proxy.yaml}"
C=(docker compose -f "$RAIZ/$COMPOSE_FILE")
TMP="$(mktemp -d /tmp/kustodela-ensayo.XXXXXX)"
chmod 700 "$TMP"

# La limpieza se registra aquí y no antes: necesita $C y $TMP, y si el guion muere en las
# comprobaciones de arriba no hay nada que limpiar todavía.
trap limpiar EXIT

restic_run() {
  docker run --rm \
    -e RESTIC_REPOSITORY -e RESTIC_PASSWORD \
    -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY \
    -v kustodela_restic_cache:/root/.cache/restic \
    -v "$TMP:/destino" \
    restic/restic:latest "$@"
}

# --- 1. El repositorio responde y está íntegro -------------------------------------------

log "1. Repositorio remoto"
if restic_run snapshots --latest 3 2>&1 | tail -6; then
  ok "el repositorio abre con la contraseña del sobre de arranque"
else
  mal "no se pudo abrir el repositorio"
  exit 1
fi

# --- 2. La instantánea baja y descifra ---------------------------------------------------

log "2. Descargando la instantánea más reciente"
restic_run restore latest --target /destino >/dev/null
D="$TMP/origen"
[ -d "$D" ] && ok "descifrada" || { mal "estructura inesperada"; exit 1; }

echo
sed -n '1,12p' "$D/MANIFIESTO.txt" | sed 's/^/  /'

# --- 3. Los secretos están completos -----------------------------------------------------

log "3. Secretos"
for f in env.raiz env.production.backend env.production.frontend \
         local/mailpit-relay.yaml local/zitadel-bootstrap/backend.pat \
         local/zitadel-bootstrap/login-client.pat; do
  [ -s "$D/secretos/$f" ] && ok "$f" || mal "falta o está vacío: $f"
done

# La masterkey es lo único verdaderamente irrecuperable: sin ella el volcado de zitadel no
# sirve. Comparamos huellas para confirmar que la respaldada es la que está en uso, sin
# imprimir ninguna de las dos.
huella() { grep -m1 '^ZITADEL_MASTERKEY=' "$1" | cut -d= -f2- | tr -d '\r\n' | sha256sum | cut -c1-16; }
if [ -f "$D/secretos/env.raiz" ] && [ -f "$RAIZ/.env" ]; then
  if [ "$(huella "$D/secretos/env.raiz")" = "$(huella "$RAIZ/.env")" ]; then
    ok "la ZITADEL_MASTERKEY respaldada coincide con la que está en uso ($(huella "$RAIZ/.env"))"
  else
    mal "la ZITADEL_MASTERKEY respaldada NO coincide con la que está en uso"
  fi
fi

# --- 4. Los volcados se leen -------------------------------------------------------------

log "4. Volcados"
for base in kustodela zitadel; do
  a="$D/postgres/$base.dump"
  if [ -f "$a" ] && docker run --rm -v "$D/postgres:/d:ro" postgres:17-alpine \
       pg_restore -l "/d/$base.dump" >/dev/null 2>&1; then
    ok "$base — $(du -h "$a" | cut -f1)"
  else
    mal "$base — el volcado falta o no se puede leer"
  fi
done

# --- 5. Los logos --------------------------------------------------------------------------

log "5. Logos"
n="$(find "$D/uploads" -type f 2>/dev/null | wc -l)"
[ "$n" -gt 0 ] && ok "$n archivos" || mal "el respaldo no trae ningún logo"

# --- 6. Los datos vuelven ----------------------------------------------------------------

log "6. Restauración en una base desechable"
k="$D/postgres/kustodela.dump"
"${C[@]}" cp "$k" postgres:/tmp/ensayo.dump >/dev/null
"${C[@]}" exec -T postgres psql -U postgres -q -c 'DROP DATABASE IF EXISTS ensayo_respaldo' < /dev/null >/dev/null
"${C[@]}" exec -T postgres psql -U postgres -q -c 'CREATE DATABASE ensayo_respaldo' < /dev/null >/dev/null
"${C[@]}" exec -T postgres pg_restore -U postgres -d ensayo_respaldo --no-owner --no-privileges /tmp/ensayo.dump < /dev/null >/dev/null 2>&1 || true

contar() {
  "${C[@]}" exec -T postgres psql -U postgres -d "$1" -tAc "SELECT count(*) FROM $2" < /dev/null 2>/dev/null | tr -d '\r'
}
for tabla in tenants tenant_users ordenes platillos; do
  vivo="$(contar kustodela "$tabla")"
  copia="$(contar ensayo_respaldo "$tabla")"
  if [ -n "$copia" ] && [ "$copia" = "$vivo" ]; then
    ok "$tabla: $copia filas, igual que producción"
  elif [ -n "$copia" ]; then
    # El volcado es de hasta 6 h atrás, así que en tablas vivas es normal que la copia tenga
    # menos. Que tenga MÁS, o cero, sí es señal de problema.
    if [ "$copia" -gt 0 ] && [ "$copia" -le "$vivo" ]; then
      ok "$tabla: $copia en la copia, $vivo en producción (el respaldo es anterior)"
    else
      mal "$tabla: $copia en la copia contra $vivo en producción"
    fi
  else
    mal "$tabla: no se pudo contar en la copia"
  fi
done

# --- Resultado ---------------------------------------------------------------------------

echo
if [ "$FALLOS" -eq 0 ]; then
  printf '\033[32m=== El respaldo sirve: descifra, trae los secretos completos y los datos vuelven.\033[0m\n\n'
else
  printf '\033[31m=== %s comprobaciones fallaron. El respaldo NO es de fiar hasta corregirlas.\033[0m\n\n' "$FALLOS"
  exit 1
fi
