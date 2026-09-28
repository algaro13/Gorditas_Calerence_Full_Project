import { test, expect } from '@playwright/test';
import { cliente, llevarACaja, tarjetaDe, tomarOrden } from './ordenes';

/**
 * El camino completo de una orden: tomarla, surtirla, despacharla y cobrarla.
 *
 * Es el que da de comer al restaurante. Si este se rompe da igual que los botones midan bien,
 * y ya se rompió una vez sin que nada avisara: la pantalla mandaba un `idTipoOrden` fijo y
 * tomar órdenes fallaba en todo restaurante que no fuera el primero dado de alta.
 *
 * Cada paso afirma el efecto, no el clic. Comprobar que el botón se pulsó no prueba nada.
 */

test('una orden llega de la mesa a la caja', async ({ page }) => {
  const nombre = cliente();

  await test.step('se toma', async () => {
    await tomarOrden(page, nombre);
  });

  await test.step('se surte y se despacha', async () => {
    // Los dos pasos viven en `ordenes.ts`: la prueba de promociones necesita lo mismo para ver
    // el descuento donde se cobra, y dos copias divergirían al primer cambio de pantalla.
    await llevarACaja(page, nombre);
  });

  await test.step('se cobra, y solo tras confirmar', async () => {
    await page.goto('/cobrar');
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 15_000 });

    // Cancelar no debe cobrar: es la garantía que se añadió para que un toque de mas no
    // cierre una venta.
    page.once('dialog', (d) => d.dismiss());
    await tarjetaDe(page, nombre, /^Cobrar$/).click();
    await expect(page.getByText(nombre)).toBeVisible();

    page.once('dialog', (d) => {
      expect(d.message(), 'la confirmación debe decir el importe').toMatch(/\$\d/);
      d.accept();
    });
    await tarjetaDe(page, nombre, /^Cobrar$/).click();
    await expect(page.getByText(nombre)).toBeHidden({ timeout: 15_000 });
  });
});
