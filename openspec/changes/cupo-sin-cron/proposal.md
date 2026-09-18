# Que el plazo de cupo venza solo, también en un servidor restaurado

## Por qué

El plazo de 15 días ya está implementado, pero **hoy no vence nunca en producción**. Quien lo
hace vencer es `scripts/evaluar-cupos.ts`, y nada lo ejecuta: el aviso de la pantalla vuelve a
ser solo un aviso.

Lo natural sería un cron en el VPS. Se descarta por dos razones concretas:

1. **El script no existe en la imagen.** El `Dockerfile` copia solo `src`,
   `tsconfig.build.json` excluye `scripts`, y la imagen final se instala con `--omit=dev`, así
   que tampoco hay `tsx`. Un cron del host obligaría a copiar `scripts/` en la imagen,
   compilarlo y además instalar la entrada en el crontab.
2. **No sobrevive a una restauración.** El ensayo de recuperación demostró que lo que vive solo
   en el disco del host se pierde al reconstruir el servidor. Un cron habría que acordarse de
   reinstalarlo, y `docs/recuperacion.md` tendría que documentarlo: un paso manual más que
   falla justo el día que se está bajo presión.

Lo que se busca es que levantar el stack baste. Nada que instalar aparte, ni en producción ni
en el servidor que salga de un respaldo.

## Qué cambia

- El propio backend programa la evaluación de cupos: una vez poco después de arrancar y luego
  cada 24 horas. Vive en `src`, que ya se compila y ya viaja en la imagen.
- No se solapa consigo mismo: si una corrida sigue en marcha cuando toca la siguiente, se salta.
- Se apaga limpio al cerrar el proceso, para no dejar temporizadores colgando.
- No corre en las pruebas.
- `scripts/evaluar-cupos.ts` se conserva para dispararlo a mano durante un incidente.

No se ata a una hora fija del día a propósito: un reinicio a la hora equivocada se saltaría la
ventana. Como el trabajo es idempotente —tras ajustar limpia la marca y el plazo vuelve a
empezar—, correrlo de más no desactiva de más.

## Qué no cambia

- La lógica del plazo, la elección de quién se va y la protección del último administrador.
- El aviso de la pantalla.
- El `Dockerfile` y el `docker-compose`: no hacen falta servicios ni pasos nuevos, que es
  justamente el punto.

## Riesgo conocido

Si algún día el backend corriera con más de una réplica, el trabajo se lanzaría una vez por
réplica. Hoy hay una sola instancia (`docker-compose.behind-proxy.yaml`, servicio `backend`).
Es idempotente, así que el daño sería trabajo repetido, no gente desactivada de más. Si llega
el día de escalar, la solución es un cerrojo en la base, y queda anotado aquí para no
redescubrirlo.
