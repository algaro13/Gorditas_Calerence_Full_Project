import { test, expect, type Page } from '@playwright/test';
import { cliente, tomarOrden } from './ordenes';

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
  '/suscripcion',
  '/landing',
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

/**
 * Botones a los que no les cabe su propio texto.
 *
 * Un botón encogido por debajo del ancho de su etiqueta no se sale de su tarjeta —cabe dentro—,
 * así que la regla del contenedor no lo ve. Lo que se desborda es el texto: «Guardar» salía
 * cortado a la mitad y «Cancelar» encima.
 */
async function textoQueNoCabe(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('main button')]
      .filter((e) => {
        const el = e as HTMLElement;
        // `truncate` recorta a propósito, con puntos suspensivos: eso no es un fallo.
        return !el.className.includes('truncate') && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0;
      })
      .map((e) => `«${(e as HTMLElement).innerText.trim().slice(0, 20)}» necesita ${e.scrollWidth}px y tiene ${e.clientWidth}`),
  );
}

for (const ruta of RUTAS) {
  test(`${ruta} respeta los mínimos táctiles y de letra`, async ({ page }) => {
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');

    expect(await controlesPequenos(page), `controles por debajo de ${MINIMO_TACTIL}px en ${ruta}`).toEqual([]);
    expect(await textosPequenos(page), `texto por debajo de ${MINIMO_LETRA}px en ${ruta}`).toEqual([]);
    expect(await textoQueNoCabe(page), `botones con el texto desbordado en ${ruta}`).toEqual([]);

    // Un desborde horizontal obliga a arrastrar la pantalla para leer, que en servicio no pasa:
    // simplemente no se lee.
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    expect(desborde, `desborde horizontal en ${ruta}`).toBe(false);
  });
}

/**
 * Lo que no se abre, no se mide.
 *
 * La regla de que ningún control se salga de su tarjeta ya estaba escrita y había una prueba
 * vigilándola. Pero medía las pantallas tal como se abren, y un editor en línea no existe hasta
 * que alguien pulsa «Editar nota». Así llegaron a producción dos editores con «Guardar» y
 * «Cancelar» montados uno sobre otro: en la tarjeta de un platillo no caben tres cosas en fila,
 * los botones se encogían por debajo del ancho de su texto y las palabras se desbordaban.
 *
 * Esta prueba pulsa para abrirlos, mide, y cancela lo que abrió.
 */
test('los editores que se abren al pulsar también caben en su tarjeta', async ({ page }) => {
  const abiertos: string[] = [];

  // La nota de un platillo necesita una orden abierta con platillos. Se toma una: las pruebas
  // del ciclo completo cobran las suyas, asi que apoyarse en lo que haya dejaria esta prueba
  // dependiendo del orden en que corran las demas.
  const nombre = cliente();
  await tomarOrden(page, nombre);

  await page.goto('/editar-orden');
  await page.waitForLoadState('networkidle');
  // Dos pasos: la tarjeta de la mesa y, dentro, la orden. El primer clic abre el resumen del
  // grupo, que no trae los platillos uno a uno; el editor de notas vive en el detalle.
  await page.getByText(nombre).first().click();
  await page.getByText(/^Orden #/).first().click();
  await expect(page.getByRole('heading', { name: 'Platillos' })).toBeVisible({ timeout: 10_000 });
  // Cualquier cosa que acabe en «nota»: asi la prueba tambien encuentra el boton como se
  // llamaba antes —«+ nota», «Edit. nota»—, y se puede comprobar contra el diseño viejo que la
  // medida caza el empalme de verdad.
  const editarNota = page.getByRole('button', { name: /nota$/i }).first();
  if (await editarNota.count()) {
    await editarNota.scrollIntoViewIfNeeded();
    await editarNota.click();
    await page.waitForTimeout(500);
    abiertos.push('nota de un platillo');
  }

  // El editor de caja del reporte se abre en su propia pantalla; se mide aquí mismo cuando toca.
  const fugados = await page.evaluate(() => {
    const salida: string[] = [];
    document.querySelectorAll('button, input, select, textarea').forEach((e) => {
      const caja = e.closest('.rounded-lg, .rounded-xl, .rounded-md') as HTMLElement | null;
      if (!caja || caja === e) return;
      const a = e.getBoundingClientRect();
      const c = caja.getBoundingClientRect();
      if (a.width === 0 || c.width === 0) return;
      const el = e as HTMLElement;
      const nombre = (el.innerText || el.getAttribute('placeholder') || el.tagName).trim().slice(0, 20);
      if (a.right > c.right + 1 || a.left < c.left - 1) {
        salida.push(`«${nombre}» se sale ${Math.round(Math.max(a.right - c.right, c.left - a.left))}px de su tarjeta`);
      }
      // Y el caso que de verdad ocurrio: el boton NO se sale de la tarjeta —se encoge dentro de
      // ella— y lo que se desborda es su propio texto. «Guardar» salia cortado a la mitad y
      // «Cancelar» encima. Medir solo contra el contenedor no lo veia.
      if (e.tagName === 'BUTTON' && !el.className.includes('truncate') && e.scrollWidth > e.clientWidth + 1) {
        salida.push(`«${nombre}» no le cabe su propio texto (${e.scrollWidth} en ${e.clientWidth}px)`);
      }
    });
    return salida;
  });

  // Se cancela lo que se abrió: medir no puede cambiar datos.
  const cancelar = page.getByRole('button', { name: /^cancelar$/i }).first();
  if (await cancelar.count()) await cancelar.click();

  // Sin esto, el día que el selector deje de encontrar el editor la prueba pasaría sin haber
  // medido nada, que es exactamente como se colaron estos dos.
  expect(abiertos, 'no se abrió ningún editor: la prueba no midió nada').not.toEqual([]);
  expect(fugados, 'controles fuera de su tarjeta con el editor abierto').toEqual([]);
});
