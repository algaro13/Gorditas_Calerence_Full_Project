/**
 * Datos del aviso de privacidad y de los términos del servicio.
 *
 * `VERSION_LEGAL` identifica los textos que se aceptan al registrarse: el backend la guarda en el
 * restaurante. Si cambia el contenido de cualquiera de los dos documentos, cambia la fecha.
 *
 * Los valores entre corchetes son de ejemplo: los completa el responsable y los revisa un abogado.
 * Mientras quede alguno, las páginas se muestran como borrador.
 */
export const VERSION_LEGAL = '2026-10-05';

export const DATOS_LEGALES = {
  responsable: '[NOMBRE O RAZÓN SOCIAL DEL RESPONSABLE]',
  rfc: '[RFC]',
  domicilio: '[CALLE, NÚMERO, COLONIA, CÓDIGO POSTAL, MUNICIPIO, ESTADO, MÉXICO]',
  correoPrivacidad: '[privacidad@ejemplo.com]',
  correoContacto: '[contacto@ejemplo.com]',
  hospedaje: '[PROVEEDOR DE SERVIDORES Y PAÍS]',
  respaldos: '[PROVEEDOR DE RESPALDOS Y PAÍS]',
  correo: '[PROVEEDOR DE ENVÍO DE CORREO]',
  ivaEnPrecios: '[incluyen / no incluyen]',
  facturacionFiscal: '[CÓMO SE SOLICITA LA FACTURA FISCAL (CFDI) DE LA SUSCRIPCIÓN]',
  limiteResponsabilidad: '[12]',
  jurisdiccion: '[CIUDAD, ESTADO]',
} as const;

export const ES_BORRADOR = Object.values(DATOS_LEGALES).some((v) => v.startsWith('['));

/** «5 de octubre de 2026». */
export const fechaDeVersion = (): string =>
  new Date(`${VERSION_LEGAL}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
