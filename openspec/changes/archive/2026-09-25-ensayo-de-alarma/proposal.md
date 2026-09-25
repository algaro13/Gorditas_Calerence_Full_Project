# Ensayar también la alarma, no sólo la restauración

## Por qué

El spec ya obliga a que el respaldo avise cuando deja de ocurrir, y a ensayar la
**restauración** dejando constancia del tiempo medido. Pero no dice nada de ensayar el
**aviso**.

Esa asimetría no se sostiene. Todo el sistema de respaldo descansa sobre el vigilante: es lo
único que convierte «el respaldo dejó de ocurrir» en «alguien se entera». Si ese camino está
roto —la URL cambió, el margen quedó mal, el `curl` falla en silencio— el resultado no es un
error visible, es **silencio**, que es indistinguible de que todo va bien. Y precisamente por
eso nadie lo descubriría hasta necesitar un respaldo que no existe.

Es el mismo argumento que justificó el ensayo de recuperación: un respaldo que nunca se ha
restaurado es una hipótesis. Una alarma que nunca ha sonado, también.

El ensayo ya se hizo y está documentado (`docs/recuperacion.md`, §5, 25 de septiembre de
2026). Lo que falta es que sea una obligación del spec y no una buena costumbre, para que la
próxima vez que alguien toque el vigilante o el margen de frescura tenga que volver a
comprobarlo.

## Qué cambia

Se extiende el requisito **Recovery rehearsal** para que cubra las dos rutas, no sólo la de
restaurar:

- El camino de aviso se ensaya igual que el de restauración, y `docs/recuperacion.md` deja
  constancia de cuándo se hizo y con qué resultado.
- El ensayo debe poder hacerse **sin detener el volcado ni perturbar el respaldo programado**.
  Esto no es un detalle de comodidad: si ejercitar la alarma exigiera parar los respaldos de
  verdad, nadie lo haría, y el requisito quedaría en papel mojado.

## Qué no cambia

- El comportamiento del aviso, que ya está especificado en *Backup failure alerting*.
- El ensayo de restauración y el tiempo medido.
- El código: la vía contenida para ejercitarlo ya existe (una corrida a mano con el margen de
  frescura a cero) y ya está documentada.
