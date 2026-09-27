import { test, expect } from '@playwright/test';

/**
 * Que un reporte se pueda leer en un teléfono.
 *
 * Era la pantalla con más tabla del sistema: ocho, medidas a 375 px. La de órdenes del día
 * llegaba a 577 px —se salía más que el ancho entero de la pantalla— y dentro de una de sus
 * celdas vivían otras tres con su propio arrastre lateral. Como en el resto del sistema, la
 * columna que quedaba fuera era «Acciones».
 */


/**
 * El periodo, ensanchado a mano.
 *
 * Nacio por un fallo —el reporte abria en «hoy» calculado en UTC y desde las 18:00 en Mexico
 * pedia el dia siguiente—, pero eso ya esta arreglado y lo comprueba la ultima prueba de este
 * archivo.
 *
 * Se conserva por otra razon: estas pruebas necesitan un dia con ventas, y el dia de hoy puede
 * no tener ninguna segun cuando se corran. Se pide una semana, que contiene al dia que tenga
 * datos caiga donde caiga. Quitarlo las dejaria dependiendo de que otra prueba de la suite haya
 * creado una orden antes, que es una atadura invisible entre archivos.
 */
async function periodoAmplio(page: import('@playwright/test').Page) {
  const dia = (desplazamiento: number) => {
    const d = new Date();
    d.setDate(d.getDate() + desplazamiento);
    return d.toISOString().slice(0, 10);
  };
  const fechas = page.locator('input[type="date"]');
  await fechas.nth(0).fill(dia(-7));
  await fechas.nth(1).fill(dia(1));
  await page.waitForTimeout(1500);
}

const PESTANAS = ['Ventas', 'Inventario', 'Productos Vendidos', 'Gastos'];

test('ninguna pestaña de reportes obliga a arrastrar de lado', async ({ page }) => {
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');

  for (const pestana of PESTANAS) {
    await page.getByRole('button', { name: pestana, exact: true }).click();
    await page.waitForTimeout(800);

    const problemas = await page.evaluate(() => {
      const salida: string[] = [];
      const ancho = window.innerWidth;

      // Nada dibujado más allá del borde.
      document.querySelectorAll('main *').forEach((e) => {
        if (e.getBoundingClientRect().right > ancho + 1) {
          salida.push(`«${(e as HTMLElement).innerText?.trim().slice(0, 20)}» se sale`);
        }
      });

      // Y ningún contenedor que se arrastre por dentro, que es la forma de esconder lo mismo.
      document.querySelectorAll('main *').forEach((e) => {
        if (e.scrollWidth > e.clientWidth + 4 && e.clientWidth > 80) {
          salida.push(`«${(e as HTMLElement).innerText?.trim().slice(0, 20)}» se arrastra`);
        }
      });

      return salida;
    });

    expect(problemas, `en la pestaña ${pestana}`).toEqual([]);
  }
});

test('las órdenes del día y su detalle se leen sin tabla en el teléfono', async ({ page }) => {
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');

  await periodoAmplio(page);

  const verOrdenes = page.getByRole('button', { name: /ver órdenes/i }).first();
  await expect(verOrdenes).toBeVisible({ timeout: 15_000 });
  await verOrdenes.click();

  const verDetalles = page.getByRole('button', { name: /ver detalles/i }).first();
  await expect(verDetalles).toBeVisible({ timeout: 10_000 });
  await verDetalles.click();

  // El detalle se abre en su sitio y trae sus apartados escritos.
  await expect(page.getByText('Productos', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /ocultar/i }).first()).toBeVisible();

  // Y sigue sin haber tabla ninguna a este ancho: eran tres anidadas dentro de otra.
  const tablas = await page.evaluate(
    () => [...document.querySelectorAll('table')].filter((t) => t.offsetParent !== null).length
  );
  expect(tablas, 'quedó una tabla visible en el teléfono').toBe(0);
});

