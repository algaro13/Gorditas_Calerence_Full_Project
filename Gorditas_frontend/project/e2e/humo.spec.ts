import { test, expect } from '@playwright/test';

/**
 * Que cada pantalla cargue.
 *
 * Es la prueba más barata y la que habría cazado el peor tipo de fallo de esta sesión: una
 * migración que toca 700 clases y deja una pantalla en blanco. El typecheck no lo ve y las
 * pruebas del backend tampoco.
 */

const PANTALLAS = [
  { ruta: '/', contiene: /resumen|órdenes|bienvenid/i },
  { ruta: '/nueva-orden', contiene: /seleccionar mesa/i },
  { ruta: '/editar-orden', contiene: /editar orden/i },
  { ruta: '/surtir-orden', contiene: /órdenes recientes|preparar/i },
  // La ruta se llama «recibir-productos» pero la pantalla se titula «Gestión de Inventario».
  { ruta: '/recibir-productos', contiene: /gestión de inventario/i },
  { ruta: '/cobrar', contiene: /cobrar/i },
  { ruta: '/catalogos', contiene: /catálogos/i },
  { ruta: '/reportes', contiene: /reportes/i },
  { ruta: '/configuracion', contiene: /configuración/i },
];

for (const { ruta, contiene } of PANTALLAS) {
  test(`${ruta} carga con contenido y sin errores`, async ({ page }) => {
    const errores: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });
    page.on('pageerror', (e) => errores.push(e.message));

    const respuesta = await page.goto(ruta);
    expect(respuesta?.status(), `${ruta} no respondió`).toBeLessThan(400);
    await page.waitForLoadState('networkidle');

    // Que responda no basta: una pantalla rota tambien devuelve 200 y se queda en blanco.
    await expect(page.locator('main')).toContainText(contiene, { timeout: 15_000 });

    // Los 401 son ruido esperado mientras el token se refresca; lo demás no.
    const reales = errores.filter((e) => !/401|Unauthorized|favicon/i.test(e));
    expect(reales, `errores de consola en ${ruta}`).toEqual([]);
  });
}
