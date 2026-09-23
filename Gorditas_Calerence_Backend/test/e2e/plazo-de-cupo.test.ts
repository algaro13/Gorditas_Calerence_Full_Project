import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';
import { FakeIdentityProvider } from '../../src/infrastructure/zitadel/FakeIdentityProvider';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';
import { EvaluarCupo } from '../../src/modules/usuarios/application/use-cases/EvaluarCupo';
import { PrismaStaffRepository } from '../../src/modules/usuarios/infrastructure/PrismaStaffRepository';
import { PrismaTenantScope } from '../../src/modules/usuarios/infrastructure/PrismaTenantScope';
import { DIAS_SOBRE_CUPO } from '../../src/shared/domain/Tenant';
import { programarTrabajos } from '../../src/trabajos';

const DIA = 86_400_000;

/**
 * Bajar de plan no expulsa a nadie en el momento: se abre un plazo, y solo al vencer el sistema
 * desactiva a los que sobran. Lo que se prueba aquí es que el plazo se respeta, que se cancela
 * solo si el restaurante vuelve a caber, y que al vencer le toca a quien el aviso anunció.
 */
describe('Plazo cuando el restaurante excede su cupo', () => {
  let t: TestApp;
  let idp: FakeIdentityProvider;
  let cupo: EvaluarCupo;
  let tenant: TestTenant;
  let admin: string;
  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const recargar = async () => (await t.container.tenants.findById(tenant.id))!;
  const activos = () =>
    runAsTenant(t.container.prisma, tenant.id, (db) => db.tenantUser.count({ where: { activo: true } }));
  const porEmail = (email: string) =>
    runAsTenant(t.container.prisma, tenant.id, (db) => db.tenantUser.findFirst({ where: { email } }));

  /** Siembra el espejo sin pasar por el API, para controlar la última actividad de cada uno. */
  async function sembrar(gente: Array<{ email: string; role: string; visto: Date | null }>) {
    await runAsTenant(t.container.prisma, tenant.id, async (db) => {
      await db.tenantUser.deleteMany({});
      for (const g of gente) {
        const userId = `u-${g.email}`;
        idp.orgs.set(tenant.orgId, idp.orgs.get(tenant.orgId) ?? { id: tenant.orgId, name: 'x', users: new Map() });
        idp.orgs.get(tenant.orgId)!.users.set(userId, { email: g.email, givenName: g.email, familyName: 'X', active: true });
        await db.tenantUser.create({
          data: { zitadelUserId: userId, email: g.email, nombre: g.email, role: g.role as never, activo: true, lastSeenAt: g.visto },
        });
      }
    });
  }

  beforeAll(async () => {
    idp = new FakeIdentityProvider();
    t = await createTestApp({ identityProvider: idp });
    tenant = await createTestTenant(t.container.prisma, { maxUsuarios: 2 });
    admin = await tokenFor(t.keys, { userId: 'u-admin@cupo.local', orgId: tenant.orgId, roles: ['Admin'], email: 'admin@cupo.local', name: 'Admin' });
    cupo = new EvaluarCupo(
      new PrismaTenantScope(t.container.prisma),
      new PrismaStaffRepository(),
      t.container.tenants,
      t.container.identityProvider,
      t.container.clock,
      t.container.logger,
    );
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  it('mientras cabe no pasa nada', async () => {
    await sembrar([
      { email: 'admin@cupo.local', role: 'Admin', visto: new Date() },
      { email: 'ana@cupo.local', role: 'Mesero', visto: new Date() },
    ]);
    expect(await cupo.aplicar(await recargar())).toEqual({ accion: 'nada' });
    expect((await recargar()).sobreCupoDesde).toBeNull();
  });

  it('al aparecer el exceso arranca el plazo, sin desactivar a nadie', async () => {
    await sembrar([
      { email: 'admin@cupo.local', role: 'Admin', visto: new Date() },
      { email: 'ana@cupo.local', role: 'Mesero', visto: new Date(Date.now() - 60 * DIA) },
      { email: 'beto@cupo.local', role: 'Mesero', visto: new Date() },
    ]);
    const res = await cupo.aplicar(await recargar());
    expect(res.accion).toBe('plazo-iniciado');
    expect((await recargar()).sobreCupoDesde).not.toBeNull();
    expect(await activos()).toBe(3); // nadie fue desactivado
  });

  it('el aviso nombra a quien lleva más tiempo sin entrar', async () => {
    const res = await api().get('/api/usuarios/cupo').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ excedido: true, sobran: 1, plazoEnMarcha: true });
    expect(res.body.data.enRiesgo.map((u: { email: string }) => u.email)).toEqual(['ana@cupo.local']);
  });

  it('consultar no cambia nada, ni siquiera vencido el plazo', async () => {
    await t.container.tenants.setSobreCupoDesde(tenant.id, new Date(Date.now() - (DIAS_SOBRE_CUPO + 1) * DIA));
    await api().get('/api/usuarios/cupo').set(auth(admin));
    await api().get('/api/usuarios/cupo').set(auth(admin));
    expect(await activos()).toBe(3);
    expect((await recargar()).sobreCupoDesde).not.toBeNull();
  });

  it('dentro del plazo no desactiva', async () => {
    await t.container.tenants.setSobreCupoDesde(tenant.id, new Date(Date.now() - 3 * DIA));
    expect(await cupo.aplicar(await recargar())).toEqual({ accion: 'nada' });
    expect(await activos()).toBe(3);
  });

  it('se cancela solo si el restaurante vuelve a caber antes del vencimiento', async () => {
    const ana = (await porEmail('ana@cupo.local'))!;
    await runAsTenant(t.container.prisma, tenant.id, (db) => db.tenantUser.update({ where: { id: ana.id }, data: { activo: false } }));

    expect(await cupo.aplicar(await recargar())).toEqual({ accion: 'plazo-cancelado' });
    expect((await recargar()).sobreCupoDesde).toBeNull();
    expect(await activos()).toBe(2);
  });

  it('al vencer desactiva al anunciado, también en el proveedor de identidad', async () => {
    await sembrar([
      { email: 'admin@cupo.local', role: 'Admin', visto: new Date() },
      { email: 'ana@cupo.local', role: 'Mesero', visto: new Date(Date.now() - 60 * DIA) },
      { email: 'beto@cupo.local', role: 'Mesero', visto: new Date() },
    ]);
    await t.container.tenants.setSobreCupoDesde(tenant.id, new Date(Date.now() - (DIAS_SOBRE_CUPO + 1) * DIA));

    const res = await cupo.aplicar(await recargar());
    expect(res.accion).toBe('ajustado');
    if (res.accion !== 'ajustado') return;
    expect(res.desactivados.map((m) => m.email)).toEqual(['ana@cupo.local']);
    expect(res.quedanDeMas).toBe(0);

    expect(await activos()).toBe(2);
    expect((await porEmail('ana@cupo.local'))!.activo).toBe(false);
    expect(idp.orgs.get(tenant.orgId)!.users.get('u-ana@cupo.local')!.active).toBe(false);
    expect((await recargar()).sobreCupoDesde).toBeNull();
  });

  it('después de ajustar, la pantalla puede decir a quién desactivó el sistema', async () => {
    const res = await api().get('/api/usuarios/cupo').set(auth(admin));
    expect(res.status).toBe(200);
    // Ya cabe otra vez — precisamente porque el sistema desactivó a alguien. Ese es el momento
    // en que hay que explicarlo, así que el aviso no depende de seguir excedido.
    expect(res.body.data.excedido).toBe(false);
    expect(res.body.data.desactivadosPorCupo.map((u: { email: string }) => u.email)).toEqual(['ana@cupo.local']);
    expect(res.body.data.desactivadosPorCupo[0].desactivadoPorCupo).toBeTruthy();
  });

  it('una baja a mano no se cuenta como desactivada por el sistema', async () => {
    const beto = (await porEmail('beto@cupo.local'))!;
    await api().put(`/api/usuarios/${beto.id}`).set(auth(admin)).send({ activo: false });

    const res = await api().get('/api/usuarios/cupo').set(auth(admin));
    expect(res.body.data.desactivadosPorCupo.map((u: { email: string }) => u.email)).toEqual(['ana@cupo.local']);

    await api().put(`/api/usuarios/${beto.id}`).set(auth(admin)).send({ activo: true });
  });

  it('nunca deja al restaurante sin administrador activo', async () => {
    // El Admin es justo el que lleva más tiempo sin entrar: le toca a otro.
    await sembrar([
      { email: 'admin@cupo.local', role: 'Admin', visto: new Date(Date.now() - 90 * DIA) },
      { email: 'ana@cupo.local', role: 'Mesero', visto: new Date(Date.now() - 10 * DIA) },
      { email: 'beto@cupo.local', role: 'Mesero', visto: new Date() },
    ]);
    await t.container.tenants.setSobreCupoDesde(tenant.id, new Date(Date.now() - (DIAS_SOBRE_CUPO + 1) * DIA));

    const res = await cupo.aplicar(await recargar());
    expect(res.accion).toBe('ajustado');
    if (res.accion !== 'ajustado') return;
    expect(res.desactivados.map((m) => m.email)).toEqual(['ana@cupo.local']);
    expect((await porEmail('admin@cupo.local'))!.activo).toBe(true);
  });

  it('a quien desactivó el sistema se le puede reactivar, sujeto al cupo', async () => {
    const ana = (await porEmail('ana@cupo.local'))!;
    const beto = (await porEmail('beto@cupo.local'))!;

    // Con 2 de 2 activos, reactivar a Ana choca con el límite.
    const choca = await api().put(`/api/usuarios/${ana.id}`).set(auth(admin)).send({ activo: true });
    expect(choca.status).toBe(403);
    expect(choca.body.code).toBe('USER_LIMIT_REACHED');

    // Liberando una plaza, entra.
    expect((await api().put(`/api/usuarios/${beto.id}`).set(auth(admin)).send({ activo: false })).status).toBe(200);
    expect((await api().put(`/api/usuarios/${ana.id}`).set(auth(admin)).send({ activo: true })).status).toBe(200);
    expect((await porEmail('ana@cupo.local'))!.activo).toBe(true);
    // Reactivarla cierra el asunto: deja de ser una baja que el sistema tenga que explicar.
    expect((await porEmail('ana@cupo.local'))!.desactivadoPorCupo).toBeNull();

    const res = await api().get('/api/usuarios/cupo').set(auth(admin));
    expect(res.body.data.desactivadosPorCupo).toEqual([]);
  });

  it('el programador del backend no arranca en pruebas', () => {
    // Montar la app en una prueba no debe poner una evaluación de fondo a tocar la base.
    expect(programarTrabajos(t.container)).toEqual([]);
  });
});
