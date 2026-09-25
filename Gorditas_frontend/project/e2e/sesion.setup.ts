import { test as setup, expect } from '@playwright/test';

/**
 * Inicia sesión una vez y guarda el estado para las demás pruebas.
 *
 * Se hace aparte porque pasar por Zitadel en cada prueba sería lento y, sobre todo, frágil:
 * cada prueba dependería de un servicio externo para algo que no está probando.
 *
 * La credencial es la del restaurante de pruebas LOCAL, la que siembra `npm run dev:seed` y
 * que ya está en docs/local-testing.md. Nunca debe apuntar a un restaurante real: estas
 * pruebas crean y cobran órdenes.
 */
const CORREO = process.env.E2E_EMAIL ?? 'demo@kustodela.local';
const CLAVE = process.env.E2E_PASSWORD ?? 'Demo1234!';
const SLUG = process.env.E2E_SLUG ?? 'demo';

setup('iniciar sesión', async ({ page }) => {
  await page.goto('/login');

  // En local no hay subdominios, así que el restaurante se elige por localStorage. Se fija
  // antes de entrar para que el backend sepa a qué restaurante pertenece la sesión.
  await page.evaluate((slug) => localStorage.setItem('devTenantSlug', slug), SLUG);
  await page.reload();

  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  // Formulario de Zitadel, en su propio dominio. Los rótulos son los suyos, en inglés:
  // «Loginname» y «Password», no «usuario» ni «contraseña».
  await page.waitForURL(/8080|auth/, { timeout: 30_000 });
  await page.getByRole('textbox', { name: /loginname/i }).fill(CORREO);
  await page.getByRole('button', { name: /continue/i }).click();

  await page.getByRole('textbox', { name: /password/i }).fill(CLAVE);
  await page.getByRole('button', { name: /continue|sign in/i }).click();

  // De vuelta en la app, con sesión. Se afirma un enlace concreto de la navegación: basta uno
  // y es inequívoco, mientras que `nav` encuentra varios y rompe el modo estricto.
  await page.waitForURL((u) => !/8080/.test(u.href), { timeout: 30_000 });
  // `.first()` porque la navegación se renderiza en dos variantes (barra lateral y menú), y
  // basta con que una esté visible para saber que hay sesión.
  await expect(page.getByRole('link', { name: 'Nueva Orden' }).first()).toBeVisible({ timeout: 20_000 });

  await page.context().storageState({ path: 'e2e/.sesion.json' });
});
