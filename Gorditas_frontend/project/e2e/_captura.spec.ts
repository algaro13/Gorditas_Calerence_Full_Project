import { test } from '@playwright/test';

test('catalogo de mesas', async ({ page }) => {
  const errores: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  const respuestas: string[] = [];
  page.on('response', (r) => { if (r.url().includes('/catalogos/mesa')) respuestas.push(`${r.status()} ${r.url()}`); });

  await page.goto('/catalogos');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Mesas', exact: true }).click();
  await page.waitForTimeout(2500);

  console.log('PETICIONES', JSON.stringify(respuestas));
  console.log('ERRORES', JSON.stringify(errores.slice(0, 5)));
  console.log('TEXTO', JSON.stringify((await page.locator('main').innerText()).slice(0, 700)));
  await page.screenshot({ path: 'mesas.png' });
});
