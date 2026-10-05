import { test, expect } from '@playwright/test';

/**
 * Un restaurante archivado por falta de uso. Como en `suscripcion.spec.ts`, se interviene la
 * respuesta en vez de archivar el restaurante de verdad: aquí se afirma lo que hace el SPA; que el
 * backend bloquee y recupere lo afirma `retencion.test.ts`.
 */
test('archivado: cualquier pantalla lleva a /archivado, con fecha y el botón para recuperarlo', async ({ page }) => {
  const hasta = new Date(Date.now() + 20 * 86_400_000).toISOString();
  let recuperado = false;

  await page.route('**/api/tenants/me', async (ruta) => {
    const respuesta = await ruta.fetch();
    const cuerpo = await respuesta.json();
    if (cuerpo?.data && !recuperado) {
      cuerpo.data.accesoBloqueado = 'RESTAURANTE_ARCHIVADO';
      Object.assign(cuerpo.data.tenant, { archivadoAt: new Date().toISOString(), recuperableHasta: hasta });
    }
    await ruta.fulfill({ response: respuesta, body: JSON.stringify(cuerpo) });
  });
  await page.route('**/api/tenants/me/recuperar', async (ruta) => {
    recuperado = true;
    await ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { recuperado: true } }) });
  });

  // Tampoco por /planes: pagar no lo desarchiva.
  await page.goto('/planes');
  await expect(page).toHaveURL(/\/archivado$/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /está archivado/ })).toBeVisible();
  await expect(page.getByText(/Tus datos siguen guardados hasta el/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

  await page.getByRole('button', { name: 'Recuperar mi restaurante' }).click();
  await expect(page).not.toHaveURL(/\/archivado$/, { timeout: 15_000 });
});
