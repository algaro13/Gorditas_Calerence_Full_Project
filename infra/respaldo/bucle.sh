#!/usr/bin/env bash
#
# Horario del respaldo, dentro del contenedor.
#
# Esto es lo que sustituye a la línea del crontab del host. Vivía fuera del repositorio, y eso
# tenía dos costes: `restaurar.sh` no la reinstalaba —un servidor restaurado se quedaba sin
# respaldos— y cambiar la frecuencia era entrar por SSH en vez de hacer un commit.
#
# Se despierta en frontera fija del reloj local (cada RESPALDO_CADA_HORAS, a los
# RESPALDO_DESFASE_MIN minutos) y no "cada N horas desde que arranqué". La diferencia importa:
# el volcado lo produce pg-backup en punto, y este servicio lo fotografía unos minutos después.
# Con un intervalo relativo al arranque, un reinicio desalinearía las dos cosas para siempre.

set -uo pipefail   # a propósito sin -e: una corrida que falla no debe matar el bucle

CADA_H="${RESPALDO_CADA_HORAS:-6}"
DESFASE_M="${RESPALDO_DESFASE_MIN:-15}"

log() { printf '%s  [bucle] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

# Segundos hasta la próxima frontera. Se calcula sobre el reloj local y no sobre el epoch
# porque las fronteras que importan son las del horario del restaurante.
segundos_hasta_siguiente() {
  local ahora paso desfase transcurrido objetivo
  transcurrido=$(( $(date +%-H) * 3600 + $(date +%-M) * 60 + $(date +%-S) ))
  paso=$(( CADA_H * 3600 ))
  desfase=$(( DESFASE_M * 60 ))

  # Primera frontera del día que aún no ha pasado.
  for (( ahora = 0; ahora < 86400; ahora += paso )); do
    objetivo=$(( ahora + desfase ))
    if [ "$objetivo" -gt "$transcurrido" ]; then
      echo $(( objetivo - transcurrido ))
      return
    fi
  done
  # Ninguna: la siguiente es la primera de mañana.
  echo $(( 86400 - transcurrido + desfase ))
}

log "Respaldo cada ${CADA_H}h, a los ${DESFASE_M} min de la hora en punto (TZ=${TZ:-UTC})."

# No se respalda al arrancar, a propósito. En un servidor recién restaurado los volcados que
# hay son tan viejos como la instantánea de la que salieron, así que una corrida inmediata
# fallaría la comprobación de frescura y dispararía una alarma confusa justo el peor día.
# Esperando a la primera frontera, pg-backup ya ha tenido su turno.
while true; do
  espera="$(segundos_hasta_siguiente)"
  log "Siguiente respaldo en $(( espera / 60 )) min."
  sleep "$espera"

  log "Arrancando respaldo..."
  if /usr/local/bin/respaldar.sh; then
    log "Respaldo terminado."
  else
    # El guion ya avisó al vigilante. Aquí sólo se deja constancia y se sigue: rendirse
    # dejaría el servidor sin respaldos hasta que alguien lo reiniciara a mano.
    log "El respaldo falló con código $?. Se reintenta en el siguiente turno."
  fi

  # Si la corrida fue muy rápida podríamos seguir dentro del mismo minuto y disparar dos veces.
  sleep 61
done
