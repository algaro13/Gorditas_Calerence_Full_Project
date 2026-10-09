import { test, expect, type Page, type Route } from '@playwright/test';
import { cliente, tarjetaDe, tomarOrden } from './ordenes';

/**
 * El servicio va en orden de llegada: lo que se pidió primero se surte y se cobra primero.
 *
 * Las órdenes salen de respuestas fijas de la API y no de la base: el orden depende de la hora
 * de cada orden, y con órdenes reales todas tendrían segundos de diferencia y el mismo orden en
 * que se crean, así que la prueba no distinguiría «por llegada» de «por nombre» o «por número».
 * Las mesas se eligen para eso: la que llega primero tiene el nombre y el número más altos.
 */

const hora = (min: number, seg = 0) => new Date(Date.UTC(2026, 9, 9, 15, min, seg)).toISOString();

type Mesa = { id: number; nombre: string };
const MESA_3: Mesa = { id: 903, nombre: 'Mesa 3' };
const MESA_1: Mesa = { id: 901, nombre: 'Mesa 1' };
const MESA_7: Mesa = { id: 907, nombre: 'Mesa 7' };
const MESA_2: Mesa = { id: 902, nombre: 'Mesa 2' };

function orden(id: string, mesa: Mesa, cliente: string, min: number, estatus: string, platillos: string[]) {
  const cabecera = {
    _id: id,
    folio: `ORD-${id}`,
    idTipoOrden: 2,
    nombreTipoOrden: 'En mesa',
    estatus,
    idMesa: mesa.id,
    nombreMesa: mesa.nombre,
    nombreCliente: cliente,
    fechaHora: hora(min),
    fechaPago: null,
    total: 25 * platillos.length,
    notas: null,
    createdAt: hora(min),
    updatedAt: hora(min),
  };
  const sub = `${id}-sub`;
  const detalle = {
    ...cabecera,
    subordenes: [{ _id: sub, idOrden: id, nombre: cliente, createdAt: hora(min) }],
    productos: [],
    // Como las devuelve el backend: en el orden en que se capturaron.
    platillos: platillos.map((nombre, i) => ({
      _id: `${id}-p${i}`,
      idSuborden: sub,
      idPlatillo: i + 1,
      nombrePlatillo: nombre,
      idGuiso: 1,
      nombreGuiso: 'Chicharrón prensado',
      costoPlatillo: 25,
      cantidad: 1,
      importe: 25,
      notas: null,
      listo: false,
      entregado: false,
      createdAt: hora(min, i + 1),
      extras: [],
    })),
    extras: [],
    descuentos: [],
  };
  return { cabecera, detalle };
}

const ORDENES = [
  // Cocina: Mesa 3 pide primero y vuelve a pedir después de Mesa 1.
  orden('k1', MESA_3, 'Llegó primero', 0, 'Recepcion', ['Gordita de chicharrón', 'Gordita de picadillo']),
  orden('k2', MESA_1, 'Llegó segundo', 5, 'Recepcion', ['Gordita de deshebrada']),
  orden('k3', MESA_3, 'Llegó tercero', 10, 'Recepcion', ['Quesadilla']),
  // Caja: Mesa 7 se surte de una orden anterior a la de Mesa 2.
  orden('c1', MESA_7, 'Cobro A', -60, 'Surtida', ['Gordita de chicharrón']),
  orden('c2', MESA_2, 'Cobro B', -50, 'Surtida', ['Gordita de chicharrón']),
  orden('c3', MESA_7, 'Cobro C', -40, 'Surtida', ['Gordita de chicharrón']),
];

async function conOrdenes(page: Page) {
  const responder = (route: Route, data: unknown) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });

  await page.route(
    (url) => /\/api\/ordenes\/?$/.test(url.pathname),
    (route) =>
      // El backend las devuelve de la más nueva a la más vieja; las pantallas deben reordenarlas.
      responder(route, {
        ordenes: [...ORDENES].map((o) => o.cabecera).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)),
        pagination: { page: 1, limit: 1000, total: ORDENES.length, pages: 1 },
      }),
  );
  await page.route(
    (url) => /\/api\/ordenes\/[^/]+$/.test(url.pathname),
    (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const id = new URL(route.request().url()).pathname.split('/').pop();
      const o = ORDENES.find((x) => x.cabecera._id === id);
      return o ? responder(route, o.detalle) : route.fallback();
    },
  );
}

