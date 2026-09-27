import { test, expect } from '@playwright/test';

/**
 * Que un plan vencido se diga, en vez de parecer un sistema roto.
 *
 * Pasó en producción: el restaurante `demo` tenía la prueba vencida desde hacía seis días.
 * Catálogos → Mesas salía vacío aunque hubiera ocho mesas, el nombre que proponía el diálogo era
 * «Mesa 1» —porque cuenta las que ve y no veía ninguna— y guardar no hacía nada.
 *
 * El backend contestaba con todas sus letras: `403 TRIAL_EXPIRED`, «Tu periodo de prueba ha
 * expirado». El SPA no miraba ese código en ninguna parte: cada pantalla recibía su 403, se
 * quedaba con la lista vacía y callaba.
 *
 * Se interviene la respuesta en vez de vencer una prueba de verdad: lo que se afirma aquí es la
 * reacción del SPA a lo que el backend dice. Que el backend lo diga bien lo afirma su propia
 * prueba, donde sí se vence el plazo contra la base.
 */

const ME = '**/api/tenants/me';

async function conAccesoBloqueado(page: import('@playwright/test').Page, motivo: string) {
  await page.route(ME, async (ruta) => {
    const respuesta = await ruta.fetch();
    const cuerpo = await respuesta.json();
    if (cuerpo?.data) cuerpo.data.accesoBloqueado = motivo;
    await ruta.fulfill({ response: respuesta, body: JSON.stringify(cuerpo) });
  });
}

test('con la prueba vencida, el POS explica en vez de salir vacío', async ({ page }) => {
  await conAccesoBloqueado(page, 'TRIAL_EXPIRED');

  // Se entra por una pantalla cualquiera del POS, como haría el operador.
  await page.goto('/catalogos');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/planes$/, { timeout: 15_000 });
  await expect(page.getByText(/tu periodo de prueba terminó/i)).toBeVisible();
  await expect(page.getByText(/tus datos están intactos/i)).toBeVisible();

  // Y hay por dónde salir: los planes se pueden contratar desde aquí.
  await expect(page.getByRole('button', { name: /seleccionar|elegir|contratar/i }).first()).toBeVisible();
});

test('con la suscripción inactiva, el motivo es otro', async ({ page }) => {
  await conAccesoBloqueado(page, 'SUBSCRIPTION_INACTIVE');

  await page.goto('/reportes');
  await expect(page).toHaveURL(/\/planes$/, { timeout: 15_000 });
  await expect(page.getByText(/tu suscripción no está activa/i)).toBeVisible();
});

test('con el plan al día no cambia nada', async ({ page }) => {
  // La otra cara de la moneda: sin esto, cualquier error al leer el motivo dejaría a todos los
  // restaurantes fuera de su propio sistema.
  await page.goto('/catalogos');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/catalogos$/);
  // El titulo de la pantalla y el de la tarjeta del selector se llaman igual; basta el primero.
  await expect(page.getByRole('heading', { name: 'Catálogos' }).first()).toBeVisible({ timeout: 15_000 });
});
