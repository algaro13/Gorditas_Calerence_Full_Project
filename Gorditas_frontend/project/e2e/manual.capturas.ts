import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { tarjetaDe } from './ordenes';

/**
 * Genera las capturas del manual de Ayuda (public/ayuda/*.jpg) marcando dónde pulsar.
 *
 *   CAPTURAS=1 npx playwright test --project=manual
 *
 * Corre contra el restaurante de demostración LOCAL (npm run dev:seed), a tamaño de teléfono, que
 * es donde se usa el sistema. No es una prueba: si una pantalla cambia, se vuelve a correr y las
 * imágenes se rehacen. Los textos que las acompañan están en src/pages/ayuda/contenido.ts.
 */

const DESTINO = path.resolve('public/ayuda');
mkdirSync(DESTINO, { recursive: true });

/** Dibuja un recuadro rojo con un número sobre cada elemento, como un dedo que señala. */
async function marcar(page: Page, objetivos: Locator[]): Promise<void> {
  // Se lleva a la vista el primero y luego se miden todos: desplazar hacia cada uno movía la
  // página y los recuadros anteriores quedaban fuera de su sitio.
  await objetivos[0].scrollIntoViewIfNeeded({ timeout: 15_000 });
  const cajas = [];
  for (const o of objetivos) {
    const caja = await o.boundingBox({ timeout: 15_000 });
    if (!caja) throw new Error(`No se ve el elemento a marcar: ${o}`);
    cajas.push(caja);
  }
  await page.evaluate((cs) => {
    document.querySelectorAll('[data-marca-ayuda]').forEach((e) => e.remove());
    cs.forEach((c, i) => {
      const r = document.createElement('div');
      r.setAttribute('data-marca-ayuda', '');
      Object.assign(r.style, {
        position: 'fixed', left: `${c.x - 5}px`, top: `${c.y - 5}px`, width: `${c.width + 10}px`, height: `${c.height + 10}px`,
        border: '3px solid #dc2626', borderRadius: '12px', boxShadow: '0 0 0 4px rgba(220,38,38,.25)', zIndex: '99999', pointerEvents: 'none',
      });
      if (cs.length > 1) {
        const n = document.createElement('div');
        n.textContent = String(i + 1);
        Object.assign(n.style, {
          position: 'absolute', top: '-14px', left: '-14px', width: '26px', height: '26px', borderRadius: '50%', background: '#dc2626',
          color: '#fff', font: 'bold 15px system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center',
        });
        r.appendChild(n);
      }
      document.body.appendChild(r);
    });
  }, cajas);
}

async function capturar(page: Page, archivo: string, objetivos: Locator[] = []): Promise<void> {
  // Las animaciones de entrada dejan capturas a medio dibujar.
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  // Las capturas salen del entorno local: en pantalla se leería «localhost». Solo en la imagen,
  // se muestra la dirección que verá un restaurante.
  await page.evaluate(() => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeValue?.includes('localhost')) n.nodeValue = n.nodeValue.replace(/https?:\/\/localhost:\d+/g, 'https://demo.cuadranova.com');
    }
  });
  if (objetivos.length) await marcar(page, objetivos);
  // A la resolución de la página y no a la del teléfono (×3): en el manual se muestran a 320 px y
  // así pesan unos 40 KB en vez de 130.
  await page.screenshot({ path: path.join(DESTINO, archivo), type: 'jpeg', quality: 80, scale: 'css' });
  await page.evaluate(() => document.querySelectorAll('[data-marca-ayuda]').forEach((e) => e.remove()));
}

