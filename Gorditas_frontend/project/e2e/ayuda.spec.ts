import { test, expect } from '@playwright/test';

/**
 * El manual de Ayuda: se llega desde el menú, el índice lleva a cada sección y las capturas
 * existen. Una imagen que falta se ve como un recuadro roto, y eso no lo detecta el typecheck.
 */
test('Ayuda: desde el menú, con índice que lleva a cada sección y capturas que cargan', async ({ page }) => {
  await page.goto('/');
  // En el teléfono el menú completo vive detrás de «Más».
  await page.getByRole('button', { name: /más/i }).click();
  await page.getByRole('link', { name: 'Ayuda' }).click();
  await expect(page).toHaveURL(/\/ayuda$/);
  await expect(page.getByRole('heading', { name: 'Ayuda', level: 1 })).toBeVisible({ timeout: 15_000 });

  const indice = page.getByRole('navigation', { name: 'Índice de la ayuda' });
  await expect(indice.getByRole('link')).toHaveCount(14);

  // El diagrama del flujo, en tres pasos y sin Despachar.
  const flujo = page.getByRole('figure', { name: /flujo de una orden/i });
  await expect(flujo).toBeVisible();
  await expect(flujo.getByText('Surtir orden')).toBeVisible();
  await expect(flujo.getByText(/despach/i)).toHaveCount(0);

  // La tabla de roles: uno por fila y sin Despachador.
  const roles = page.getByRole('table', { name: /qué puede hacer cada rol/i });
  await expect(roles.getByRole('rowheader')).toHaveText(['Administrador', 'Encargado', 'Mesero', 'Cocinero']);
  await expect(roles.getByText(/despach/i)).toHaveCount(0);

  await indice.getByRole('link', { name: /cierra la cuenta/i }).click();
  await expect(page.getByRole('heading', { name: /cobrar/i, level: 2 })).toBeInViewport();

  // Todas las capturas cargan: una ruta equivocada deja naturalWidth en 0.
  const imagenes = page.locator('main img');
  const total = await imagenes.count();
  expect(total).toBeGreaterThanOrEqual(16);
  for (let i = 0; i < total; i++) {
    const img = imagenes.nth(i);
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0)).toBe(true);
  }

  // Las preguntas frecuentes se abren.
  await page.getByText('No me llegó el correo', { exact: false }).click();
  await expect(page.getByText(/Spam o Correo no deseado/).first()).toBeVisible();
});
