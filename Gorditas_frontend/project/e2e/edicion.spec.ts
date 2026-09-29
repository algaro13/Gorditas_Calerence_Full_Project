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
  await page.getByLabel('Catálogo').selectOption({ label: 'Platillos' });

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
  await page.getByLabel('Catálogo').selectOption({ label: 'Platillos' });
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

/**
 * Que guardar diga que guardó.
 *
 * No decía nada: ni éxito ni error. El dato sí se guardaba —lo comprueba la prueba de arriba,
 * recargando—, pero desde la pantalla parecía que el botón no hacía nada, que es exactamente el
 * fallo que motivó el componente de avisos.
 *
 * El aviso no tenía la culpa. `handleSave` termina releyendo el restaurante, y releerlo ponía a
 * la aplicación entera en «cargando», que se dibuja como una pantalla de carga a página
 * completa. El árbol se desmontaba y el mensaje moría con la pantalla que iba a mostrarlo.
 *
 * Por eso la prueba afirma las dos cosas: que el mensaje aparece, y que el armazón no se fue en
 * ningún momento. Sin la segunda, cualquiera podría «arreglarlo» guardando el aviso en otro
 * sitio y dejar el remontaje en pie, que también se lleva el scroll, los diálogos abiertos y lo
 * que estuvieras escribiendo.
 */
test('guardar la configuración lo confirma, sin remontar la pantalla', async ({ page }) => {
  await page.goto('/configuracion');
  const guardar = page.getByRole('button', { name: /guardar cambios/i });
  await expect(guardar).toBeVisible({ timeout: 15_000 });

  // Se marca el nodo del armazón. Si la aplicación se remonta, el nodo marcado deja de existir.
  await page.evaluate(() => {
    document.querySelector('main')?.setAttribute('data-testigo', 'si');
  });

  await guardar.click();

  await expect(page.getByRole('status').or(page.getByRole('alert')).first()).toBeVisible({
    timeout: 10_000,
  });

  const sobrevivio = await page.evaluate(
    () => document.querySelector('main')?.getAttribute('data-testigo') === 'si'
  );
  expect(sobrevivio, 'la pantalla se remontó durante el guardado').toBe(true);
});
