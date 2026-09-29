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

test('un combo entra en la orden como lo que lleva, y la caja cobra su precio', async ({ page }) => {
  await page.goto('/promociones');
  await page.waitForLoadState('networkidle');
  await sinPromocionesActivas(page);

  // Del catálogo que siembra `npm run dev:seed`: una gordita y un producto con existencia.
  const platillos = (await api(page, 'GET', '/catalogos/platillo?limit=100')).cuerpo.data.items;
  const productos = (await api(page, 'GET', '/catalogos/producto?limit=100')).cuerpo.data.items;
  const gordita = platillos.find((p: { nombre: string; activo: boolean }) => /^Gordita de/i.test(p.nombre) && p.activo);
  const bebida = productos.find((p: { cantidad: number; activo: boolean }) => p.activo && p.cantidad >= 1);
  expect(gordita, 'el catálogo de pruebas no tiene gorditas').toBeDefined();
  expect(bebida, 'el catálogo de pruebas no tiene productos con existencia').toBeDefined();

  // Diez pesos menos que sus artículos a precio de carta.
  const carta = Number(gordita.precio) * 2 + Number(bebida.costo);
  const nombre = `Combo E2E ${Date.now()}`;
  const creada = await api(page, 'POST', '/promociones', {
    nombre,
    forma: 'combo',
    precio: carta - 10,
    items: [
      { idPlatillo: gordita._id, cantidad: 2 },
      { idProducto: bebida._id, cantidad: 1 },
    ],
  });
  expect(creada.estado).toBe(201);

  try {
    const quien = cliente();
    await page.goto('/nueva-orden');
    await page.getByText(/^Nuevo pedido$/i).first().click();
    await page.getByPlaceholder(/nombre del cliente/i).fill(quien);
    await page.getByRole('button', { name: /^(Sig|Siguiente)/ }).click();

    // Se elige el combo y el guiso de cada gordita; nada más.
    await page.getByRole('button', { name: /combo/i }).first().click();
    await page.getByRole('button', { name: new RegExp(nombre) }).click();
    const guisos = page.locator('select');
    await expect(guisos).toHaveCount(2);
    for (let i = 0; i < 2; i++) await guisos.nth(i).selectOption({ index: 1 });
    await page.getByRole('button', { name: /^Agregar combo$/ }).click();

    // Entra como sus artículos: las dos gorditas y la bebida, no una línea que diga «combo».
    await expect(page.getByText(/platillos seleccionados \(2\)/i)).toBeVisible();
    await expect(page.getByText(/productos seleccionados \(1\)/i)).toBeVisible();
    await page.getByRole('button', { name: /crear orden/i }).click();
    await expect(page.getByText(/^Mesa \d+$/).first()).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState('networkidle');

    await llevarACaja(page, quien);
    await page.goto('/cobrar');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(quien).first()).toBeVisible({ timeout: 15_000 });
    await page.getByText(quien).first().click();

    // La caja explica la resta: el combo con su nombre y lo que quitó.
    await expect(page.getByText(nombre).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('-$10.00').first()).toBeVisible();
    await expect(page.getByText(`$${(carta - 10).toFixed(2)}`).first()).toBeVisible();
  } finally {
    await sinPromocionesActivas(page);
  }
});

/**
 * Los campos numéricos se pueden vaciar con el teclado.
 *
 * Convertían en cada tecla (`parseFloat(v) || 0`): al borrar el último dígito el valor volvía a
 * 0 y el campo nunca quedaba vacío, así que no había forma de quitar el «0» del precio ni el «1»
 * de la cantidad. Las pruebas no lo veían porque `fill()` sustituye el valor de una vez; aquí se
 * borra tecla a tecla, como lo hace una persona.
 */
test('el precio y la cantidad de un combo se pueden borrar y reescribir', async ({ page }) => {
  const nombre = `Combo teclado ${Date.now()}`;
  await page.goto('/promociones');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: /nueva promoción/i }).click();
  await page.getByPlaceholder('Martes de gorditas').fill(nombre);
  await page.getByRole('button', { name: /^Combo/ }).click();

  // Un artículo: la cantidad nace en 1.
  const agregar = page.locator('select').filter({ hasText: /Agregar artículo/ });
  await agregar.selectOption({ index: 1 });

  const precio = page.locator('input[type="number"]').first();
  const cantidad = page.locator('input[type="number"]').nth(1);
  await expect(cantidad).toHaveValue('1');

  // Se borra con el teclado y queda vacío; no reaparece el valor anterior.
  await precio.click();
  await precio.press('Control+a');
  await precio.press('Backspace');
  await expect(precio).toHaveValue('');
  await precio.pressSequentially('60');
  await expect(precio).toHaveValue('60');

  await cantidad.click();
  await cantidad.press('End');
  await cantidad.press('Backspace');
  await expect(cantidad).toHaveValue('');

  // Vacía no se guarda: lo dice en vez de mandar un combo sin cantidad.
  await page.getByRole('button', { name: /^Guardar$/ }).click();
  await expect(page.getByText(/cantidad de al menos 1/i)).toBeVisible();

  await cantidad.pressSequentially('3');
  await expect(cantidad).toHaveValue('3');
  await page.getByRole('button', { name: /^Guardar$/ }).click();
  await expect(page.getByText(nombre).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/3× .* por \$60\.00/).first()).toBeVisible();

  await sinPromocionesActivas(page);
});
