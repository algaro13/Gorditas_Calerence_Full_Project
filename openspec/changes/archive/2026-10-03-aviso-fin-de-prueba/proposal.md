# Avisar por correo que la prueba se acaba

## Por qué

La prueba de 14 días la maneja la app, no Stripe, así que nadie avisa por correo de que se termina.
El panel lo dice —en rojo los últimos 3 días—, pero solo a quien entra. Un administrador que deja de
abrir el sistema unos días se entera cuando el punto de venta ya está en pausa.

Se decidió mantener la prueba en 14 días (no acortarla) y trabajar en que llegue al valor y no se le
pase la fecha. Este cambio es lo segundo.

## Qué cambia

- **Dos correos**, a los administradores activos del restaurante con correo real:
  - **«Tu prueba termina el …»** cuando faltan 3 días o menos.
  - **«Tu prueba terminó»** cuando ya venció, solo si venció hace 7 días o menos: al desplegar no
    se escribe a restaurantes cuya prueba terminó hace meses.
- **Nunca dos veces**: cada envío queda registrado con la fecha de fin de la prueba (tabla de
  plataforma `avisos_enviados`). Si un día se extiende una prueba, la fecha nueva merece su aviso.
  Si el envío falla no se registra, y el trabajo lo reintenta en su próxima corrida.
- **Un trabajo diario más** en el backend (`avisar-pruebas`), igual que `evaluar-cupos`: sin cron.
- **El backend aprende a mandar correo** por SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASSWORD`, `SMTP_FROM`). En local y en el VPS va a Mailpit —que en el VPS retransmite al
  proveedor real salvo para los restaurantes de prueba—; en producción, al mismo proveedor que
  Zitadel. Sin `SMTP_HOST`, el correo solo se escribe en el registro, para no romper nada.
- **El contenido**: en español, con el nombre del restaurante, la fecha en la zona del negocio, los
  planes con su precio y un enlace a `https://<restaurante>.<dominio>/planes`. El de vencida
  repite que los datos están intactos.

## Qué no cambia

La duración de la prueba, el bloqueo al vencer y los avisos del panel.

## Criterios de aceptación

1. Con la prueba a 3 días o menos, los administradores reciben «Tu prueba termina el …» una vez.
2. Al vencer, reciben «Tu prueba terminó» una vez; con más de 7 días de vencida, nada.
3. Un restaurante que ya contrató, o un miembro que no es Admin, no recibe nada.
4. En local el correo llega a Mailpit con el enlace correcto.
5. Suites del backend y de navegador en verde.
