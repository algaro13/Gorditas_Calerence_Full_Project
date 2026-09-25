import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de navegador del POS.
 *
 * Corren a ancho de teléfono a propósito: ahí estaban los problemas que las motivaron
 * —controles de 13×20 px, etiquetas pegadas, un botón que borraba sin avisar— y ahí es donde
 * se toma una orden de verdad.
 *
 * Necesitan el entorno local levantado: Docker (Postgres y Zitadel), el backend en el 5000 y
 * el frontend en el 5173. Ver docs/local-testing.md.
 */
export default defineConfig({
  testDir: './e2e',
  // En serie: comparten el restaurante de pruebas y su base, así que en paralelo se pisarían.
  fullyParallel: false,
  workers: 1,
  // Sin reintentos: una prueba de interfaz que pasa al segundo intento esconde una carrera,
  // y esconderla es peor que verla fallar.
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Inicia sesión una vez y guarda el estado; lo demás parte de ahí.
    { name: 'sesion', testMatch: /sesion\.setup\.ts/ },
    {
      name: 'telefono',
      use: {
        ...devices['iPhone 13'],
        // El preset de iPhone trae WebKit. Se fuerza Chromium: estas pruebas miden tamaños,
        // disposición y flujos, y para eso basta el viewport táctil, sin arrastrar otro
        // navegador de 100 MB.
        //
        // Lo que NO cubre, y conviene saberlo: el zoom que Safari en iOS aplica al enfocar un
        // campo de menos de 16 px. Eso es comportamiento de Mobile Safari y no se reproduce
        // aquí; lo cubre la regla de que ningún texto baje de 14 y los campos estén en 16.
        browserName: 'chromium',
        storageState: 'e2e/.sesion.json',
      },
      dependencies: ['sesion'],
    },
  ],
});
