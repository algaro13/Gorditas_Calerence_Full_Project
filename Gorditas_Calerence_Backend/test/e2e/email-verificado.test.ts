import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';
import { FakeIdentityProvider } from '../../src/infrastructure/zitadel/FakeIdentityProvider';

/**
 * El registro deja al dueño activo pero con el correo sin confirmar, así que el API tiene que
 * cerrarle el paso hasta que abra el enlace. La interfaz sola no basta: quien conozca el API
 * podría saltársela.
 */
describe('bloqueo hasta confirmar el correo', () => {
  let t: TestApp;
  let tenant: TestTenant;
  let identity: FakeIdentityProvider;
  const sinVerificar = 'usuario-sin-verificar';
  const verificado = 'usuario-verificado';

  beforeAll(async () => {
    identity = new FakeIdentityProvider();
    identity.sinVerificar.add(sinVerificar);
    t = await createTestApp({ identityProvider: identity });
    tenant = await createTestTenant(t.container.prisma);
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  const token = (userId: string) => tokenFor(t.keys, { userId, orgId: tenant.orgId, roles: ['Admin'] });

  it('sin confirmar el correo, las rutas del POS responden 403', async () => {
    const res = await request(t.app).get('/api/ordenes').set('Authorization', `Bearer ${await token(sinVerificar)}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NO_VERIFICADO');
  });

  it('tampoco deja tocar la configuración del restaurante', async () => {
    const res = await request(t.app)
      .put('/api/tenants/me/config')
      .set('Authorization', `Bearer ${await token(sinVerificar)}`)
      .send({ paleta: 'verde' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NO_VERIFICADO');
  });

  it('consultar la cuenta sí funciona, e informa que falta confirmar', async () => {
    const res = await request(t.app).get('/api/tenants/me').set('Authorization', `Bearer ${await token(sinVerificar)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.emailVerificado).toBe(false);
  });

  it('permite pedir de nuevo el correo de confirmación', async () => {
    const res = await request(t.app).post('/api/tenants/me/reenviar-verificacion').set('Authorization', `Bearer ${await token(sinVerificar)}`);
    expect(res.status).toBe(200);
    expect(identity.reenvios).toContain(sinVerificar);
  });

  it('con el correo confirmado se opera con normalidad', async () => {
    const res = await request(t.app).get('/api/ordenes').set('Authorization', `Bearer ${await token(verificado)}`);
    expect(res.status).toBe(200);
    const me = await request(t.app).get('/api/tenants/me').set('Authorization', `Bearer ${await token(verificado)}`);
    expect(me.body.data.user.emailVerificado).toBe(true);
  });

  it('al confirmar, el acceso se abre sin reiniciar el servidor', async () => {
    identity.sinVerificar.delete(sinVerificar);
    t.container.verificadorDeCorreo.olvidar(sinVerificar);
    const res = await request(t.app).get('/api/ordenes').set('Authorization', `Bearer ${await token(sinVerificar)}`);
    expect(res.status).toBe(200);
  });
});