test('capturas del manual de Ayuda', async ({ page }) => {
  test.setTimeout(240_000);
  // Nombres que se leen bien en el manual. Al final se cobra la orden, así que no se acumulan.
  const cliente = 'María López';
  page.on('dialog', (d) => d.accept());

  // 1. Conoce la pantalla
  await page.goto('/');
  await expect(page.getByText(/bienvenido/i)).toBeVisible({ timeout: 20_000 });
  await capturar(page, 'inicio-panel.jpg', [page.getByText(/^Órdenes Hoy$/).first()]);
  await capturar(page, 'inicio-menu.jpg', [page.getByRole('button', { name: /más/i }).last()]);

  // 2. Tomar una orden: se capturan los pasos antes de crearla con el ayudante de las pruebas.
  await page.goto('/nueva-orden');
  const MESA = 'Mesa 2';
  await capturar(page, 'orden-1-mesa.jpg', [page.getByText(MESA, { exact: true }).filter({ visible: true }).first()]);
  await page.getByText(MESA, { exact: true }).filter({ visible: true }).first().click();
  await page.getByPlaceholder(/nombre del cliente/i).fill(cliente);
  await capturar(page, 'orden-2-cliente.jpg', [page.getByPlaceholder(/nombre del cliente/i), page.getByRole('button', { name: /^(Sig|Siguiente)/ })]);
  await page.getByRole('button', { name: /^(Sig|Siguiente)/ }).click();
  await capturar(page, 'orden-3-platillo.jpg', [page.getByRole('button', { name: /platillo/i }).first(), page.getByRole('button', { name: /producto/i }).first()]);
  await page.getByRole('button', { name: /platillo/i }).first().click();
  await page.getByText(/^Gordita de/i).first().click();
  await page.getByText(/^(Chicharrón prensado|Picadillo|Deshebrada)$/i).first().click();
  await page.getByRole('button', { name: /sin extras/i }).click();
  await page.getByRole('button', { name: /^Agregar$/ }).click();
  await expect(page.getByText(/platillos seleccionados \(1\)/i)).toBeVisible();
  await capturar(page, 'orden-4-crear.jpg', [
    page.getByRole('button', { name: /platillo/i }).first(),
    page.getByRole('button', { name: /cliente/i }).first(),
    page.getByRole('button', { name: /crear orden/i }),
  ]);
  const fallidas: string[] = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/') && r.status() >= 400) fallidas.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname} → ${await r.text().catch(() => '')}`);
  });
  await page.getByRole('button', { name: /crear orden/i }).click();
  // Terminó cuando aparece el aviso de éxito y luego la rejilla de mesas (ver tomarOrden en ordenes.ts).
  await expect(page.getByText(/orden creada/i).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/^Mesa \d+$/).first()).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');
  expect(fallidas, 'peticiones rechazadas al crear la orden').toEqual([]);
  const pedido = cliente;
  // Una orden de $0.00 es una orden sin platillos: en Despachar no tendría nada que entregar.
  await page.goto('/editar-orden');
  await expect(page.getByText(pedido)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/\$(?!0\.00)\d+\.\d{2}/).first()).toBeVisible({ timeout: 10_000 });

  // 3. Cocina
  await page.goto('/surtir-orden');
  await expect(page.getByText(pedido)).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'cocina-surtir.jpg', [tarjetaDe(page, pedido, /surtir todas/i)]);
  await tarjetaDe(page, pedido, /surtir todas/i).click();
  await expect(page.getByText(pedido)).toBeHidden({ timeout: 15_000 });

  // Se entrega para que llegue a Cobrar. No va en el manual: Despachar es del menú del mesero.
  await page.goto('/despachar');
  const entregar = tarjetaDe(page, MESA, /entregar/i);
  await expect(entregar).toBeVisible({ timeout: 15_000 });
  await entregar.click();
  await page.waitForLoadState('networkidle');

  // 5. Cobrar (sin cobrar: solo se señala el botón)
  await page.goto('/cobrar');
  const cobrar = tarjetaDe(page, pedido, /^cobrar$/i);
  await expect(cobrar).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'cobrar.jpg', [cobrar]);
  // Se cobra la orden de las capturas (entorno local) para no dejarla pendiente en la siguiente corrida.
  await tarjetaDe(page, pedido, /^cobrar$/i).click();
  await expect(page.getByText(pedido)).toBeHidden({ timeout: 15_000 });

  // 6. Editar
  await page.goto('/editar-orden');
  await capturar(page, 'editar.jpg', [page.getByText(/órdenes editables/i).first()]);

  // 7. Catálogos y 8. Personal
  await page.goto('/catalogos');
  const selector = page.getByRole('combobox').first();
  await expect(selector).toBeVisible({ timeout: 15_000 });
  await selector.selectOption('platillo');
  await capturar(page, 'catalogos.jpg', [selector, page.getByRole('button', { name: /^nuevo/i }).first()]);
  await selector.selectOption('usuario');
  await expect(page.getByRole('button', { name: /invitar usuario/i })).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'personal.jpg', [page.getByRole('button', { name: /invitar usuario/i })]);

  // 9. Inventario
  await page.goto('/recibir-productos');
  await expect(page.getByRole('button', { name: /nuevo producto/i })).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'inventario.jpg', [page.getByRole('button', { name: /nuevo producto/i })]);

  // 10. Promociones
  await page.goto('/promociones');
  await expect(page.getByRole('button', { name: /nueva promoción/i })).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'promociones.jpg', [page.getByRole('button', { name: /nueva promoción/i })]);

  // 11. Reportes
  await page.goto('/reportes');
  await expect(page.getByText(/total ventas/i)).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'reportes.jpg', [page.getByRole('button', { name: /exportar/i }), page.getByText(/agregar a caja/i).first()]);

  // 12. Configuración
  await page.goto('/configuracion');
  await expect(page.getByText(/paleta de colores/i)).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'configuracion.jpg', [page.getByText(/cambiar imagen/i).first(), page.getByText(/paleta de colores/i)]);

  // 13. Suscripción
  await page.goto('/suscripcion');
  await expect(page.getByRole('heading', { name: 'Suscripción', level: 1 })).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'suscripcion.jpg', [page.getByRole('link', { name: /plan/i }).first()]);
});