test('el monto de caja se edita desde la tarjeta y cuadra con el total', async ({ page }) => {
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');

  await periodoAmplio(page);

  // Es el único dato que se escribe desde este reporte, y vivía dentro de una celda de la
  // tabla. Al pasar a tarjetas es lo que más fácil se rompe sin que se note.
  // Se apunta a lo que se ve. Las dos presentaciones existen en el documento a la vez y la
  // tabla lleva los mismos nombres; un `.first()` a ciegas acertaría hoy por el orden del DOM y
  // dejaría de acertar el día que cambie.
  const visible = (nombre: string) =>
    page.getByRole('button', { name: nombre }).locator('visible=true').first();

  // El primero: el periodo abarca varios dias y cada uno trae su tarjeta con su propia caja.
  const editar = visible('Editar monto de caja');
  await expect(editar).toBeVisible({ timeout: 15_000 });
  await editar.click();

  const campo = page.getByLabel('Monto de caja').locator('visible=true').first();

  // Una cifra que no pueda confundirse con ningun total de la pantalla: asi la comprobacion
  // dice algo aunque las ventas del dia cambien de una corrida a otra.
  await campo.fill('137.13');
  await visible('Confirmar monto').click();

  // El total de arriba tiene que moverse con el: son el mismo dato.
  await expect(page.getByText('$137.13').first()).toBeVisible({ timeout: 10_000 });

  // Y que no viva en el navegador. Estaba en `localStorage`: no se compartia entre dispositivos,
  // no entraba en el respaldo y dos restaurantes abiertos en el mismo navegador compartian la
  // misma llave. Se borran esas llaves y se recarga: si la cifra sigue ahi, viene del servidor.
  //
  // Se borran solo las de la caja, no todo el almacenamiento: en localhost el restaurante se
  // resuelve con `devTenantSlug`, que tambien vive ahi, y un `clear()` dejaba la aplicacion en
  // la pantalla de entrar.
  await page.evaluate(() => {
    localStorage.removeItem('montoCajaPorFecha');
    localStorage.removeItem('montoCajaPorFecha.importado');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await periodoAmplio(page);
  await expect(page.getByText('$137.13').first()).toBeVisible({ timeout: 15_000 });

  // Se deja como estaba, que la prueba corre contra datos compartidos. Y se comprueba que la
  // devolucion ocurrio: sin esto, la siguiente corrida arrastraria la cifra de esta.
  await visible('Editar monto de caja').click();
  await campo.fill('0');
  await visible('Confirmar monto').click();
  await expect(page.getByText('$137.13')).toHaveCount(0, { timeout: 10_000 });
});

/**
 * Que el detalle de una orden muestre lo que se vendió en ella.
 *
 * Durante meses dijo «No hay platillos.» en todas. El vínculo entre la orden y sus platillos se
 * adivinaba comparando los siete primeros caracteres de dos identificadores —algo que funcionaba
 * con ObjectId de Mongo y con UUID no acierta nunca—, así que el reporte afirmaba que en ninguna
 * orden se había vendido nada. La tabla lo escondía; las tarjetas lo pusieron por escrito.
 *
 * Contar líneas no bastaría: lo que se rompió fue el vínculo. Por eso se comprueba que los
 * importes del detalle sumen el total de su orden.
 */
test('el detalle de una orden muestra sus platillos y cuadra con su total', async ({ page }) => {
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');
  await periodoAmplio(page);

  await page.getByRole('button', { name: /ver órdenes/i }).first().click();

  const detalles = page.getByRole('button', { name: /ver detalles/i });
  const cuantas = Math.min(await detalles.count(), 5);
  expect(cuantas, 'no había ninguna orden que mirar').toBeGreaterThan(0);

  const cuadran: string[] = [];

  for (let i = 0; i < cuantas; i++) {
    await detalles.nth(i).click();

    // Si no hay ninguna linea de total, el detalle esta vacio: es el fallo, no un fallo de la
    // prueba. Se mide con `count` en vez de leer directamente, porque leer un elemento que no
    // existe agota el tiempo de espera y entonces el informe diria «timeout» en lugar de decir
    // que ninguna orden mostro lo que se vendio en ella.
    const totales = page.locator('div').filter({ hasText: /Total platillos|Total productos/ });
    const texto = (await totales.count()) > 0 ? await totales.last().innerText() : '';

    // El total de la orden, tal como lo muestra su propia tarjeta.
    const tarjeta = await page.getByRole('button', { name: /ocultar/i }).first()
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
      .innerText();

    const importes = (etiqueta: RegExp) => {
      const m = texto.match(etiqueta);
      return m ? parseFloat(m[1]) : 0;
    };
    const platillos = importes(/Total platillos[^$]*\$([\d.]+)/);
    const productos = importes(/Total productos[^$]*\$([\d.]+)/);
    const total = parseFloat(tarjeta.match(/Total\s*\$([\d.]+)/)?.[1] ?? '0');

    if (platillos + productos > 0) {
      cuadran.push(`${(platillos + productos).toFixed(2)} vs ${total.toFixed(2)}`);
      expect(
        Math.abs(platillos + productos - total),
        `los importes del detalle no suman el total de la orden: ${platillos} + ${productos} ≠ ${total}`
      ).toBeLessThan(0.01);
    }

    await page.getByRole('button', { name: /ocultar/i }).first().click();
  }

  // Sin esto la prueba pasaría con todas las órdenes vacías, que es exactamente el fallo.
  expect(cuadran.length, 'ninguna orden mostró lo que se vendió en ella').toBeGreaterThan(0);
});

/**
 * Que el reporte abra en el dia del restaurante.
 *
 * Abria en el de Greenwich: `new Date().toISOString()` da la fecha en UTC, y en Mexico son seis
 * horas de mas. A las 18:04 del 25 la pantalla ya pedia el 26, asi que el reporte salia en ceros
 * durante toda la cena — la franja en la que mas se consulta.
 *
 * Se fija el reloj a proposito. Sin fijarlo, la afirmacion solo diria algo entre las 18:00 y la
 * medianoche; el resto del dia pasaria igual con el fallo dentro, que es como sobrevivio tanto
 * tiempo.
 */
test('el reporte abre en el dia del negocio, no en el de Greenwich', async ({ page }) => {
  // Un instante que cae en dias distintos segun donde se mire: pasada la medianoche en Greenwich
  // y todavia la tarde anterior en Ciudad de Mexico.
  //
  // Se elige siempre hacia atras. Hacia adelante el salto puede pasar de la caducidad del token
  // que la sesion dejo guardado, y entonces la aplicacion se va a la pantalla de entrar y la
  // prueba falla por algo que no tiene nada que ver. Ese fallo aparecia solo a ciertas horas del
  // dia, que es la peor clase de prueba: la que se rompe sola de madrugada.
  const instante = new Date();
  instante.setUTCHours(0, 30, 0, 0);
  if (instante > new Date()) instante.setUTCDate(instante.getUTCDate() - 1);
  const enMexico = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
  expect(enMexico, 'el instante elegido no distingue las dos zonas').not.toBe(
    instante.toISOString().slice(0, 10)
  );

  await page.clock.setFixedTime(instante);
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');

  const fechas = page.locator('input[type="date"]');
  await expect(fechas.nth(0)).toHaveValue(enMexico, { timeout: 15_000 });
  await expect(fechas.nth(1)).toHaveValue(enMexico);
});
/**
 * Que lo anotado en el navegador no se pierda al mudar la caja al servidor.
 *
 * Quien tuviera cantidades apuntadas las tenía en `localStorage`. Si el cambio se hubiera
 * desplegado sin más, habrían desaparecido del reporte sin aviso — y son dinero.
 *
 * Se suben una sola vez, y solo los días que el servidor no conoce: si ya hay un monto arriba,
 * manda ese, porque pudo fijarlo otra persona desde otro dispositivo.
 */
test('lo que había anotado en el navegador se sube una vez', async ({ page }) => {
  // Un día de 1999, distinto en cada corrida, y una cifra reconocible: así no pisa datos de otras
  // pruebas ni del restaurante.
  //
  // Distinto en cada corrida a propósito. Al terminar, la prueba devuelve el día a cero, y un día
  // que el servidor ya conoce —aunque valga cero— no se vuelve a subir, que es lo correcto: un
  // cero puesto a mano desde otro dispositivo debe ganarle a lo que quedara en este navegador.
  // Con un día fijo, la segunda corrida no ejercitaría la subida y la prueba pasaría sin probar.
  const base = new Date(Date.UTC(1999, 0, 1));
  base.setUTCDate(base.getUTCDate() + (Date.now() % 360));
  const dia = base.toISOString().slice(0, 10);
  const monto = 314.15;

  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');
  await page.evaluate(
    ([d, m]) => localStorage.setItem('montoCajaPorFecha', JSON.stringify({ [d as string]: m })),
    [dia, monto] as const
  );

  await page.reload();
  await page.waitForLoadState('networkidle');

  // La llave original no se destruye: se conserva bajo otro nombre por si hiciera falta mirarla.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('montoCajaPorFecha')), { timeout: 15_000 })
    .toBe(null);
  expect(
    await page.evaluate(() => localStorage.getItem('montoCajaPorFecha.importado'))
  ).toContain(dia);

  // Y ahora esta en el servidor, que es lo que importa: desde ahi lo ve cualquier dispositivo.
  //
  // Se comprueba preguntandole al servidor y no mirando la pantalla, porque el resumen solo
  // lista los dias con ventas: un dia con caja y sin ventas —como este de 2019— no tiene tarjeta
  // donde aparecer. Eso es un hueco de la pantalla, no de lo que esta prueba afirma.
  const caja = async (metodo: 'GET' | 'PUT', d: string, monto?: number) =>
    page.evaluate(
      async ([m, dia, valor]) => {
        // El token lo guarda react-oidc-context en `localStorage`, bajo una llave que lleva el
        // emisor y el cliente.
        const llave = Object.keys(localStorage).find((k) => k.startsWith('oidc.user'));
        const token = llave ? JSON.parse(localStorage.getItem(llave)!).access_token : null;
        const base = 'http://localhost:5000/api/reportes/caja';
        const url = m === 'GET' ? `${base}?fechaInicio=${dia}&fechaFin=${dia}` : `${base}/${dia}`;
        const res = await fetch(url, {
          method: m as string,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: m === 'PUT' ? JSON.stringify({ monto: valor }) : undefined,
        });
        return { estado: res.status, cuerpo: await res.json() };
      },
      [metodo, d, monto ?? 0] as const
    );

  const enServidor = await caja('GET', dia);
  expect(enServidor.cuerpo.data.caja, 'lo anotado en el navegador no llego al servidor').toEqual([
    { fecha: dia, monto },
  ]);

  // Se deja como estaba.
  expect((await caja('PUT', dia, 0)).estado).toBe(200);
});

/**
 * Que un día con movimiento aparezca, aunque no haya vendido nada.
 *
 * El resumen se armaba recorriendo solo los días con ventas, y como los cuatro totales de arriba
 * se calculan sobre esa lista, lo que ocurriera un día sin ventas no se sumaba en ninguna parte.
 * Con los gastos eso no era un renglón que faltaba: la utilidad salía inflada, porque se
 * ignoraba dinero que sí se gastó.
 */
test('un día sin ventas pero con gastos o caja aparece y cuenta', async ({ page }) => {
  await page.goto('/reportes');
  await page.waitForLoadState('networkidle');

  // Un día de 1999: seguro que no tiene ventas.
  const dia = '1999-06-15';
  const gasto = 2000;
  const caja = 500;

  const api = (metodo: string, ruta: string, cuerpo?: unknown) =>
    page.evaluate(
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
      [metodo, ruta, cuerpo ?? null] as const
    );

  // Hace falta un tipo de gasto cualquiera de los que ya existen.
  const tipos = await api('GET', '/catalogos/tipoGasto?limit=1', null);
  const idTipoGasto = tipos.cuerpo.data?.items?.[0]?._id;
  expect(idTipoGasto, 'no hay tipos de gasto con los que probar').toBeTruthy();

  const creado = await api('POST', '/reportes/gastos', {
    nombre: 'Renta de un día cerrado',
    idTipoGasto,
    gastoTotal: gasto,
    fecha: `${dia}T12:00:00.000Z`,
  });
  expect(creado.estado).toBe(201);
  const idGasto = creado.cuerpo.data._id;

  try {
    expect((await api('PUT', `/reportes/caja/${dia}`, { monto: caja })).estado).toBe(200);

    // Se pide justo ese día, que no tiene ni una venta.
    const fechas = page.locator('input[type="date"]');
    await fechas.nth(0).fill(dia);
    await fechas.nth(1).fill(dia);

    // Antes esto mostraba «No hay ventas en este período» y los totales en cero.
    // `.first()`: la tarjeta y la fila de la tabla existen las dos en el documento, aunque a
    // este ancho solo se dibuje la tarjeta.
    await expect(page.getByText('15/06/1999').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('$2000.00').first()).toBeVisible();
    await expect(page.getByText('$500.00').first()).toBeVisible();

    // Y la utilidad del período los tiene en cuenta: 0 de ventas + 500 de caja - 2000 de gastos.
    await expect(page.getByText('$-1500.00').first()).toBeVisible();

    // Un día sin órdenes no ofrece abrirlas.
    await expect(page.getByRole('button', { name: /ver órdenes/i })).toHaveCount(0);
  } finally {
    await api('DELETE', `/reportes/gastos/${idGasto}`, null);
    await api('PUT', `/reportes/caja/${dia}`, { monto: 0 });
  }
});
