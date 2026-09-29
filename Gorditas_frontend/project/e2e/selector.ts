import { expect, type Locator } from '@playwright/test';

/**
 * Elegir en un `SelectorBuscable`, como lo hace una persona: tocarlo, escribir si hace falta y
 * tocar la opción.
 *
 * Sustituye a `selectOption`, que solo sirve con un `<select>` nativo. Sin `texto` toma la primera
 * opción de la lista, que es lo que hacían las pruebas con `{ index: 1 }`.
 */
export async function elegirEn(selector: Locator, texto?: string) {
  await selector.click();
  if (texto) await selector.pressSequentially(texto);
  const pagina = selector.page();
  // Por atributo y no con `#id`: `useId` de React genera ids con «:», que rompen un selector CSS.
  const lista = pagina.locator(`[id="${await selector.getAttribute('aria-controls')}"]`);
  const opcion = lista.getByRole('option').first();
  await expect(opcion).toBeVisible();
  await opcion.click();
  await expect(lista).toBeHidden();
}
