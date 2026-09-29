import { test, expect } from '@playwright/test';

/**
 * Los selectores del catálogo se buscan escribiendo.
 *
 * Eran `<select>` nativos: con cuarenta platillos y productos, elegir el artículo de un combo era
 * desplazarse buscando con la vista. Se prueba en el de «Agregar artículo» porque es la lista más
 * larga —platillos y productos juntos— y el único que es una acción: al elegir se vacía para el
 * siguiente. Los nombres son los del catálogo que siembra `npm run dev:seed`.
 */
test('se busca escribiendo, sin acentos, y se elige con el teclado', async ({ page }) => {
  await page.goto('/promociones');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /nueva promoción/i }).click();
  await page.getByRole('button', { name: /^Combo/ }).click();

  const campo = page.getByRole('combobox', { name: 'Agregar artículo' });
  const lista = page.getByRole('listbox', { name: 'Agregar artículo' });
  const opciones = lista.getByRole('option');

  // Al tocarlo aparece la lista entera, agrupada: platillos y productos, cada uno con su encabezado.
  await campo.click();
  await expect(lista).toBeVisible();
  await expect(lista.getByText('Platillos', { exact: true })).toBeVisible();
  const todas = await opciones.count();
  expect(todas).toBeGreaterThan(5);

  // Y se ve: este selector está al final del formulario, y abierta hacia abajo el borde del modal
  // la cortaba hasta dejar una sola opción a la vista. Se cuentan las que caben enteras dentro de
  // la lista, del modal y de la pantalla.
  const aLaVista = await opciones.evaluateAll((els) =>
    els.filter((e) => {
      const r = e.getBoundingClientRect();
      const marcos = [e.closest('[role=listbox]'), e.closest('.overflow-y-auto:not([role=listbox])')]
        .filter(Boolean)
        .map((m) => (m as Element).getBoundingClientRect());
      return r.bottom <= window.innerHeight && r.top >= 0 && marcos.every((m) => r.top >= m.top - 1 && r.bottom <= m.bottom + 1);
    }).length,
  );
  expect(aLaVista, 'la lista abierta queda cortada').toBeGreaterThanOrEqual(4);

  // Sin acento encuentra el que lo lleva, y solo quedan los que coinciden.
  await campo.pressSequentially('chicharron');
  await expect(opciones.first()).toHaveText(/chicharrón/i);
  for (const texto of await opciones.allTextContents()) expect(texto).toMatch(/chicharr[oó]n/i);
  expect(await opciones.count()).toBeLessThan(todas);

  // Lo que no existe lo dice, en vez de dejar una lista vacía sin explicación.
  await campo.fill('zzzz');
  await expect(lista.getByText('Sin coincidencias')).toBeVisible();

  // Flechas e Intro, sin ratón: se elige la primera del filtro y se agrega al combo.
  await campo.fill('');
  await campo.pressSequentially('taco');
  await campo.press('ArrowDown');
  await campo.press('ArrowUp');
  await campo.press('Enter');
  await expect(lista).toBeHidden();
  await expect(page.getByText('Taco dorado').first()).toBeVisible();
  // Es una acción: queda vacío y listo para el siguiente, no muestra lo elegido.
  await expect(campo).toHaveValue('');

  // Escape cierra sin elegir nada.
  await campo.click();
  await campo.pressSequentially('quesa');
  await campo.press('Escape');
  await expect(lista).toBeHidden();
  await expect(page.getByText('Quesadilla')).toHaveCount(0);
});

test('un selector con valor lo muestra, y buscar no lo pierde', async ({ page }) => {
  await page.goto('/promociones');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /nueva promoción/i }).click();
  await page.getByRole('button', { name: /^Porcentaje/ }).click();

  // «Toda la orden» es una opción con significado, no «falta elegir»: se ve como elegida.
  const categoria = page.getByRole('combobox', { name: 'Sobre qué categoría' });
  await expect(categoria).toHaveValue('Toda la orden');

  // Se elige otra con el teclado y queda escrita en el campo.
  await categoria.click();
  await categoria.press('ArrowDown');
  await categoria.press('Enter');
  const elegida = await categoria.inputValue();
  expect(elegida).not.toBe('Toda la orden');
  expect(elegida).not.toBe('');

  // Escribir para buscar y salir sin elegir deja lo que había, no el texto a medias.
  await categoria.click();
  await categoria.pressSequentially('xyz');
  await page.getByPlaceholder('Martes de gorditas').click();
  await expect(categoria).toHaveValue(elegida);
});
