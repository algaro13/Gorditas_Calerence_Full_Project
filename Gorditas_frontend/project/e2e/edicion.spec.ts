import { test, expect, type Page } from '@playwright/test';

/**
 * Que los cambios se guarden de verdad.
 *
 * Las otras suites cubren el camino que crea cosas. Este es el que las modifica, y es el que se
 * rompe en silencio: un formulario que envía pero no persiste deja la pantalla igual de bien y
 * el dato sin cambiar.
 *
 * Por eso cada prueba RECARGA antes de comprobar. Afirmar sin recargar solo demuestra que el
 * cliente actualizó su propio estado, que es justo lo que no se está poniendo en duda.
 *
 * Cada una deja lo que tocó como estaba, para poder correrlas muchas veces seguidas.
 */

const PLATILLO = 'Taco dorado';

/**
 * La paleta elegida se marca con `border-gray-800` (Configuracion.tsx).
 *
 * El primer intento comparaba colores de borde buscando el distinto, y fallaba: al cambiar de
 * paleta cambia el tema de toda la página, así que los colores se mueven bajo los pies. La
 * clase que el propio componente usa para marcar la selección no se mueve.
 */
async function paletaSeleccionada(page: Page): Promise<string> {
  return page.evaluate(() => {
    const elegido = [...document.querySelectorAll('button')].find(
      (b) => b.className.includes('border-gray-800') &&
        /^(Naranja|Rojo|Verde|Azul|Morado|Café|Oscuro)$/.test((b as HTMLElement).innerText.trim()),
    );
    return elegido ? (elegido as HTMLElement).innerText.trim() : '';
  });
}

test('cambiar el precio de un platillo lo guarda', async ({ page }) => {
  await page.goto('/catalogos');
  await page.getByRole('button', { name: 'Platillos', exact: true }).click();

  // En teléfono el catálogo se muestra en tarjetas, no en tabla: la fila existe en el DOM pero
  // está oculta desde que las columnas dejaron de caber. Se busca la tarjeta.
  const tarjeta = () =>
    page
      .locator('div.rounded-lg')
      .filter({ hasText: PLATILLO })
      .filter({ has: page.getByRole('button', { name: 'Editar' }) })
      .last();

  await expect(tarjeta()).toBeVisible({ timeout: 15_000 });

  const precioOriginal = (await tarjeta().innerText()).match(/\$(\d+\.\d{2})/)?.[1];
  expect(precioOriginal, `no encontré el precio de ${PLATILLO}`).toBeTruthy();

  const nuevo = (Number(precioOriginal) + 3).toFixed(2);

  await tarjeta().getByRole('button', { name: 'Editar' }).click();
  const campoPrecio = page.getByPlaceholder(/precio/i).first();
  await expect(campoPrecio).toBeVisible({ timeout: 10_000 });
  await campoPrecio.fill(nuevo);
  await page.getByRole('button', { name: /guardar/i }).click();

  // Recarga: es lo que separa «se guardó» de «la pantalla lo muestra».
  await page.reload();
  await page.getByRole('button', { name: 'Platillos', exact: true }).click();
  await expect(tarjeta()).toContainText(`$${nuevo}`, { timeout: 15_000 });

  // Se devuelve a su precio, para que la prueba pueda correrse otra vez igual.
  await tarjeta().getByRole('button', { name: 'Editar' }).click();
  await page.getByPlaceholder(/precio/i).first().fill(precioOriginal!);
  await page.getByRole('button', { name: /guardar/i }).click();
  await expect(tarjeta()).toContainText(`$${Number(precioOriginal).toFixed(2)}`, { timeout: 15_000 });
});

test('cambiar la paleta del negocio la guarda', async ({ page }) => {
  await page.goto('/configuracion');
  await expect(page.getByRole('button', { name: /guardar cambios/i })).toBeVisible({ timeout: 15_000 });

  const original = await paletaSeleccionada(page);
  expect(original, 'no pude leer la paleta actual').toBeTruthy();

  // Cualquiera distinta de la actual sirve; se elige la primera que no lo sea.
  const otra = ['Naranja', 'Rojo', 'Verde', 'Azul', 'Morado'].find((p) => p !== original)!;

  await page.getByRole('button', { name: otra, exact: true }).click();
  await page.getByRole('button', { name: /guardar cambios/i }).click();

  await page.reload();
  await expect(page.getByRole('button', { name: /guardar cambios/i })).toBeVisible({ timeout: 15_000 });
  expect(await paletaSeleccionada(page), 'la paleta no se guardó').toBe(otra);

  // Se deja como estaba.
  await page.getByRole('button', { name: original, exact: true }).click();
  await page.getByRole('button', { name: /guardar cambios/i }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: /guardar cambios/i })).toBeVisible({ timeout: 15_000 });
  expect(await paletaSeleccionada(page)).toBe(original);
});
