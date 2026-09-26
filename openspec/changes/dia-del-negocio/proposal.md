# El día del reporte es el día del negocio

## Por qué

A las 18:04 hora de México, la pantalla de Reportes pedía el **26 de septiembre**. Eran las seis
de la tarde del 25. El reporte del día salía en ceros justo en la franja de la cena, que es
cuando se consulta.

La causa está en tres líneas que calculan «hoy» en UTC:

```ts
const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
```

`toISOString()` devuelve la fecha en UTC. En México son seis horas de más, así que a partir de
las 18:00 locales el día ya cambió para el reloj de Greenwich y no para el restaurante.

El backend hace bien su parte: recibe la zona horaria del negocio y agrupa con
`to_char(o.fecha_hora AT TIME ZONE ${tz})`. Hay una prueba que lo comprueba —una orden de las
03:30Z del 6 cuenta como día 5 en CDMX—. El desacuerdo es solo del frontend, que pide un día que
el backend nunca va a agrupar.

**Y no es solo el filtro.** La misma función calcula la fecha bajo la que se guarda el dinero
de la caja:

```ts
const obtenerFechaActualUTC = (): string => new Date().toISOString().split('T')[0];
```

Después de las 18:00, agregar dinero a la caja lo archiva bajo el día siguiente. La fila del
día real se queda en cero y la cantidad reaparece sola al día siguiente. Eso no es un problema
de presentación: es dinero anotado en el día equivocado.

## Qué cambia

La zona horaria del negocio deja de ser un secreto del backend. `GET /api/tenants/me` la
devuelve, y el SPA la guarda junto al restaurante.

Reportes calcula «hoy» en esa zona, con `Intl`, tanto para el filtro por omisión como para la
fecha de la caja. Si por lo que sea no llega ninguna zona, se usa la del navegador, que es
siempre mejor suposición que UTC.

## Lo que hay que cuidar

- **La caja ya guardada.** Vive en `localStorage` con la fecha como llave. Las cantidades que se
  guardaron bajo un día equivocado siguen donde están; esto arregla las siguientes, no reescribe
  las anteriores.
- **Las pruebas de navegador ensanchan el período a mano** con `periodoAmplio`, precisamente
  para no depender de este fallo. Con el día correcto, esa función sobra.

## Qué no cambia

- El backend sigue agrupando como agrupaba. Lo único que hace de más es decir en qué zona.
- El rango que el usuario elija a mano.
