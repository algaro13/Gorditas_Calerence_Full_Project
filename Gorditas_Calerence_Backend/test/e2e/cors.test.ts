import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';

/**
 * El navegador solo deja al SPA hablar con el API si el origen está permitido. La lista se deriva
 * del dominio configurado: si se escribe a mano, un despliegue con otro subdominio de plataforma
 * (por ejemplo `pos` en vez de `app`) queda incomunicado con su propio API.
 */
describe('orígenes permitidos (CORS)', () => {
  let t: TestApp;
  // Un dominio que no sea .local ni .test: esos activan el modo local, donde solo se admite localhost.
  const dominio = 'ejemplo-pos.com';
  const plataforma = 'plataforma';

  beforeAll(async () => {
    t = await createTestApp({ env: { APP_DOMAIN: dominio, APP_SCHEME: 'https', APP_PLATFORM_HOST: plataforma } });
  });

  afterAll(async () => {
    await t.container.shutdown();
  });

  const permitido = async (origin: string) => {
    const res = await request(t.app).options('/api/tenants/me').set('Origin', origin).set('Access-Control-Request-Method', 'GET');
    return res.headers['access-control-allow-origin'] === origin;
  };

  it('permite el subdominio de la plataforma configurado', async () => {
    expect(await permitido(`https://${plataforma}.${dominio}`)).toBe(true);
  });

  it('permite el dominio a secas y www', async () => {
    expect(await permitido(`https://${dominio}`)).toBe(true);
    expect(await permitido(`https://www.${dominio}`)).toBe(true);
  });

  it('permite el subdominio de un restaurante', async () => {
    expect(await permitido(`https://mi-restaurante.${dominio}`)).toBe(true);
  });

  it('rechaza dominios ajenos', async () => {
    expect(await permitido('https://otrositio.com')).toBe(false);
    expect(await permitido(`https://mi-restaurante.${dominio}.otrositio.com`)).toBe(false);
  });
});
