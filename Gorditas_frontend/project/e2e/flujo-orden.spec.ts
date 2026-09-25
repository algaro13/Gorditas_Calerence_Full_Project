import { test, expect, type Page } from '@playwright/test';

/**
 * El camino completo de una orden: tomarla, surtirla, despacharla y cobrarla.
 *
 * Es el que da de comer al restaurante. Si este se rompe da igual que los botones midan bien,
 * y ya se rompió una vez sin que nada avisara: la pantalla mandaba un `idTipoOrden` fijo y
 * tomar órdenes fallaba en todo restaurante que no fuera el primero dado de alta.
 *
 * Cada paso afirma el efecto, no el clic. Comprobar que el botón se pulsó no prueba nada.
 */

/** El nombre de cliente identifica la orden de esta corrida entre las que ya haya. */
const cliente = () => `E2E ${Date.now()}`;

/**
 * El botón `accion` de la tarjeta que contiene a `nombre`.
 *
 * Existe porque las pantallas agrupan por mesa y una corrida anterior deja su propia tarjeta:
 * pulsar el primer botón que aparezca actuaba sobre la orden de otro, y el fallo salía dos
 * pasos más allá. `.last()` toma el contenedor más interno de los que encajan, que es la
 * tarjeta y no la página entera.
 */
function tarjetaDe(page: Page, nombre: string, accion: RegExp) {
  return page
    .locator('div')
    .filter({ hasText: nombre })
    .filter({ has: page.getByRole('button', { name: accion }) })
    .last()
    .getByRole('button', { name: accion })
    .first();
}

async function tomarOrden(page: Page, nombre: string) {
  // Crear una orden son varias peticiones encadenadas. Si una falla, la app muestra el error y
  // se detiene, dejando una orden a medias — y sin mirar la red, el fallo aparece tres pasos
  // después sin ninguna pista. Se recogen aquí para que el test diga qué se rompió.
  const fallidas: string[] = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/') && r.status() >= 400) {
      fallidas.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname} → ${await r.text().catch(() => '')}`);
    }
  });

  await page.goto('/nueva-orden');

  // «Nuevo pedido» crea una mesa temporal para esta orden. Se usa en vez de una mesa fija
  // porque el test no era idempotente: la orden de la corrida anterior dejaba la mesa ocupada
  // y la siguiente seguía otro camino, fallando tres pasos después sin decir por qué.
  await page.getByText(/^Nuevo pedido$/i).first().click();


  await page.getByPlaceholder(/nombre del cliente/i).fill(nombre);
  await page.getByRole('button', { name: /^(Sig|Siguiente)/ }).click();

  await page.getByRole('button', { name: /platillo/i }).first().click();

  // Platillo y guiso salen del catálogo que siembra `npm run dev:seed`, que vive en el repo
  // (scripts/dev-seed.ts). Atarlo a esos nombres es deliberado: un selector genérico por
  // «lo que tenga precio» encontraba media pantalla y fallaba sin decir por qué.
  await page.getByText(/^Gordita de/i).first().click();
  await page.getByText(/^(Chicharrón prensado|Picadillo|Deshebrada)$/i).first().click();
  await page.getByRole('button', { name: /sin extras/i }).click();
  await page.getByRole('button', { name: /^Agregar$/ }).click();

  await expect(page.getByText(/platillos seleccionados \(1\)/i)).toBeVisible();
  await page.getByRole('button', { name: /crear orden/i }).click();

  // Crear la orden son varias peticiones: la cabecera, la suborden y cada platillo. Navegar en
  // cuanto responde la primera las aborta y deja una orden vacía de $0.00 — pasó, y el fallo
  // aparecía tres pasos después, en despachar, sin pista de la causa.
  // La señal de que terminó es que reaparece la rejilla de mesas, que solo existe en el paso 1.
  // Esperar el texto «Seleccionar Mesa» NO sirve: está también en el indicador de pasos, así que
  // está visible siempre y la espera no esperaba nada — de ahí salían las órdenes de $0.00.
  await expect(page.getByText(/^Mesa \d+$/).first()).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');

  expect(fallidas, 'peticiones rechazadas al crear la orden').toEqual([]);

  // El efecto, no el clic: la orden existe CON su platillo. Aceptar cualquier `$x.xx` dejaba
  // pasar `$0.00`, que es justo el síntoma de que las líneas no llegaron.
  await page.goto('/editar-orden');
  await expect(page.getByText(nombre)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/\$(?!0\.00)\d+\.\d{2}/).first()).toBeVisible({ timeout: 10_000 });
}

test('una orden llega de la mesa a la caja', async ({ page }) => {
  const nombre = cliente();

  await test.step('se toma', async () => {
    await tomarOrden(page, nombre);
  });

  await test.step('se surte', async () => {
    await page.goto('/surtir-orden');
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 15_000 });
    // Acotado a la tarjeta de ESTA orden. Con `.first()` la prueba pulsaba la de otra mesa
    // cuando había órdenes de corridas anteriores, y fallaba aquí sin explicar por qué.
    await tarjetaDe(page, nombre, /surtir todas/i).click();
    await expect(page.getByText(nombre)).toBeHidden({ timeout: 15_000 });
  });

  await test.step('se despacha', async () => {
    await page.goto('/despachar');
    // Se espera a que la orden esté en pantalla antes de pulsar: ir directo al botón lo
    // buscaba mientras la lista aún cargaba y agotaba el tiempo sin decir por qué.
    // Se entrega TODO lo pendiente en vez de buscar esta orden: Despachar agrupa por mesa y no
    // muestra el cliente hasta expandir, así que acotarla aquí exigía adivinar el nombre de la
    // mesa. En una base de pruebas entregar de más es inocuo, y la aserción precisa vuelve en
    // el paso siguiente, donde Cobrar sí lista al cliente.
    const entregar = page.getByRole('button', { name: /entregar/i });
    await page.waitForLoadState('networkidle');
    // Sin exigir que haya algo pendiente: la lista depende de lo que dejaran otras corridas, y
    // el paso siguiente —cobrar ESTA orden por su nombre— es la prueba de que llegó a la caja.
    while (await entregar.count()) {
      await entregar.first().click();
      await page.waitForLoadState('networkidle');
    }
  });

  await test.step('se cobra, y solo tras confirmar', async () => {
    await page.goto('/cobrar');
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 15_000 });

    // Cancelar no debe cobrar: es la garantía que se añadió para que un toque de mas no
    // cierre una venta.
    page.once('dialog', (d) => d.dismiss());
    await tarjetaDe(page, nombre, /^Cobrar$/).click();
    await expect(page.getByText(nombre)).toBeVisible();

    page.once('dialog', (d) => {
      expect(d.message(), 'la confirmación debe decir el importe').toMatch(/\$\d/);
      d.accept();
    });
    await tarjetaDe(page, nombre, /^Cobrar$/).click();
    await expect(page.getByText(nombre)).toBeHidden({ timeout: 15_000 });
  });
});
