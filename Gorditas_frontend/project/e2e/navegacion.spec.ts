import { test, expect } from '@playwright/test';

/**
 * Que la navegación esté donde llega el pulgar y diga adónde lleva.
 *
 * El riel de iconos ocupaba 70 de 375 px —un 19 % del ancho— en la esquina alta e izquierda, la
 * peor para el pulgar, y no llevaba ni una palabra: nueve dibujos que había que aprender.
 *
 * Lo que se afirma aquí no es la apariencia sino las tres cosas que pueden romperse en
 * silencio: que los destinos se lean, que lleven a su pantalla, y que la barra no tape lo que
 * hay debajo de ella.
 */

const BARRA = 'nav[aria-label="Navegación principal"]';

test('la barra de abajo lleva nombres escritos y navega', async ({ page }) => {
  await page.goto('/');
  const barra = page.locator(BARRA);
  await expect(barra).toBeVisible({ timeout: 15_000 });

  // Cada destino con su nombre. Un icono suelto sería volver al riel.
  const nombres = await barra.locator('a, button').allInnerTexts();
  expect(nombres.length, 'la barra quedó vacía').toBeGreaterThan(2);
  for (const n of nombres) {
    expect(n.trim().length, `un destino sin nombre: ${JSON.stringify(n)}`).toBeGreaterThan(2);
  }

  // Y que de verdad lleven: se pulsa el segundo, que nunca es la pantalla de inicio.
  const destino = barra.locator('a').nth(1);
  const ruta = await destino.getAttribute('href');
  await destino.click();
  await expect(page).toHaveURL(new RegExp(`${ruta}$`));

  // El destino activo se distingue: sin eso la barra no dice dónde estás.
  await expect(barra.locator(`a[href="${ruta}"]`)).toHaveClass(/orange/);
});

test('la barra no tapa el último control de la pantalla', async ({ page }) => {
  await page.goto('/catalogos');
  await page.waitForLoadState('networkidle');

  const tapados = await page.evaluate((sel) => {
    const barra = document.querySelector(sel) as HTMLElement | null;
    if (!barra) return ['no hay barra que comprobar'];
    // Se lleva la pantalla al final: es donde el problema aparece, porque el hueco reservado
    // abajo es justo lo que impide que el último control quede debajo de la barra.
    //
    // Quien desplaza es `main`, no la ventana: el armazón es de alto fijo con su propio
    // desbordamiento. `window.scrollTo` no movía nada, y la prueba señalaba como tapados unos
    // controles que solo estaban sin desplazar.
    const zona = document.querySelector('main');
    if (zona) zona.scrollTop = zona.scrollHeight;
    const b = barra.getBoundingClientRect();
    const salida: string[] = [];
    document.querySelectorAll('main button, main a, main input').forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      // Solapa con la barra y su centro cae dentro de ella: intocable.
      const centro = r.top + r.height / 2;
      if (centro > b.top && centro < b.bottom) {
        salida.push(`${(e as HTMLElement).innerText?.trim().slice(0, 24) || e.tagName} bajo la barra`);
      }
    });
    return salida;
  }, BARRA);

  expect(tapados, 'controles inalcanzables bajo la barra').toEqual([]);
});

test('en escritorio no hay barra de abajo y vuelve el menú lateral', async ({ page }) => {
  // La barra es para el teléfono. En escritorio sobra: hay sitio de más y el menú lateral
  // completo ya está a la vista.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const estado = await page.evaluate((sel) => {
    const barra = document.querySelector(sel) as HTMLElement | null;
    const lateral = document.querySelector('aside') as HTMLElement | null;
    const contenido = document.querySelector('main > div') as HTMLElement | null;
    return {
      altoBarra: barra ? barra.offsetHeight : 0,
      anchoLateral: lateral ? Math.round(lateral.getBoundingClientRect().width) : 0,
      // El hueco de abajo vuelve al margen normal: la barra publica su altura en
      // `--hueco-nav` y en escritorio no se dibuja, así que la variable cae sola.
      hueco: contenido ? getComputedStyle(contenido).paddingBottom : '',
    };
  }, BARRA);

  expect(estado.altoBarra, 'la barra de abajo sigue en escritorio').toBe(0);
  expect(estado.anchoLateral, 'el menú lateral no volvió').toBeGreaterThan(100);
  expect(estado.hueco, 'el hueco de la barra sobra en escritorio').toBe('32px');
});

/**
 * Que el hueco reservado abajo alcance para la barra.
 *
 * Es el mecanismo que falló al implementarla: el hueco estaba escrito a mano como 5.5 rem
 * suponiendo una fila de iconos, y con las etiquetas partidas en dos líneas la barra mide 97 px,
 * así que el aviso flotante quedaba 9 px por debajo de su borde. Ahora la barra publica su
 * altura medida en `--hueco-nav`, y de ahí salen tanto el hueco del contenido como la posición
 * del aviso.
 *
 * Se afirma sobre la variable y no sobre un aviso concreto porque es lo que gobierna a los dos,
 * y porque no depende de que una pantalla tenga datos para provocar un mensaje.
 */
test('el hueco de abajo cubre la altura real de la barra', async ({ page }) => {
  await page.goto('/catalogos');
  await page.waitForLoadState('networkidle');

  const medidas = await page.evaluate((sel) => {
    const barra = document.querySelector(sel) as HTMLElement;
    const hueco = getComputedStyle(document.documentElement).getPropertyValue('--hueco-nav');
    return { alto: barra.offsetHeight, hueco: parseFloat(hueco) };
  }, BARRA);

  expect(medidas.alto, 'la barra no se dibujó').toBeGreaterThan(40);
  expect(medidas.hueco, 'el hueco no cubre la barra').toBeGreaterThanOrEqual(medidas.alto);
});
