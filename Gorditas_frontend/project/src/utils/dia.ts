/**
 * Qué día es hoy, para el restaurante.
 *
 * Antes cada pantalla lo calculaba con `new Date().toISOString().split('T')[0]`, que devuelve la
 * fecha en UTC. En México son seis horas de más: a las 18:04 del 25 ya decía 26, así que el
 * reporte del día salía en ceros durante toda la cena y el dinero que se agregaba a la caja
 * quedaba archivado bajo el día siguiente.
 *
 * La zona la manda el backend en `GET /api/tenants/me`, que es la misma con la que agrupa los
 * reportes. Preguntársela evita que la pantalla pida un día que el backend no va a agrupar
 * nunca.
 */

/** `YYYY-MM-DD` del día en curso en la zona dada. */
export function diaEn(zona: string | null | undefined, momento: Date = new Date()): string {
  // `en-CA` formatea como aaaa-mm-dd, que es justo lo que esperan los campos de fecha y la API.
  // Se prefiere sobre componer el texto a mano porque el relleno con ceros y los cambios de
  // horario ya los resuelve `Intl`.
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: zona || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(momento);
  } catch {
    // Una zona que el navegador no reconozca no puede dejar la pantalla sin fecha: se cae a la
    // del propio navegador, que sigue siendo mejor suposición que UTC.
    return diaEn(null, momento);
  }
}
