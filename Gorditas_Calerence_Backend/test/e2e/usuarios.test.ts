import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';
import { FakeIdentityProvider } from '../../src/infrastructure/zitadel/FakeIdentityProvider';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';

describe('Módulo usuarios', () => {
  let t: TestApp;
  let fake: FakeIdentityProvider;
  let tenant: TestTenant;
  let admin: string;
  let encargado: string;
  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    fake = new FakeIdentityProvider();
    t = await createTestApp({ identityProvider: fake });
    tenant = await createTestTenant(t.container.prisma, { maxUsuarios: 4 });
    admin = await tokenFor(t.keys, { userId: 'admin-1', orgId: tenant.orgId, roles: ['Admin'], email: 'admin@test.local', name: 'Admin Uno' });
    encargado = await tokenFor(t.keys, { userId: 'enc-1', orgId: tenant.orgId, roles: ['Encargado'], email: 'enc@test.local', name: 'Enc Uno' });
    // El admin queda en el espejo al hacer su primera request
    await api().get('/api/usuarios').set(auth(admin));
    await new Promise((r) => setTimeout(r, 150));
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  it('Admin invita a un Mesero: proveedor, rol, enlace y espejo', async () => {
    const res = await api().post('/api/usuarios').set(auth(admin)).send({ nombre: 'Pepe', apellido: 'Mesa', email: 'Pepe@Test.Local', role: 'Mesero', password: 'ignorada' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ nombre: 'Pepe Mesa', email: 'pepe@test.local', role: 'Mesero', nombreTipoUsuario: 'Mesero', activo: true });
    expect(res.body.data.zitadelUserId).toBeUndefined();
    const org = fake.orgs.get(tenant.orgId)!;
    const created = [...org.users.values()].find((u) => u.email === 'pepe@test.local');
    expect(created).toMatchObject({ role: 'Mesero', active: true });
    expect(fake.invitaciones).toHaveLength(1);

    const dup = await api().post('/api/usuarios').set(auth(admin)).send({ nombre: 'Otro', apellido: 'Pepe', email: 'pepe@test.local', role: 'Mesero' });
    expect(dup.status).toBe(409);
  });

  it('Encargado solo administra roles operativos', async () => {
    const res = await api().post('/api/usuarios').set(auth(encargado)).send({ nombre: 'X', apellido: 'Y', email: 'x@test.local', role: 'Admin' });
    expect(res.status).toBe(403);
    const ok = await api().post('/api/usuarios').set(auth(encargado)).send({ nombre: 'Coci', apellido: 'Nero', email: 'coci@test.local', role: 'Cocinero' });
    expect(ok.status).toBe(201);
  });

  it('límite de usuarios del plan', async () => {
    // admin + encargado (espejos) + pepe + coci = 4 activos = maxUsuarios
    const res = await api().post('/api/usuarios').set(auth(admin)).send({ nombre: 'Cuarto', apellido: 'Usuario', email: 'cuarto@test.local', role: 'Mesero' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('USER_LIMIT_REACHED');
  });

  it('actualizar rol y desactivar; protección del último Admin y de uno mismo', async () => {
    const lista = (await api().get('/api/usuarios').set(auth(admin))).body.data as Array<{ _id: string; email: string; role: string }>;
    const pepe = lista.find((u) => u.email === 'pepe@test.local')!;
    const yo = lista.find((u) => u.email === 'admin@test.local')!;

    const upd = await api().put(`/api/usuarios/${pepe._id}`).set(auth(admin)).send({ role: 'Despachador', nombre: 'Pepe M.' });
    expect(upd.status).toBe(200);
    expect(upd.body.data).toMatchObject({ role: 'Despachador', nombre: 'Pepe M.' });

    const off = await api().put(`/api/usuarios/${pepe._id}`).set(auth(admin)).send({ activo: false });
    expect(off.status).toBe(200);
    expect(off.body.data.activo).toBe(false);
    const inFake = [...fake.orgs.get(tenant.orgId)!.users.values()].find((u) => u.email === 'pepe@test.local');
    expect(inFake?.active).toBe(false);

    expect((await api().put(`/api/usuarios/${yo._id}`).set(auth(admin)).send({ activo: false })).status).toBe(400);
    expect((await api().delete(`/api/usuarios/${yo._id}`).set(auth(admin))).status).toBe(400);
    expect((await api().put(`/api/usuarios/${yo._id}`).set(auth(encargado)).send({ nombre: 'Hackeado' })).status).toBe(403);

    // Tras desactivar a pepe cabe uno más
    const otra = await api().post('/api/usuarios').set(auth(admin)).send({ nombre: 'Cuarto', apellido: 'Usuario', email: 'cuarto@test.local', role: 'Mesero' });
    expect(otra.status).toBe(201);
  });

  it('eliminar y reenviar invitación', async () => {
    const lista = (await api().get('/api/usuarios').set(auth(admin))).body.data as Array<{ _id: string; email: string }>;
    const coci = lista.find((u) => u.email === 'coci@test.local')!;
    expect((await api().post(`/api/usuarios/${coci._id}/resend-invite`).set(auth(admin))).status).toBe(200);
    expect((await api().delete(`/api/usuarios/${coci._id}`).set(auth(admin))).status).toBe(200);
    expect(fake.deletedUsers).toHaveLength(1);
    const restantes = await runAsTenant(t.container.prisma, tenant.id, (db) => db.tenantUser.count());
    expect(restantes).toBe(4);
    expect((await api().delete(`/api/usuarios/${coci._id}`).set(auth(admin))).status).toBe(404);
  });

  it('Mesero no puede administrar usuarios', async () => {
    const mesero = await tokenFor(t.keys, { userId: 'm', orgId: tenant.orgId, roles: ['Mesero'] });
    expect((await api().get('/api/usuarios').set(auth(mesero))).status).toBe(403);
  });
});
