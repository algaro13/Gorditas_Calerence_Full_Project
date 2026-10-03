import { test, expect, type Locator, type Page } from '@playwright/test';
import { periodoAmplio } from './periodo';
import { elegirEn } from './selector';

/**
 * Los campos numéricos se vacían con el teclado, y vacío no se guarda como cero.
 *
 * Convertían en cada tecla (`parseFloat(v) || 0`): al borrar el último dígito volvía el 0 —o el
 * valor anterior, en los de `valor || antes`— y no había forma de dejarlos en blanco para
 * escribir otra cifra. Las demás pruebas no lo veían porque `fill()` sustituye el valor de una
 * vez; aquí se borra tecla a tecla, como lo hace una persona.
 */

/** Borra el contenido con el teclado: seleccionar todo y retroceso. */
async function borrar(campo: Locator) {
  await campo.click();
  await campo.press('Control+a');
  await campo.press('Backspace');
}

const visible = (page: Page, nombre: string) =>
  page.getByRole('button', { name: nombre }).locator('visible=true').first();

test('recibir producto: la existencia se vacía, vacía no se guarda, y un 0 sí', async ({ page }) => {
  const nombre = `Teclado ${Date.now()}`;
  await page.goto('/recibir-productos');
  await page.waitForLoadState('networkidle');

  // El alta: cantidad y costo arrancan en 0 y se pueden borrar para escribir encima.
  await page.getByRole('button', { name: /nuevo producto/i }).first().click();
  await page.getByPlaceholder('Nombre del producto').fill(nombre);
  await elegirEn(page.getByRole('combobox', { name: 'Tipo de producto' }));
  const [cantidadAlta, costoAlta] = [page.locator('input[type="number"]').nth(-2), page.locator('input[type="number"]').last()];
  await borrar(cantidadAlta);
  await expect(cantidadAlta).toHaveValue('');
  await cantidadAlta.pressSequentially('5');
  await borrar(costoAlta);
  await expect(costoAlta).toHaveValue('');
  await costoAlta.pressSequentially('12.5');
  await page.getByRole('button', { name: /crear producto/i }).click();

  await page.getByPlaceholder('Buscar productos...').fill(nombre);

  // Todo pasa dentro de la tarjeta (o la fila, en escritorio) de ESTE producto. Antes se pulsaba
  // el primer «Editar» visible: si el buscador aún no había filtrado, era el de otro producto y
  // la prueba leía su cantidad —«esperaba 5, recibió 3»—. Y la limpieza pulsaba el primer
  // «Eliminar»: en esa misma carrera borraba un producto que la prueba no había creado.
  //
  // `.last()` porque las tarjetas están anidadas en contenedores que también contienen el nombre;
  // en orden de documento el más interno, la tarjeta, es el último.
  const tarjeta = page
    .locator('div.border, tr')
    .filter({ has: page.getByText(nombre, { exact: true }) })
    .locator('visible=true')
    .last();
  await expect(tarjeta).toBeVisible({ timeout: 15_000 });

  try {
    await tarjeta.getByRole('button', { name: 'Editar' }).click();
    const cantidad = tarjeta.getByLabel('Cantidad');
    await expect(cantidad).toHaveValue('5');

    // Borrada queda en blanco: no vuelve el 5 de antes.
    await borrar(cantidad);
    await expect(cantidad).toHaveValue('');
    await tarjeta.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText(/no pueden quedar vacíos/i).first()).toBeVisible();

    // Un 0 escrito a propósito es «agotado», no «sin cambio»: se guarda como 0.
    await cantidad.pressSequentially('0');
    await tarjeta.getByRole('button', { name: 'Guardar' }).click();
    // Guardado: la tarjeta vuelve a mostrar «Editar» en vez de los campos.
    await expect(tarjeta.getByRole('button', { name: 'Editar' })).toBeVisible({ timeout: 15_000 });
    await expect(tarjeta).toContainText('0');
    await expect(tarjeta).not.toContainText(/\b5\b/);
  } finally {
    page.once('dialog', (d) => d.accept());
    await tarjeta.getByRole('button', { name: 'Eliminar' }).click().catch(() => {});
  }
});

test('reportes: los montos de caja se vacían con el teclado, y vacío no se guarda', async ({ page }) => {
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');
  // Hoy puede no tener fila todavía; con una semana hay tarjetas de día con su caja.
  await periodoAmplio(page);

  // Editar el monto de un día: se borra, y confirmar en blanco pide la cifra en vez de guardar 0.
  await visible(page, 'Editar monto de caja').click();
  const monto = page.getByLabel('Monto de caja').locator('visible=true').first();
  await borrar(monto);
  await expect(monto).toHaveValue('');
  await visible(page, 'Confirmar monto').click();
  await expect(page.getByText(/escribe el monto de caja/i).first()).toBeVisible();
  await visible(page, 'Cancelar').click();

  // «Agregar a Caja» nace vacío —se ve su «Agregar...»— y tras escribir se puede volver a vaciar.
  await page.getByRole('button', { name: /agregar a caja/i }).locator('visible=true').first().click();
  const agregar = page.getByLabel('Monto a agregar a la caja').locator('visible=true').first();
  await expect(agregar).toHaveValue('');
  await agregar.pressSequentially('25');
  await expect(agregar).toHaveValue('25');
  await borrar(agregar);
  await expect(agregar).toHaveValue('');
});
