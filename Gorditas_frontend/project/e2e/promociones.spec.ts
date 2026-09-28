import { test, expect, type Page } from '@playwright/test';
import { cliente, llevarACaja, tomarOrden } from './ordenes';

/**
 * Una promoción, de punta a punta: se crea en su pantalla, una orden la gana sola, y la caja
 * explica la resta.
 *
 * Las reglas una a una se prueban sin navegador (`test/unit/promociones.test.ts` del backend).
 * Aquí se comprueba lo que solo se ve con la pantalla delante: que se puede crear sin saber la
 * API, que la orden la aplica sin que nadie la elija, y que el descuento se puede comprobar.
 */

/** La API con el token que ya tiene la sesión, para preparar y limpiar sin pasar por la pantalla. */
async function api(page: Page, metodo: string, ruta: string, cuerpo?: unknown) {
  return page.evaluate(
    async ([m, r, c]) => {
      const llave = Object.keys(localStorage).find((k) => k.startsWith('oidc.user'));
      const token = llave ? JSON.parse(localStorage.getItem(llave)!).access_token : null;
      const res = await fetch(`http://localhost:5000/api${r}`, {
        method: m as string,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: c === null ? undefined : JSON.stringify(c),
      });
      return { estado: res.status, cuerpo: await res.json() };
    },
    [metodo, ruta, cuerpo ?? null] as const,
  );
}

/**
 * Deja el restaurante sin promociones activas.
 *
 * Sin esto la prueba no es determinista: una promoción que otra corrida dejó viva compite con la
 * suya, y a igualdad de descuento gana la de menor identificador. Pasó: el ticket mostraba el
 * nombre de una promoción de hace tres corridas, con el importe correcto.
 */
async function sinPromocionesActivas(page: Page) {
  const r = await api(page, 'GET', '/promociones?activas=true');
  for (const p of r.cuerpo.data?.promociones ?? []) {
    await api(page, 'DELETE', `/promociones/${p.id}`);
  }
}

test('una promoción se crea, la orden la gana sola y la caja explica la resta', async ({ page }) => {
  const nombre = `Mitad de precio ${Date.now()}`;

  await page.goto('/promociones');
  await page.waitForLoadState('networkidle');
  await sinPromocionesActivas(page);
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Se crea por la pantalla, que es lo que se está probando: nadie debería necesitar la API.
  await page.getByRole('button', { name: /nueva promoción/i }).click();
  await page.getByPlaceholder('Martes de gorditas').fill(nombre);
  await page.getByRole('button', { name: /^Porcentaje/ }).click();
  await page.locator('input[type="number"]').first().fill('50');
  await page.getByRole('button', { name: /^Guardar$/ }).click();
  await expect(page.getByText(nombre).first()).toBeVisible({ timeout: 15_000 });

  try {
    // Nadie elige la promoción al tomar la orden: se gana con lo que la orden tiene.
    const quien = cliente();
    await tomarOrden(page, quien);
    await llevarACaja(page, quien);

    await page.goto('/cobrar');
    await page.waitForLoadState('networkidle');

    // Cobrar agrupa por mesa y llega plegada; el detalle de la orden está dentro.
    await expect(page.getByText(quien).first()).toBeVisible({ timeout: 15_000 });
    await page.getByText(quien).first().click();

    // La resta se puede comprobar: el artículo a precio de carta, el subtotal, el descuento con
    // su nombre, y el total. Un ticket que solo enseñara el total ya descontado no lo permitiría.
    await expect(page.getByText(nombre).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Subtotal').first()).toBeVisible();
    await expect(page.getByText('-$12.50').first()).toBeVisible();
    // El platillo vale 25; al 50 % se cobran 12.50.
    await expect(page.getByText('$12.50').first()).toBeVisible();
  } finally {
    await sinPromocionesActivas(page);
  }
});
