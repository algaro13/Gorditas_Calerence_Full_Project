import { test, expect, type Page } from '@playwright/test';

/**
 * Que el administrador encuentre su suscripción y que un pago fallido se diga.
 *
 * Antes no había dónde verla: el menú no la mencionaba y un cobro rechazado (`past_due`) no se
 * mostraba en ninguna parte, porque el restaurante sigue operando. Lo primero que se notaba era
 * el punto de venta en pausa, cuando Stripe dejaba de reintentar.
 *
 * Como en `plan.spec.ts`, se interviene la respuesta en vez de cambiar la suscripción de verdad:
 * aquí se afirma lo que el SPA hace con lo que el backend dice. Que el backend lo diga bien lo
 * afirma `billing.test.ts`.
 */

const RENUEVA = '2026-11-02T12:00:00.000Z';

async function conSuscripcion(page: Page, cambios: Record<string, unknown>) {
  await page.route('**/api/tenants/me', async (ruta) => {
    const respuesta = await ruta.fetch();
    const cuerpo = await respuesta.json();
    if (cuerpo?.data?.tenant) Object.assign(cuerpo.data.tenant, cambios);
    await ruta.fulfill({ response: respuesta, body: JSON.stringify(cuerpo) });
  });
  await page.route('**/api/billing/status', async (ruta) => {
    const respuesta = await ruta.fetch();
    const cuerpo = await respuesta.json();
    if (cuerpo?.data) Object.assign(cuerpo.data, cambios);
    await ruta.fulfill({ response: respuesta, body: JSON.stringify(cuerpo) });
  });
}

test('el administrador llega a su suscripción desde el menú', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // A ancho de teléfono el menú completo vive detrás de «Más».
  await page.getByRole('button', { name: /más/i }).click();
  await page.getByRole('link', { name: 'Suscripción' }).click();

  await expect(page).toHaveURL(/\/suscripcion$/);
  await expect(page.getByRole('heading', { name: 'Suscripción', level: 1 })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Plan actual')).toBeVisible();
  await expect(page.getByText(/usuarios activos/)).toBeVisible();
  // Nunca el identificador interno.
  await expect(page.locator('main')).not.toContainText(/\b(trial|past_due)\b/);
});

test('con un pago rechazado, el panel y la suscripción lo dicen', async ({ page }) => {
  await conSuscripcion(page, { plan: 'profesional', planStatus: 'past_due', trialEndsAt: null, currentPeriodEnd: RENUEVA, tieneClienteStripe: true });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const aviso = page.getByRole('alert').filter({ hasText: /no pudimos cobrar/i });
  await expect(aviso).toBeVisible({ timeout: 15_000 });

  await aviso.getByRole('link', { name: /actualizar pago/i }).click();
  await expect(page).toHaveURL(/\/suscripcion$/);
  await expect(page.getByText('Pago pendiente')).toBeVisible();
  await expect(page.getByRole('button', { name: /actualizar método de pago/i })).toBeVisible();
});

test('una cancelación programada dice hasta cuándo', async ({ page }) => {
  await conSuscripcion(page, { plan: 'basico', planStatus: 'active', trialEndsAt: null, currentPeriodEnd: RENUEVA, cancelAt: RENUEVA, tieneClienteStripe: true });

  await page.goto('/');
  await expect(page.getByText(/cancelado: funciona hasta el 2 de noviembre de 2026/i)).toBeVisible({ timeout: 15_000 });

  await page.goto('/suscripcion');
  await expect(page.getByText('Cancelación programada')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/sigue funcionando hasta el 2 de noviembre de 2026/i)).toBeVisible();
});

test('sin cliente en Stripe no se ofrece un portal que falla', async ({ page }) => {
  await conSuscripcion(page, { tieneClienteStripe: false });

  await page.goto('/suscripcion');
  await expect(page.getByText('Plan actual')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /administrar pago|actualizar método/i })).toHaveCount(0);
});

// ---- Lo que salió de recorrerla en el navegador ----

