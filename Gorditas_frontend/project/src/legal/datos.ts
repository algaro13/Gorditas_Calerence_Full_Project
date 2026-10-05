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
  // Persona física: su nombre completo. Si después opera una sociedad, va su razón social.
  responsable: 'Alfredo Gallegos Rodríguez',
  domicilio: 'C. Cantera 700, Parque la Talaverna, 66473 San Nicolás de los Garza, N.L., México',
  correoPrivacidad: '[privacidad@ejemplo.com]',
  correoContacto: '[contacto@ejemplo.com]',
  hospedaje: 'Contabo (servidores en Estados Unidos)',
  respaldos: 'Cloudflare, con su servicio R2',
  correo: '[PROVEEDOR DE ENVÍO DE CORREO]',
  ivaEnPrecios: '[incluyen / no incluyen]',
  facturacionFiscal: '[CÓMO SE SOLICITA LA FACTURA FISCAL (CFDI) DE LA SUSCRIPCIÓN]',
  limiteResponsabilidad: '12',
  jurisdiccion: 'Monterrey, Nuevo León',
} as const;

export const ES_BORRADOR = Object.values(DATOS_LEGALES).some((v) => v.startsWith('['));

/** «5 de octubre de 2026». */
export const fechaDeVersion = (): string =>
  new Date(`${VERSION_LEGAL}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
