# La caja, fuera del navegador

## Por qué

El dinero de la caja se guarda así:

```ts
localStorage.setItem('montoCajaPorFecha', JSON.stringify(nuevosMontos));
```

Y de ahí sale «Total Caja», y de ahí sale la utilidad del día: `(Ventas + Caja) - Gastos`. O
sea que una cifra que el reporte presenta como un dato del negocio en realidad vive en un solo
navegador.

Las consecuencias no son teóricas:

- **No se comparte.** El encargado anota la caja en su teléfono y en la tablet del mostrador
  sigue en cero. Dos personas ven dos utilidades distintas del mismo día.
- **No se respalda.** El respaldo cifrado que corre cada seis horas se lleva la base y los
  secretos. Esto no está en la base, así que no está en el respaldo.
- **Se borra solo.** Limpiar el navegador, cambiar de teléfono o entrar en incógnito la deja en
  cero, sin aviso y sin manera de recuperarla.
- **No es del restaurante.** Si dos restaurantes se abren en el mismo navegador, comparten la
  misma llave de `localStorage`: la caja de uno aparece en el reporte del otro.

Lo último es el peor: es una fuga entre inquilinos en un sistema que cifra, aísla por RLS y
prueba ese aislamiento.

## Qué cambia

La caja pasa a la base, como todo lo demás: una fila por restaurante y día, con su política de
aislamiento como el resto de las tablas.

Dos rutas nuevas en el módulo de reportes, con el mismo permiso que ya tiene la pantalla
—Encargado o Admin—: una para leer los montos de un período y otra para fijar el de un día.

La pantalla no cambia de forma. Donde leía y escribía en `localStorage`, ahora pregunta y manda
al servidor.

## Lo que hay que cuidar

- **Lo que ya hay anotado.** Si esto se despliega tal cual, las cantidades que alguien tenga en
  su navegador desaparecen del reporte. Así que la primera vez se suben al servidor, y solo para
  los días que el servidor no conozca todavía. El original no se borra: se conserva bajo otra
  llave por si hiciera falta mirarlo.
- **El día es el del negocio**, el mismo que ya usa el reporte. La columna es una fecha sin
  hora, para que no haya zona que interpretar.
- **La utilidad del día** sale de sumar la caja a las ventas. Tiene que seguir cuadrando con lo
  que muestre cada tarjeta.

## Qué no cambia

- Lo que significa la caja ni cómo se calcula la utilidad.
- La forma de la pantalla: el mismo recuadro y el mismo lápiz en cada día.