test('una prueba que termina hoy lo dice así, sin «queda 1 día»', async ({ page }) => {
  const hoy = new Date();
  hoy.setHours(23, 59, 0, 0);
  test.skip(hoy.getTime() - Date.now() < 60_000, 'a un minuto de medianoche «hoy» ya no se puede afirmar');
  await conSuscripcion(page, { plan: 'trial', planStatus: 'trial', trialEndsAt: hoy.toISOString(), currentPeriodEnd: null, cancelAt: null });

  await page.goto('/');
  await expect(page.getByText('Prueba gratuita — termina hoy')).toBeVisible({ timeout: 15_000 });

  await page.goto('/suscripcion');
  await expect(page.getByText('Tu prueba termina hoy.')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('main')).not.toContainText(/queda 1 día/);
});

test('pago pendiente manda sobre una cancelación programada', async ({ page }) => {
  await conSuscripcion(page, { plan: 'basico', planStatus: 'past_due', trialEndsAt: null, currentPeriodEnd: RENUEVA, cancelAt: RENUEVA, tieneClienteStripe: true });

  await page.goto('/suscripcion');
  await expect(page.getByText('Pago pendiente')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Cancelación programada')).toHaveCount(0);
  // La fecha de la cancelación se sigue diciendo.
  await expect(page.getByText(/sigue funcionando hasta el 2 de noviembre de 2026/i)).toBeVisible();
});

test('con la prueba vencida, /planes no dice «En prueba» y deja cerrar sesión', async ({ page }) => {
  const ayer = new Date(Date.now() - 86_400_000).toISOString();
  await page.route('**/api/tenants/me', async (ruta) => {
    const respuesta = await ruta.fetch();
    const cuerpo = await respuesta.json();
    if (cuerpo?.data) {
      cuerpo.data.accesoBloqueado = 'TRIAL_EXPIRED';
      Object.assign(cuerpo.data.tenant, { plan: 'trial', planStatus: 'trial', trialEndsAt: ayer });
    }
    await ruta.fulfill({ response: respuesta, body: JSON.stringify(cuerpo) });
  });

  await page.goto('/suscripcion');
  await expect(page).toHaveURL(/\/planes$/, { timeout: 15_000 });
  await expect(page.getByText(/Prueba vencida/)).toBeVisible();
  await expect(page.getByText(/· En prueba/)).toHaveCount(0);
  // Esta pantalla no tiene menú: sin este botón no hay salida.
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
});

test('con una suscripción viva, elegir otro plan la cambia en vez de abrir otro Checkout', async ({ page }) => {
  await conSuscripcion(page, { plan: 'basico', planStatus: 'active', trialEndsAt: null, currentPeriodEnd: RENUEVA, cancelAt: null, tieneClienteStripe: true });
  let checkouts = 0;
  let cambio: unknown = null;
  await page.route('**/api/billing/create-checkout', async (ruta) => {
    checkouts++;
    await ruta.abort();
  });
  await page.route('**/api/billing/change-plan', async (ruta) => {
    cambio = ruta.request().postDataJSON();
    await ruta.fulfill({ json: { success: true, data: { plan: 'profesional', planStatus: 'active', maxUsuarios: 10 } } });
  });

  await page.goto('/planes');
  await expect(page.getByRole('button', { name: 'Tu plan actual' })).toBeDisabled({ timeout: 15_000 });

  // Pide confirmación y explica el prorrateo antes de tocar nada.
  await page.getByRole('button', { name: 'Cambiar a este plan' }).first().click();
  const confirmacion = page.getByRole('group', { name: /Confirmar cambio a Profesional/ });
  await expect(confirmacion).toContainText(/próxima factura/);
  await confirmacion.getByRole('button', { name: 'Confirmar cambio' }).click();

  await expect(page).toHaveURL(/\/suscripcion$/);
  // Se espera a que la pantalla cargue: si la prueba termina con sus llamadas en vuelo, Playwright
  // corta las respuestas interceptadas y falla por eso, no por lo que se afirma.
  await expect(page.getByRole('heading', { name: 'Suscripción', level: 1 })).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  expect(cambio).toEqual({ plan: 'profesional' });
  expect(checkouts, 'abrió un Checkout teniendo ya una suscripción').toBe(0);
});
