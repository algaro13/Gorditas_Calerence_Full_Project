import { test, expect } from '@playwright/test';

/**
 * Que un reporte se pueda leer en un teléfono.
 *
 * Era la pantalla con más tabla del sistema: ocho, medidas a 375 px. La de órdenes del día
 * llegaba a 577 px —se salía más que el ancho entero de la pantalla— y dentro de una de sus
 * celdas vivían otras tres con su propio arrastre lateral. Como en el resto del sistema, la
 * columna que quedaba fuera era «Acciones».
 */


/**
 * El periodo, ensanchado a mano.
 *
 * El reporte arranca en «hoy» calculado en UTC, asi que a partir de las 18:00 en Mexico ya pide
 * el dia siguiente y sale vacio. La suite tardo lo justo para cruzar esa medianoche y estas
 * pruebas pasaron de verdes a rojas sin que nada cambiara en el codigo.
 *
 * El fallo es de la pantalla, no de la prueba, y va por separado. Aqui solo se evita depender
 * del reloj: se pide una semana, que contiene al dia que tenga datos caiga donde caiga.
 */
async function periodoAmplio(page: import('@playwright/test').Page) {
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

const PESTANAS = ['Ventas', 'Inventario', 'Productos Vendidos', 'Gastos'];

test('ninguna pestaña de reportes obliga a arrastrar de lado', async ({ page }) => {
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');

  for (const pestana of PESTANAS) {
    await page.getByRole('button', { name: pestana, exact: true }).click();
    await page.waitForTimeout(800);

    const problemas = await page.evaluate(() => {
      const salida: string[] = [];
      const ancho = window.innerWidth;

      // Nada dibujado más allá del borde.
      document.querySelectorAll('main *').forEach((e) => {
        if (e.getBoundingClientRect().right > ancho + 1) {
          salida.push(`«${(e as HTMLElement).innerText?.trim().slice(0, 20)}» se sale`);
        }
      });

      // Y ningún contenedor que se arrastre por dentro, que es la forma de esconder lo mismo.
      document.querySelectorAll('main *').forEach((e) => {
        if (e.scrollWidth > e.clientWidth + 4 && e.clientWidth > 80) {
          salida.push(`«${(e as HTMLElement).innerText?.trim().slice(0, 20)}» se arrastra`);
        }
      });

      return salida;
    });

    expect(problemas, `en la pestaña ${pestana}`).toEqual([]);
  }
});

test('las órdenes del día y su detalle se leen sin tabla en el teléfono', async ({ page }) => {
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');

  await periodoAmplio(page);

  const verOrdenes = page.getByRole('button', { name: /ver órdenes/i }).first();
  await expect(verOrdenes).toBeVisible({ timeout: 15_000 });
  await verOrdenes.click();

  const verDetalles = page.getByRole('button', { name: /ver detalles/i }).first();
  await expect(verDetalles).toBeVisible({ timeout: 10_000 });
  await verDetalles.click();

  // El detalle se abre en su sitio y trae sus apartados escritos.
  await expect(page.getByText('Productos', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /ocultar/i }).first()).toBeVisible();

  // Y sigue sin haber tabla ninguna a este ancho: eran tres anidadas dentro de otra.
  const tablas = await page.evaluate(
    () => [...document.querySelectorAll('table')].filter((t) => t.offsetParent !== null).length
  );
  expect(tablas, 'quedó una tabla visible en el teléfono').toBe(0);
});

test('el monto de caja se edita desde la tarjeta y cuadra con el total', async ({ page }) => {
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');

  await periodoAmplio(page);

  // Es el único dato que se escribe desde este reporte, y vivía dentro de una celda de la
  // tabla. Al pasar a tarjetas es lo que más fácil se rompe sin que se note.
  // Se apunta a lo que se ve. Las dos presentaciones existen en el documento a la vez y la
  // tabla lleva los mismos nombres; un `.first()` a ciegas acertaría hoy por el orden del DOM y
  // dejaría de acertar el día que cambie.
  const visible = (nombre: string) =>
    page.getByRole('button', { name: nombre }).locator('visible=true');

  const editar = visible('Editar monto de caja');
  await expect(editar).toBeVisible({ timeout: 15_000 });
  await editar.click();

  const campo = page.getByLabel('Monto de caja').locator('visible=true');
  await campo.fill('150');
  await visible('Confirmar monto').click();

  // El total de arriba tiene que moverse con él: son el mismo dato.
  await expect(page.getByText('$150.00').first()).toBeVisible({ timeout: 10_000 });

  // Se deja como estaba, que la prueba corre contra datos compartidos.
  await editar.click();
  await campo.fill('0');
  await visible('Confirmar monto').click();
  await expect(page.getByText('Hoy: $0.00')).toBeVisible({ timeout: 10_000 });
});
