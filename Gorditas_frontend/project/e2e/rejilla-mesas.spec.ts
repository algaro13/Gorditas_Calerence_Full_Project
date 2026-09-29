import { test, expect } from '@playwright/test';

/**
 * La rejilla de mesas muestra mesas, no el historial de pedidos para llevar.
 *
 * Cada «Nuevo pedido» crea una mesa temporal «Pedido N» y nadie la desactiva al cobrar, así que
 * la rejilla crecía una casilla por pedido —con nombres repetidos, porque el número se reinicia
 * cada día— hasta tapar las mesas de verdad. En la base de pruebas llegó a haber tres «Pedido 1»
 * libres. Las libres se esconden; las que tienen órdenes abiertas siguen, porque a un pedido
 * abierto se le puede sumar otro cliente.
 */
test('los pedidos para llevar ya libres no ocupan la rejilla de mesas', async ({ page }) => {
  await page.goto('/nueva-orden');
  await page.waitForLoadState('networkidle');

  const casillas = page.locator('button').filter({ hasText: /Libre/ });
  await expect(page.getByText(/^Nuevo pedido$/i).first()).toBeVisible({ timeout: 15_000 });

  // Ninguna casilla libre se llama «Pedido N»: esas eran las de pedidos ya cobrados.
  const libres = await casillas.allInnerTexts();
  const pedidosLibres = libres.filter((t) => /^pedido \d+\s/i.test(t.trim()));
  expect(pedidosLibres, 'la rejilla muestra pedidos ya cerrados como mesas libres').toEqual([]);

  // Y las mesas de verdad siguen ahí.
  expect(libres.some((t) => /^mesa /i.test(t.trim()))).toBe(true);
});
