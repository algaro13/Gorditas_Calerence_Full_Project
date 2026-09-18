## Why

Un restaurante que baja de plan conserva a todos sus usuarios. Hoy solo se le avisa, y **el aviso no tiene consecuencia**: si el administrador no hace nada, se queda indefinidamente usando más plazas de las que paga. La única presión es un recuadro que se puede ignorar para siempre.

Las dos salidas obvias son malas. Desactivar en el momento deja a un mesero fuera un lunes por la mañana, sin aviso y sin culpa suya. No hacer nada regala plazas.

Un plazo resuelve ambas: la decisión **se toma**, pero con tiempo, con nombre y con posibilidad de evitarla.

Hoy es buen momento: ningún restaurante tiene suscripción real todavía, así que nadie puede bajar de plan aún. Se arregla antes de que importe.

## What Changes

- El restaurante que excede su cupo entra en un **plazo de 15 días**. Se registra desde cuándo.
- Durante el plazo, el aviso es una **cuenta atrás que nombra a quien será desactivado** si nadie hace nada. El nombre se dice desde el primer día, para que el día 15 no sorprenda.
- Al vencer, un trabajo diario **desactiva los usuarios que sobran**, empezando por quienes llevan más tiempo sin entrar. Nunca al último administrador activo.
- El plazo **se cancela solo** en cuanto el restaurante vuelve a caber: porque desactivó a alguien, porque subió de plan, o porque alguien fue eliminado.
- Lo que hizo el sistema queda visible en la pantalla de personal, y se puede revertir reactivando, sujeto al cupo como cualquier reactivación.

## Capabilities

### Modified Capabilities
- `staff-management`: se añade el plazo y la resolución automática al vencer.
- `spa-staff-management`: el aviso pasa de advertencia sin fecha a cuenta atrás con nombre.

## Impact

- **Esquema**: `tenants` gana `sobre_cupo_desde` (timestamptz, nulo). Migración de Prisma.
- **Backend**: caso de uso que evalúa el cupo de un restaurante, y un trabajo diario que lo recorre.
- **Frontend**: `UsuariosPanel.tsx`, el aviso existente pasa a cuenta atrás.
- **API**: el estado del restaurante expone la fecha límite y a quién le tocaría.

## Decisiones tomadas

**Por qué el que lleva más tiempo sin entrar.** Casi siempre es la persona correcta: alguien que ya no usa el sistema. El dato se guarda en cada petición. Quien nunca entró va primero.

**Por qué 15 días.** Da margen para volver de vacaciones, hablar con el equipo o reconsiderar el plan, sin que el cobro quede desalineado un trimestre entero.

**Por qué nunca el último administrador.** Dejar un restaurante sin nadie que pueda administrarlo lo convierte en un problema de soporte, no en un ahorro. Si para caber haría falta quitarlo, se deja una plaza de más y se reporta.

## Fuera de alcance

**No se avisa por correo.** La aplicación no envía correo propio: los mensajes que salen hoy son plantillas de Zitadel, y montar ese camino es un cambio aparte. Significa que el aviso solo lo ve quien abra la pantalla de personal, y que un restaurante podría llegar al día 15 sin haberlo leído. Es la debilidad conocida de este cambio y el siguiente paso natural.
