import type { Page } from '@playwright/test';

/**
 * El periodo, ensanchado a mano.
 *
 * Nacio por un fallo —el reporte abria en «hoy» calculado en UTC y desde las 18:00 en Mexico
 * pedia el dia siguiente—, pero eso ya esta arreglado y lo comprueba la ultima prueba de este
 * archivo.
 *
 * Se conserva por otra razon: estas pruebas necesitan un dia con ventas, y el dia de hoy puede
 * no tener ninguna segun cuando se corran. Se pide una semana, que contiene al dia que tenga
 * datos caiga donde caiga. Quitarlo las dejaria dependiendo de que otra prueba de la suite haya
 * creado una orden antes, que es una atadura invisible entre archivos.
 */
export async function periodoAmplio(page: Page) {
  const dia = (desplazamiento: number) => {
    const d = new Date();
    d.setDate(d.getDate() + desplazamiento);
    return d.toISOString().slice(0, 10);
  };
  const fechas = page.locator('input[type="date"]');
  await fechas.nth(0).fill(dia(-7));
  await fechas.nth(1).fill(dia(1));
  await page.waitForTimeout(1500);
}
