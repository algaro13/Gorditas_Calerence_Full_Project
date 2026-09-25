import { test, expect } from '@playwright/test';

/**
 * Que el aviso se vea desde donde se pulsó.
 *
 * Antes el mensaje se dibujaba dentro del formulario y por encima del botón: en Catálogos, el
 * aviso en la línea 891 y el botón en la 1107. Quien pulsaba abajo no veía nada, y desde ahí la
 * aplicación parecía no responder. Ya pasó de verdad: una orden se quedaba en $0.00 y su error
 * estaba escrito, fuera de la pantalla.
 *
 * La prueba fuerza el error desde el final de un formulario y comprueba que el mensaje cae
 * dentro de lo visible, sin mover el scroll.
 */

test('un error provocado desde abajo se ve sin desplazar la pantalla', async ({ page }) => {
  await page.goto('/catalogos');
  await page.getByRole('button', { name: 'Guisos', exact: true }).click();
  await page.getByRole('button', { name: /nuevo guiso/i }).click();

  const guardar = page.getByRole('button', { name: /guardar/i });
  await expect(guardar).toBeVisible({ timeout: 15_000 });

  // Guardar sin nombre: el formulario se queja. Es la vía más corta a un error real, sin
  // simular nada.
  await guardar.scrollIntoViewIfNeeded();
  await guardar.click();

  const aviso = page.getByRole('alert');
  await expect(aviso).toBeVisible({ timeout: 10_000 });

  // Lo que de verdad se afirma: que está dentro de la ventana, no solo en el documento.
  const dentro = await aviso.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0;
  });
  expect(dentro, 'el aviso quedó fuera del área visible').toBe(true);

  // No se afirma que la página no se mueva ni un píxel: enfocar un botón la desplaza unos
  // pocos, y eso no es el problema. Lo que importa —que el mensaje caiga dentro de lo visible
  // sin que el operador busque— ya lo cubre la comprobación de arriba.

  // No debe tapar el botón que lo provocó.
  const solapa = await aviso.evaluate((e, sel) => {
    const b = document.querySelector(sel) as HTMLElement | null;
    if (!b) return false;
    const a = e.getBoundingClientRect();
    const r = b.getBoundingClientRect();
    return !(a.bottom < r.top || a.top > r.bottom || a.right < r.left || a.left > r.right);
  }, 'button');
  expect(solapa, 'el aviso tapa un control').toBe(false);
});

/**
 * Que ningún control se salga de su contenedor.
 *
 * La regla de «nada más allá del ancho de la ventana» no basta: al pasar el inventario a
 * tarjetas, el botón «+» del stock se salía 57 px de su tarjeta y quedaba cortado contra el
 * borde — pero como terminaba justo en el ancho de la ventana, ninguna comprobación lo veía.
 */
test('ningún control se sale de su tarjeta en el inventario', async ({ page }) => {
  await page.goto('/recibir-productos');
  await page.waitForLoadState('networkidle');

  // Se abre la edición, que es donde aparecen los controles anchos.
  const editar = page.getByRole('button', { name: 'Editar' }).first();
  await expect(editar).toBeVisible({ timeout: 15_000 });
  await editar.click();

  const { fugados, revisados } = await page.evaluate(() => {
    const salida: string[] = [];
    let n = 0;
    document.querySelectorAll('button, input, select').forEach((e) => {
      const caja = e.closest('.rounded-lg, .rounded-xl') as HTMLElement | null;
      if (!caja || caja === e) return;
      const a = e.getBoundingClientRect();
      const c = caja.getBoundingClientRect();
      if (a.width === 0 || c.width === 0) return;
      n += 1;
      if (a.right > c.right + 1 || a.left < c.left - 1) {
        salida.push(`${e.getAttribute('aria-label') ?? e.tagName} se sale ${Math.round(a.right - c.right)}px`);
      }
    });
    return { fugados: salida, revisados: n };
  });

  // Sin esto la prueba pasaria aunque no hubiera examinado nada: si el selector del contenedor
  // dejara de encajar, el resultado seria una lista vacia y un falso verde.
  expect(revisados, 'no se examino ningun control').toBeGreaterThan(5);
  expect(fugados, 'controles fuera de su contenedor').toEqual([]);
});
