# Consola de plataforma, fase 2: avisar, archivar y borrar cuentas abandonadas

## Por qué

La fase 1 mostró cuántos restaurantes dejaron de usar el sistema y desde cuándo. Guardar para
siempre los datos de cuentas abandonadas no se justifica, y la ley de datos personales (LFPDPPP,
2025) pide conservarlos solo mientras sean necesarios y bloquearlos antes de suprimirlos. Al mismo
tiempo, las ventas de un restaurante son su contabilidad: borrarlas sin aviso ni oportunidad de
volver sería un daño.

Los profesionales lo resuelven con avisos escalonados antes de borrar (Mailjet, Zoho, Google), con
una forma fácil de conservar la cuenta, y con borrado en dos pasos: primero bloquear, después
borrar. Las decisiones del dueño del producto: los plazos de abajo, 30 días para recuperar una
cuenta archivada, y **el borrado definitivo lo aprueba él** en la consola.

## Qué cambia

**Plazos** (días sin uso: desde la última orden o el último acceso, lo más reciente):

| Cuenta | Primer aviso | Segundo aviso | Se archiva |
|---|---|---|---|
| De pago, pago pendiente o plan sin Stripe | nunca | nunca | nunca |
| Prueba que nunca pagó | 30 | 60 | 90 |
| Pagó alguna vez y canceló | 365 | 395 | 425 |

- **En orden y con margen**: el segundo aviso solo sale si salió el primero, y se archiva solo si
  salió el segundo; entre paso y paso pasan al menos 7 días aunque el trabajo se haya saltado días.
  Volver a usar el sistema reinicia el ciclo.
- **Los avisos** van a los administradores activos con correo real, en español, con la fecha en que
  se archivaría, un enlace para entrar (con eso basta para conservarla) y otro a Reportes para
  descargar sus datos en Excel.
- **Archivar** bloquea el restaurante (`archivado_at`) sin borrar nada. Quien entra ve que está
  archivado; su administrador lo recupera con un botón durante 30 días. Se avisa por correo con la
  fecha límite.
- **Borrar** solo lo hace el operador desde la consola, solo con el restaurante archivado y pasados
  los 30 días, escribiendo su subdominio para confirmar. Borra sus datos (en cascada), su
  organización en Zitadel y su carpeta de archivos. En la bitácora quedan quién lo borró, cuándo y
  los datos básicos del restaurante. Los cobros siguen en Stripe.
- **La consola** muestra la fase de cada restaurante (aviso 1, aviso 2, archivado, listo para
  borrar), y permite restaurar uno archivado, pausar el ciclo para uno y aprobar el borrado. Cada
  acción queda en la bitácora.
- Un trabajo diario más, `revisar-inactividad`, como los otros dos.

## Qué no cambia

Las cuentas que pagan no se tocan nunca. El aviso de fin de prueba sigue igual.

## Pendiente fuera del código

El aviso de privacidad debe decir estos plazos. Conviene que lo revise un abogado antes de activar
el borrado en producción.

## Criterios de aceptación

1. Una prueba sin pagar recibe el primer aviso a los 30 días sin uso, el segundo a los 60 y se
   archiva a los 90, cada paso una sola vez y en orden.
2. Una cuenta que paga no recibe nada, por mucho que lleve sin uso.
3. Un restaurante archivado no opera; su administrador lo recupera con un botón y vuelve todo.
4. El operador no puede borrar antes de los 30 días ni un restaurante que no esté archivado; al
   borrar desaparecen sus datos y su organización, y queda en la bitácora.
5. Suites del backend y de navegador en verde.
