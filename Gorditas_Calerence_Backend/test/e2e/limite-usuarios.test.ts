import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';
import { FakeIdentityProvider } from '../../src/infrastructure/zitadel/FakeIdentityProvider';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';

/**
 * El límite de usuarios es lo que sostiene el cobro por plan: si se puede rodear, el plan
 * básico cuesta lo mismo que el empresarial. Se comprueba por los tres caminos que crean o
 * reactivan personal, no solo por el alta, que es el único que estaba cubierto.
 */
describe('Límite de usuarios del plan', () => {
  let t: TestApp;
  let fake: FakeIdentityProvider;
  let tenant: TestTenant;
  let admin: string;
  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const activos = () =>
    runAsTenant(t.container.prisma, tenant.id, (db) => db.tenantUser.count({ where: { activo: true } }));

  const invitar = (token: string, email: string) =>
    api().post('/api/usuarios').set(auth(token)).send({ nombre: 'Nuevo', apellido: 'Usuario', email, role: 'Mesero' });

  beforeAll(async () => {
    fake = new FakeIdentityProvider();
    t = await createTestApp({ identityProvider: fake });
    // Dos plazas: el admin ocupa una al entrar, queda una libre.
    tenant = await createTestTenant(t.container.prisma, { maxUsuarios: 2 });
    admin = await tokenFor(t.keys, { userId: 'admin-1', orgId: tenant.orgId, roles: ['Admin'], email: 'admin@test.local', name: 'Admin Uno' });
    await api().get('/api/usuarios').set(auth(admin));
    await new Promise((r) => setTimeout(r, 150));
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  it('el alta respeta el límite', async () => {
    expect(await activos()).toBe(1);

    expect((await invitar(admin, 'segundo@test.local')).status).toBe(201);
    expect(await activos()).toBe(2);

    const tercero = await invitar(admin, 'tercero@test.local');
    expect(tercero.status).toBe(403);
    expect(tercero.body.code).toBe('USER_LIMIT_REACHED');
    expect(await activos()).toBe(2);
  });

  it('desactivar libera una plaza y reactivar la vuelve a exigir', async () => {
    const lista = (await api().get('/api/usuarios').set(auth(admin))).body.data as Array<{ _id: string; email: string }>;
    const segundo = lista.find((u) => u.email === 'segundo@test.local')!;

    expect((await api().put(`/api/usuarios/${segundo._id}`).set(auth(admin)).send({ activo: false })).status).toBe(200);
    expect(await activos()).toBe(1);

    // Con la plaza libre entra otro, y ahora reactivar al primero debe chocar con el límite.
    expect((await invitar(admin, 'cuarto@test.local')).status).toBe(201);
    expect(await activos()).toBe(2);

    const reactivar = await api().put(`/api/usuarios/${segundo._id}`).set(auth(admin)).send({ activo: true });
    expect(reactivar.status).toBe(403);
    expect(reactivar.body.code).toBe('USER_LIMIT_REACHED');
    expect(await activos()).toBe(2);
  });

  // HUECO CONOCIDO. Marcada con .fails a propósito: hoy el espejo se salta el límite, así que
  // esta prueba "pasa" porque falla. El día que se cierre el hueco, empezará a dar error y
  // habrá que quitarle el .fails. Es la forma de que un fallo aceptado no se olvide.
  //
  // El camino es el que no pasa por /api/usuarios: alguien creado directamente en la consola
  // de Zitadel —el dueño de cada restaurante es ORG_OWNER de su organización— o una invitación
  // que creó la cuenta pero falló al escribir el espejo. En su primera petición, el espejo lo
  // da de alta sin mirar cuántas plazas quedan. Y como onMemberSeen no se espera, tampoco
  // podría rechazar la petición: el límite se aplica al dar de alta, no en tiempo de ejecución.
  it.fails('un usuario que existe en el proveedor pero no en el espejo no puede saltarse el límite', async () => {
    expect(await activos()).toBe(2);

    const colado = await tokenFor(t.keys, {
      userId: 'colado-1',
      orgId: tenant.orgId,
      roles: ['Mesero'],
      email: 'colado@test.local',
      name: 'Colado Uno',
    });
    await api().get('/api/ordenes').set(auth(colado));
    await new Promise((r) => setTimeout(r, 150));

    expect(await activos()).toBe(2);
  });
});
