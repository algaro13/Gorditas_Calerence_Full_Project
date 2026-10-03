# Bajar de plan dice qué pasa con los usuarios que sobran

## Por qué

Al revisar si el administrador sabe qué hacer con su suscripción quedaron dos huecos, los dos sobre
el cupo de usuarios:

1. **Bajar de plan no advierte nada.** Con 5 usuarios activos, cambiar de Profesional a Básico
   (cupo de 3) se confirma igual que subir. Nadie pierde el acceso en el momento —se abre un plazo
   de 15 días (`DIAS_SOBRE_CUPO`) y al vencer el sistema desactiva a quien lleve más tiempo sin
   entrar—, pero quien confirma no se entera de nada de eso.
2. **La pantalla de Suscripción no cuenta el plazo.** Con más usuarios que cupo solo dice «Llegaste
   al límite de tu plan». La fecha y los nombres de quien se iría solo aparecen en Catálogos →
   Usuarios.

Además faltaba una guía de lo que hay que configurar en Stripe y en el servidor para cobrar de
verdad.

## Qué cambia

- **La confirmación de cambio de plan advierte** cuando el plan elegido permite menos usuarios de
  los activos: cuántos sobran, que nadie pierde el acceso al cambiar, que hay N días para ajustarlo
  y a quién desactivará el sistema primero. Los días salen del backend (`GET /api/billing/status`
  añade `diasSobreCupo`), no se escriben en la pantalla.
- **La pantalla de Suscripción muestra el mismo aviso de cupo que Catálogos**: fecha límite, días
  que quedan y nombres de quien se desactivaría, con el enlace para ajustarlo. El aviso pasa a ser
  un componente compartido que lee `GET /api/usuarios/cupo`, así que las dos pantallas no pueden
  decir cosas distintas.
- **`docs/stripe-produccion.md`**: los pasos para pasar de modo test a cobrar de verdad.

## Qué no cambia

Las reglas del cupo: el plazo, el orden en que se elige y que nunca se toca al último Admin.

## Criterios de aceptación

1. Con más usuarios activos que el cupo del plan elegido, la confirmación lo advierte con los días
   de plazo; con menos o igual, no.
2. Con el restaurante por encima del cupo, `/suscripcion` muestra la fecha límite y a quién se
   desactivaría, igual que Catálogos.
3. Catálogos sigue mostrando su aviso como antes.
4. Existe la guía de producción.
5. Suites del backend y de navegador en verde.