/**
 * Verifica que los textos aparecen en la página en ese orden: cada uno se busca después del
 * anterior, porque un mismo nombre sale en el resumen de la mesa y otra vez al abrirla.
 */
async function enOrden(page: Page, textos: string[]) {
  await expect
    .poll(async () => {
      const todo = await page.locator('main').innerText();
      let desde = 0;
      for (const t of textos) {
        const p = todo.indexOf(t, desde);
        if (p < 0) return false;
        desde = p + t.length;
      }
      return true;
    }, { message: `en este orden: ${textos.join(' → ')}`, timeout: 15_000 })
    .toBe(true);
}

test('cocina: mesas, órdenes y platillos en orden de llegada', async ({ page }) => {
  await conOrdenes(page);
  await page.goto('/surtir-orden');

  // Mesa 3 lleva más tiempo esperando, aunque por nombre y por número iría después de Mesa 1.
  await enOrden(page, ['Mesa 3', 'Mesa 1']);
  // En el resumen de la mesa, sus clientes en el orden en que pidieron.
  await enOrden(page, ['Llegó primero, Llegó tercero']);

  await page.getByRole('heading', { name: 'Mesa 3' }).click();
  // Dentro de la mesa, la primera orden arriba; dentro de la orden, el primer platillo arriba.
  await enOrden(page, ['Cliente: Llegó primero', 'Gordita de chicharrón', 'Gordita de picadillo', 'Cliente: Llegó tercero', 'Quesadilla']);
});

test('caja: las mesas se cobran en orden de llegada, no por nombre', async ({ page }) => {
  await conOrdenes(page);
  await page.goto('/cobrar');

  await enOrden(page, ['Mesa 7', 'Mesa 2']);
  await expect(page.getByText('Mesa 1', { exact: true })).toHaveCount(0);

  // Los clientes del encabezado de la mesa, y después las órdenes al abrirla: las dos listas en orden.
  await page.getByRole('heading', { name: 'Mesa 7' }).click();
  await enOrden(page, ['Mesa 7', 'Cobro A', 'Cobro C', 'Cobro A', 'Cobro C', 'Mesa 2']);
});

test('editar: agregar un platillo no cambia la hora de la orden', async ({ page }) => {
  // Con datos reales: es el backend el que guarda la hora, y lo que se prueba es que nadie la toque.
  const nombre = cliente();
  await tomarOrden(page, nombre);

  const horaEnLista = async () => {
    const [respuesta] = await Promise.all([
      page.waitForResponse((r) => /\/api\/ordenes\?/.test(r.url()) && r.request().method() === 'GET'),
      page.goto('/editar-orden'),
    ]);
    const { data } = await respuesta.json();
    return (data.ordenes as { nombreCliente: string; fechaHora: string }[]).find((o) => o.nombreCliente === nombre)?.fechaHora;
  };
  const antes = await horaEnLista();
  expect(antes).toBeTruthy();

  const cambiosDeHora: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/fecha-hora')) cambiosDeHora.push(`${r.method()} ${r.url()}`);
  });

  await tarjetaDe(page, nombre, /platillo/i).click();
  await page.getByText(/^Quesadilla/).first().click();
  await page.getByText(/^(Chicharrón prensado|Picadillo|Deshebrada)$/i).first().click();
  await page.getByRole('button', { name: /sin extras/i }).click();
  await page.getByRole('button', { name: /^Agregar$/ }).click();
  await expect(page.getByText(/platillo agregado/i)).toBeVisible({ timeout: 15_000 });

  expect(cambiosDeHora).toEqual([]);
  expect(await horaEnLista()).toBe(antes);
});
