## Why

Un restaurante que baja de plan conserva a todos sus usuarios: el tope baja, pero nadie es desactivado y solo se bloquean las altas nuevas. Comprobado con una prueba y en pantalla.

Hoy eso se comunica mal. La pantalla de personal dice *«4 activos de 3 permitidos en tu plan»*, en el mismo tono gris con que explica que los usuarios reciben un correo. Es una frase contradictoria que no dice si algo está roto, si alguien va a dejar de entrar, ni qué hacer. Y el botón de invitar sigue ofreciéndose como si nada, para fallar al enviar.

La decisión tomada es **avisar y dejar pasar**: nadie es expulsado automáticamente. Desactivar gente sin avisar dejaría a un mesero fuera un lunes por la mañana, y obligar a resolverlo antes de bajar no es posible porque el cambio de plan ocurre en el portal de Stripe, fuera de la aplicación.

Pero si se deja pasar, el aviso tiene que ser claro y accionable, o el restaurante se queda indefinidamente usando más plazas de las que paga sin enterarse.

## What Changes

- La pantalla de personal SEÑALA de forma destacada cuándo el restaurante excede su plan, diciendo cuántas plazas sobran y qué hacer: desactivar usuarios o subir de plan.
- Mientras excede, el formulario de invitación no se ofrece: hoy se puede abrir y rellenar para fallar al enviar.
- Se agrega una consulta para saber qué restaurantes están por encima de su tope, que es la contraparte operativa del aviso.

## Capabilities

### Modified Capabilities
- `spa-staff-management`: el panel gana un estado explícito para «por encima del cupo».

## Impact

- **Frontend**: `src/components/UsuariosPanel.tsx`.
- **Sin cambios de backend**: el límite ya se aplica correctamente al dar de alta y al reactivar; esto es solo cómo se comunica.
- **Sin cambios de esquema ni de contrato del API.**

## Fuera de alcance

No se desactiva a nadie automáticamente ni se bloquea el uso del sistema a quien ya está dentro. Es la decisión de producto, no una omisión.
