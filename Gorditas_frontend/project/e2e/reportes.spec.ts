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
 * Nacio por un fallo —el reporte abria en «hoy» calculado en UTC y desde las 18:00 en Mexico
 * pedia el dia siguiente—, pero eso ya esta arreglado y lo comprueba la ultima prueba de este
 * archivo.
 *
 * Se conserva por otra razon: estas pruebas necesitan un dia con ventas, y el dia de hoy puede
 * no tener ninguna segun cuando se corran. Se pide una semana, que contiene al dia que tenga
 * datos caiga donde caiga. Quitarlo las dejaria dependiendo de que otra prueba de la suite haya
 * creado una orden antes, que es una atadura invisible entre archivos.
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
    page.getByRole('button', { name: nombre }).locator('visible=true').first();

  // El primero: el periodo abarca varios dias y cada uno trae su tarjeta con su propia caja.
  const editar = visible('Editar monto de caja');
  await expect(editar).toBeVisible({ timeout: 15_000 });
  await editar.click();

  const campo = page.getByLabel('Monto de caja').locator('visible=true').first();

  // Una cifra que no pueda confundirse con ningun total de la pantalla: asi la comprobacion
  // dice algo aunque las ventas del dia cambien de una corrida a otra.
  await campo.fill('137.13');
  await visible('Confirmar monto').click();

  // El total de arriba tiene que moverse con el: son el mismo dato.
  await expect(page.getByText('$137.13').first()).toBeVisible({ timeout: 10_000 });

  // Se deja como estaba, que la prueba corre contra datos compartidos. Y se comprueba que la
  // devolucion ocurrio: sin esto, la siguiente corrida arrastraria la cifra de esta.
  await editar.click();
  await campo.fill('0');
  await visible('Confirmar monto').click();
  await expect(page.getByText('$137.13')).toHaveCount(0, { timeout: 10_000 });
});

/**
 * Que el detalle de una orden muestre lo que se vendió en ella.
 *
 * Durante meses dijo «No hay platillos.» en todas. El vínculo entre la orden y sus platillos se
 * adivinaba comparando los siete primeros caracteres de dos identificadores —algo que funcionaba
 * con ObjectId de Mongo y con UUID no acierta nunca—, así que el reporte afirmaba que en ninguna
 * orden se había vendido nada. La tabla lo escondía; las tarjetas lo pusieron por escrito.
 *
 * Contar líneas no bastaría: lo que se rompió fue el vínculo. Por eso se comprueba que los
 * importes del detalle sumen el total de su orden.
 */
test('el detalle de una orden muestra sus platillos y cuadra con su total', async ({ page }) => {
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');
  await periodoAmplio(page);

  await page.getByRole('button', { name: /ver órdenes/i }).first().click();

  const detalles = page.getByRole('button', { name: /ver detalles/i });
  const cuantas = Math.min(await detalles.count(), 5);
  expect(cuantas, 'no había ninguna orden que mirar').toBeGreaterThan(0);

  const cuadran: string[] = [];

  for (let i = 0; i < cuantas; i++) {
    await detalles.nth(i).click();

    // Si no hay ninguna linea de total, el detalle esta vacio: es el fallo, no un fallo de la
    // prueba. Se mide con `count` en vez de leer directamente, porque leer un elemento que no
    // existe agota el tiempo de espera y entonces el informe diria «timeout» en lugar de decir
    // que ninguna orden mostro lo que se vendio en ella.
    const totales = page.locator('div').filter({ hasText: /Total platillos|Total productos/ });
    const texto = (await totales.count()) > 0 ? await totales.last().innerText() : '';

    // El total de la orden, tal como lo muestra su propia tarjeta.
    const tarjeta = await page.getByRole('button', { name: /ocultar/i }).first()
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
      .innerText();

    const importes = (etiqueta: RegExp) => {
      const m = texto.match(etiqueta);
      return m ? parseFloat(m[1]) : 0;
    };
    const platillos = importes(/Total platillos[^$]*\$([\d.]+)/);
    const productos = importes(/Total productos[^$]*\$([\d.]+)/);
    const total = parseFloat(tarjeta.match(/Total\s*\$([\d.]+)/)?.[1] ?? '0');

    if (platillos + productos > 0) {
      cuadran.push(`${(platillos + productos).toFixed(2)} vs ${total.toFixed(2)}`);
      expect(
        Math.abs(platillos + productos - total),
        `los importes del detalle no suman el total de la orden: ${platillos} + ${productos} ≠ ${total}`
      ).toBeLessThan(0.01);
    }

    await page.getByRole('button', { name: /ocultar/i }).first().click();
  }

  // Sin esto la prueba pasaría con todas las órdenes vacías, que es exactamente el fallo.
  expect(cuadran.length, 'ninguna orden mostró lo que se vendió en ella').toBeGreaterThan(0);
});

/**
 * Que el reporte abra en el dia del restaurante.
 *
 * Abria en el de Greenwich: `new Date().toISOString()` da la fecha en UTC, y en Mexico son seis
 * horas de mas. A las 18:04 del 25 la pantalla ya pedia el 26, asi que el reporte salia en ceros
 * durante toda la cena — la franja en la que mas se consulta.
 *
 * Se fija el reloj a proposito. Sin fijarlo, la afirmacion solo diria algo entre las 18:00 y la
 * medianoche; el resto del dia pasaria igual con el fallo dentro, que es como sobrevivio tanto
 * tiempo.
 */
test('el reporte abre en el dia del negocio, no en el de Greenwich', async ({ page }) => {
  // Un instante que cae en dias distintos segun donde se mire: pasada la medianoche en Greenwich
  // y todavia la tarde anterior en Ciudad de Mexico.
  const instante = new Date();
  instante.setUTCHours(24, 30, 0, 0);
  const enMexico = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
  expect(enMexico, 'el instante elegido no distingue las dos zonas').not.toBe(
    instante.toISOString().slice(0, 10)
  );

  await page.clock.setFixedTime(instante);
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');

  const fechas = page.locator('input[type="date"]');
  await expect(fechas.nth(0)).toHaveValue(enMexico, { timeout: 15_000 });
  await expect(fechas.nth(1)).toHaveValue(enMexico);
});