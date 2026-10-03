# Consola de plataforma (fase 1: solo lectura)

## Por qué

No hay forma de saber, sin entrar a la base de datos o a Stripe, cuántos restaurantes hay, cuántos
pagan y en qué plan, cuántos siguen en prueba, cuáles dejaron de usar el sistema y desde cuándo.
Es lo primero que necesita quien opera un SaaS, y la base para decidir después qué hacer con las
cuentas abandonadas (fase 2: avisos y borrado).

Los datos ya existen: plan y estado en `tenants`, último acceso de cada persona en
`tenant_users.last_seen_at`, fecha de cada orden en `ordenes`. Falta reunirlos y dárselos solo a
quien opera la plataforma.

## Cómo lo hacen los profesionales (y qué se toma de ahí)

- **Pocas métricas, bien elegidas**: suscriptores por plan, prueba frente a pago, conversión de
  prueba a pago, ingreso mensual recurrente y una señal de uso por cliente para ver quién se está
  yendo antes de que cancele.
- **Consola separada y con mínimo privilegio**: solo para el operador, que ve números y estados y
  no entra a los datos de los restaurantes. Fase 1 es de solo lectura.
- **Bitácora**: cada consulta del operador queda registrada.

## Qué cambia

- **Rol «Plataforma» en Zitadel**, válido solo en la organización de la plataforma
  (`ZITADEL_DEFAULT_ORG_ID`), no en la de ningún restaurante. Los restaurantes reciben del proyecto
  solo sus cinco roles, así que no pueden concederlo; aun así, el backend exige las dos cosas: el
  rol y que el token sea de esa organización.
- **`scripts/crear-operador.ts`**: crea (o reutiliza) el usuario operador en esa organización y le
  da el rol. El bootstrap crea el rol en instalaciones nuevas.
- **`GET /api/plataforma/acceso`** (público): la organización con la que se inicia sesión como
  operador. **`GET /api/plataforma/resumen`** (solo operador): las métricas y una fila por
  restaurante.
- **Las métricas**:
  - restaurantes por situación: en prueba, prueba vencida, de pago (por plan), pago pendiente,
    cancelados, y con plan asignado sin suscripción en Stripe;
  - ingreso mensual recurrente: la suma de los precios del catálogo de las suscripciones vivas;
  - conversión: de los restaurantes cuya prueba ya terminó, cuántos llegaron a pagar;
  - actividad: cuántos se usaron en los últimos 7 días, de 8 a 30, de 31 a 90 y hace más de 90.
- **Por restaurante**: plan, situación, alta, fin de prueba o renovación, usuarios activos, último
  acceso, última orden, órdenes de los últimos 30 días y **días sin uso** (desde la última orden o
  el último acceso, lo más reciente; si nunca hubo, desde el alta).
- **Bitácora `bitacora_plataforma`**: quién consultó qué y cuándo.
- **Pantalla `/plataforma`** con su propio «Entrar como operador», tarjetas con los números y la
  lista de restaurantes con filtros por situación e inactividad, ordenable por días sin uso.
  Pensada para el teléfono: tarjetas, no una tabla ancha.

## Qué no cambia

Nada de los restaurantes: la consola solo lee. No borra, no avisa, no entra a sus pantallas.

## Criterios de aceptación

1. Un operador entra a `/plataforma` y ve los números y la lista con datos reales.
2. Un administrador de restaurante, o un token con el rol «Plataforma» de otra organización,
   recibe 403.
3. Cada consulta queda en la bitácora.
4. Los días sin uso y las situaciones salen bien en los casos límite (nunca usado, prueba vencida,
   plan sin Stripe).
5. Suites del backend y de navegador en verde.
