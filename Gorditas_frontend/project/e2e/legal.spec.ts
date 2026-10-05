import { test, expect } from '@playwright/test';

/**
 * El aviso de privacidad y los términos: se leen sin sesión, se enlazan desde donde se entra, y el
 * registro no avanza sin aceptarlos. Que el backend rechace un registro sin aceptación lo afirma
 * `onboarding.test.ts`.
 */

// Sin la sesión guardada: estas páginas son para quien todavía no tiene cuenta.
test.use({ storageState: { cookies: [], origins: [] } });

for (const { ruta, titulo } of [
  { ruta: '/privacidad', titulo: 'Aviso de privacidad' },
  { ruta: '/terminos', titulo: 'Términos del servicio' },
]) {
  test(`${titulo}: se lee sin sesión, con su versión y sin desbordar el teléfono`, async ({ page }) => {
    await page.goto(ruta);
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
    await expect(page.getByText(/^Versión del \d+ de \w+ de \d{4}$/)).toBeVisible();
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(ancho).toBeLessThanOrEqual(0);
  });
}

test('la página de venta y el inicio de sesión enlazan a los dos documentos', async ({ page }) => {
  await page.goto('/landing');
  const pie = page.getByRole('navigation', { name: 'Documentos legales' });
  await expect(pie.getByRole('link', { name: 'Aviso de privacidad' })).toHaveAttribute('href', '/privacidad');
  await expect(pie.getByRole('link', { name: 'Términos del servicio' })).toHaveAttribute('href', '/terminos');

  await page.goto('/login');
  await expect(page.getByRole('link', { name: 'términos del servicio' })).toHaveAttribute('href', '/terminos');
  await expect(page.getByRole('link', { name: 'aviso de privacidad' })).toHaveAttribute('href', '/privacidad');
});

test('el registro no avanza sin aceptar el aviso de privacidad y los términos', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByPlaceholder('Nombre', { exact: true }).fill('Prueba');
  await page.getByPlaceholder('Apellido').fill('Legal');
  await page.getByPlaceholder('Correo electrónico').fill('prueba-legal@kustodela.local');
  await page.getByPlaceholder('Contraseña', { exact: true }).fill('Prueba123!');
  await page.getByPlaceholder('Confirmar contraseña').fill('Prueba123!');

  const siguiente = page.getByRole('button', { name: 'Siguiente' });
  await expect(siguiente).toBeDisabled();

  // Los enlaces abren en otra pestaña: aquí se perdería lo capturado.
  await expect(page.getByRole('link', { name: 'aviso de privacidad' })).toHaveAttribute('target', '_blank');

  const casilla = page.getByRole('checkbox', { name: /Leí y acepto el aviso de privacidad y los términos/ });
  await casilla.check();
  await expect(siguiente).toBeEnabled();
  await casilla.uncheck();
  await expect(siguiente).toBeDisabled();
});
