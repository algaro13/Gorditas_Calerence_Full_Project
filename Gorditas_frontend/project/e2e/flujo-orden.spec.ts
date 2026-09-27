import { test, expect } from '@playwright/test';
import { cliente, tarjetaDe, tomarOrden } from './ordenes';

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

  await test.step('se surte', async () => {
    await page.goto('/surtir-orden');
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 15_000 });
    // Acotado a la tarjeta de ESTA orden. Con `.first()` la prueba pulsaba la de otra mesa
    // cuando había órdenes de corridas anteriores, y fallaba aquí sin explicar por qué.
    await tarjetaDe(page, nombre, /surtir todas/i).click();
    await expect(page.getByText(nombre)).toBeHidden({ timeout: 15_000 });
  });

  await test.step('se despacha', async () => {
    await page.goto('/despachar');
    // Se espera a que la orden esté en pantalla antes de pulsar: ir directo al botón lo
    // buscaba mientras la lista aún cargaba y agotaba el tiempo sin decir por qué.
    // Se entrega TODO lo pendiente en vez de buscar esta orden: Despachar agrupa por mesa y no
    // muestra el cliente hasta expandir, así que acotarla aquí exigía adivinar el nombre de la
    // mesa. En una base de pruebas entregar de más es inocuo, y la aserción precisa vuelve en
    // el paso siguiente, donde Cobrar sí lista al cliente.
    const entregar = page.getByRole('button', { name: /entregar/i });
    await page.waitForLoadState('networkidle');
    // Sin exigir que haya algo pendiente: la lista depende de lo que dejaran otras corridas, y
    // el paso siguiente —cobrar ESTA orden por su nombre— es la prueba de que llegó a la caja.
    while (await entregar.count()) {
      await entregar.first().click();
      await page.waitForLoadState('networkidle');
    }
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
