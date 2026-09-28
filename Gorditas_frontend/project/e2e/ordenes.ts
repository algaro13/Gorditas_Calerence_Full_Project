import { expect, type Page } from '@playwright/test';

/**
 * Cómo se toma una orden, en un solo sitio.
 *
 * Lo usan la prueba del ciclo completo y la de ergonomía, que necesita una orden abierta para
 * poder abrir el editor de notas: sin orden no hay nada que editar, y sin editor la prueba
 * pasaría sin medir nada — que es justo como llegaron a producción dos editores rotos.
 */

/** El nombre de cliente identifica la orden de esta corrida entre las que ya haya. */
export const cliente = () => `E2E ${Date.now()}`;

/**
 * El botón `accion` de la tarjeta que contiene a `nombre`.
 *
 * Existe porque las pantallas agrupan por mesa y una corrida anterior deja su propia tarjeta:
 * pulsar el primer botón que aparezca actuaba sobre la orden de otro, y el fallo salía dos
 * pasos más allá. `.last()` toma el contenedor más interno de los que encajan, que es la
 * tarjeta y no la página entera.
 */
export function tarjetaDe(page: Page, nombre: string, accion: RegExp) {
  return page
    .locator('div')
    .filter({ hasText: nombre })
    .filter({ has: page.getByRole('button', { name: accion }) })
    .last()
    .getByRole('button', { name: accion })
    .first();
}

export async function tomarOrden(page: Page, nombre: string) {
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

/**
 * Lleva una orden recién tomada hasta la pantalla de cobro: se surte y se despacha.
 *
 * Lo usan la prueba del ciclo completo y la de promociones, que necesita ver el descuento donde
 * se cobra. Una orden en recepción no aparece en Cobrar, así que sin estos dos pasos la prueba
 * fallaba buscando una tarjeta que no existía todavía.
 */
export async function llevarACaja(page: Page, nombre: string): Promise<void> {
  await page.goto('/surtir-orden');
  await expect(page.getByText(nombre)).toBeVisible({ timeout: 15_000 });
  await tarjetaDe(page, nombre, /surtir todas/i).click();
  await expect(page.getByText(nombre)).toBeHidden({ timeout: 15_000 });

  await page.goto('/despachar');
  await page.waitForLoadState('networkidle');
  // Se entrega todo lo pendiente en vez de buscar esta orden: Despachar agrupa por mesa y no
  // muestra el cliente hasta expandir. En una base de pruebas entregar de más es inocuo.
  const entregar = page.getByRole('button', { name: /entregar/i });
  while (await entregar.count()) {
    await entregar.first().click();
    await page.waitForLoadState('networkidle');
  }
}
