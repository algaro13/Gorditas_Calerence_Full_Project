# Estándar de interfaz

Un conjunto **cerrado** de tamaños. Si algo no está aquí, no se inventa: se discute y se añade.

La razón de que sea cerrado: cuando cada componente elegía su tamaño, de 161 botones **136
quedaron por debajo del mínimo táctil**, y las peores pantallas resultaron ser las del servicio
—las que se usan con prisa— mientras que las de configuración estaban bien.

## Botones

| Clase | Alto | Letra | Cuándo |
|---|---|---|---|
| `btn btn-min` | 44 px | 14 px | El suelo. Solo donde de verdad no cabe el normal |
| `btn` | 48 px | 16 px | Lo normal |
| `btn btn-lg` | 56 px | 20 px | La acción principal de una pantalla de servicio |

Todos traen ancho mínimo de 44 px, porque un botón de solo icono también se toca con el dedo.

```jsx
<button className="btn btn-lg w-full bg-orange-600 text-white hover:bg-orange-700">
  <Plus className="w-5 h-5" />
  <span className="hidden sm:inline">Agregar Platillo</span>
  <span className="sm:hidden">Platillo</span>
</button>
```

Fíjate en las etiquetas: **cada una en su propio nodo de texto, completa**. Un botón es
contenedor flex, y flex descarta el espacio entre elementos hermanos; confiar la separación a un
espacio al final de un `<span>` produce «AgregarPlatillo». Ya pasó.

## Campos

| Clase | Alto | Letra |
|---|---|---|
| `campo` | 48 px | 16 px |
| `campo-multilinea` | 48 px mínimo | 16 px |
| `etiqueta` | — | 14 px |
| `casilla` | 44 px de objetivo, caja de 24 | 16 px |

Una sola altura a propósito: un formulario con campos de alturas distintas se lee peor y no hay
ninguna razón de uso para variarlos.

**Los 16 px no son estéticos.** Por debajo de eso, Safari en iOS acerca la pantalla al enfocar
el campo y descuadra la página. Es la razón de que el mínimo sea ese y no 14.

```jsx
<label className="etiqueta">Nombre del cliente</label>
<input className="campo" />

<label className="casilla">
  <input type="checkbox" /> Mesa pagada
</label>
```

La casilla y su texto van dentro de la misma `<label>` a propósito: la caja se queda en 24 px
—agrandarla desencaja el texto— y el objetivo que responde al dedo es la etiqueta entera.

## Espaciado

`sp-1` 8 · `sp-2` 12 · `sp-3` 16 · `sp-4` 24 · `sp-5` 32 · `sp-6` 48

Se usan como cualquier utilidad de Tailwind: `gap-sp-1`, `p-sp-3`, `mt-sp-4`.

**No hay valores de 2 ni 4 px.** Ese fue el origen de los diez objetivos que se midieron a menos
de 8 px unos de otros, y los objetivos pequeños necesitan *más* separación, no menos.

## Letras

| Clase | Tamaño | Para |
|---|---|---|
| `text-meta` | 14 px | Etiquetas y apoyo. **Nunca texto corrido** |
| `text-cuerpo` | 16 px | Lo normal |
| `text-titulo` | 20 px | Encabezado de sección |
| `text-pantalla` | 28 px | Título de pantalla |

Los nombres son por función, no por medida: si mañana el mínimo cambia, se cambia en
`tailwind.config.js` y no en cada pantalla.

**Nada por debajo de 14 px, y el texto corrido en 16.** Llegó a haber `text-[8px]` en pantallas
de servicio; a la distancia a la que se sostiene un teléfono eso no se lee.

## De dónde salen los números

| Referencia | Mínimo |
|---|---|
| Apple HIG | 44 × 44 pt |
| Material Design | 48 × 48 dp |
| WCAG 2.5.5 (AAA) | 44 × 44 px |
| WCAG 2.5.8 (AA) | 24 × 24 px — el piso de cumplimiento |
| NN/g | 1 cm × 1 cm físico |

El dedo promedio mide 1.6–2 cm y el pulgar 2.5 cm (MIT Touch Lab). Y los objetivos de la zona
baja de la pantalla se aciertan entre un 30 y un 50 % más que los de arriba, algo a tener en
cuenta al colocar la acción principal.

## Las pantallas que ya existen

No están migradas. Las cubre una capa en `src/index.css` que, por debajo de 640 px, sube el
texto a 16 px y lleva todo control a 44 px. **Es una red de seguridad, no el estándar**: sirve
para que lo ya escrito no estorbe hoy, no para escribir lo de mañana.

Al tocar una pantalla por otro motivo, conviene pasarla a estas clases. Una migración masiva de
13.000 líneas no la puede revisar nadie, y la capa ya evita el daño mientras tanto.
