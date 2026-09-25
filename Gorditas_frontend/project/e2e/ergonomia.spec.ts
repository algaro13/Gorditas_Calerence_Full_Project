import { test, expect, type Page } from '@playwright/test';

/**
 * El estándar, como regla que se ejecuta.
 *
 * Estos límites se midieron a mano una vez y 136 de 161 botones ya estaban por debajo. Un
 * criterio que solo revisa una persona es un criterio que se va: esta suite existe para que la
 * próxima vez lo diga una prueba y no haga falta que alguien se acuerde de medir.
 *
 * Los números vienen de Apple HIG (44 pt), WCAG 2.5.5 (44 px) y Material (48 dp), y de que el
 * dedo promedio mide 1.6–2 cm. Ver docs/estandar-ui.md.
 */

const RUTAS = [
  '/',
  '/nueva-orden',
  '/editar-orden',
  '/surtir-orden',
  '/recibir-productos',
  '/cobrar',
  '/catalogos',
  '/reportes',
  '/configuracion',
];

const MINIMO_TACTIL = 44;
const MINIMO_LETRA = 14;

/** Devuelve los controles que no llegan al mínimo, con su tamaño, para que el fallo sea útil. */
async function controlesPequenos(page: Page) {
  return page.evaluate((min) => {
    const sel = 'button, a[href], input, select, textarea, [role="button"]';
    return [...document.querySelectorAll(sel)]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
      })
      .map((e) => {
        const r = e.getBoundingClientRect();
        const el = e as HTMLInputElement;
        return {
          // Las casillas se quedan en 24 px a propósito: el objetivo real es su etiqueta.
          casilla: el.type === 'checkbox' || el.type === 'radio',
          // El texto solo no basta para encontrarlo: un control de 24×24 con la letra «A» no
          // se localiza en 800 líneas. Con etiqueta y clases, sí.
          texto: (el.innerText || el.value || el.type || e.tagName).trim().slice(0, 30),
          etiqueta: e.tagName.toLowerCase(),
          clases: (e.className ?? '').toString().slice(0, 60),
          ancho: Math.round(r.width),
          alto: Math.round(r.height),
        };
      })
      .filter((c) => !c.casilla && (c.ancho < min || c.alto < min));
  }, MINIMO_TACTIL);
}

async function textosPequenos(page: Page) {
  return page.evaluate((min) => {
    return [...document.querySelectorAll('main *')]
      .filter((e) => e.children.length === 0 && (e.textContent ?? '').trim())
      .map((e) => ({
        texto: (e.textContent ?? '').trim().slice(0, 30),
        px: parseFloat(getComputedStyle(e).fontSize),
      }))
      .filter((t) => t.px < min);
  }, MINIMO_LETRA);
}

for (const ruta of RUTAS) {
  test(`${ruta} respeta los mínimos táctiles y de letra`, async ({ page }) => {
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');

    expect(await controlesPequenos(page), `controles por debajo de ${MINIMO_TACTIL}px en ${ruta}`).toEqual([]);
    expect(await textosPequenos(page), `texto por debajo de ${MINIMO_LETRA}px en ${ruta}`).toEqual([]);

    // Un desborde horizontal obliga a arrastrar la pantalla para leer, que en servicio no pasa:
    // simplemente no se lee.
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    expect(desborde, `desborde horizontal en ${ruta}`).toBe(false);
  });
}
