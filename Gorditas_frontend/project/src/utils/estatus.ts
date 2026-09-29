/**
 * Cómo se lee un estatus en pantalla.
 *
 * El estatus viaja como identificador —`Recepcion`, `Preparacion`— y así se guarda y se compara;
 * cambiarlo rompería los datos y la API. Pero se mostraba tal cual, sin acento, en las pastillas
 * de Panel, Editar Orden, Surtir y Despachar, mientras otras pantallas escribían «En Recepción» a
 * mano. Aquí se traduce una sola vez, para mostrar; nunca para comparar.
 */
const ETIQUETAS: Record<string, string> = {
  Recepcion: 'Recepción',
  Preparacion: 'Preparación',
};

export const etiquetaDeEstatus = (estatus: string | undefined | null): string =>
  estatus ? (ETIQUETAS[estatus] ?? estatus) : '';

/**
 * Lo que hace el botón que lleva una orden a `destino`, en un verbo corto.
 *
 * El Panel mostraba el nombre del estatus siguiente recortado a cuatro letras —«Prep.», «Surt.»,
 * «Paga.»—, que no dice qué va a pasar al tocarlo. Un verbo cabe igual en un teléfono y sí lo dice.
 */
const ACCIONES: Record<string, string> = {
  Recepcion: 'Recibir',
  Preparacion: 'Preparar',
  Surtida: 'Surtir',
  Entregada: 'Entregar',
  Pagada: 'Cobrar',
};

export const accionHacia = (destino: string): string => ACCIONES[destino] ?? etiquetaDeEstatus(destino);
