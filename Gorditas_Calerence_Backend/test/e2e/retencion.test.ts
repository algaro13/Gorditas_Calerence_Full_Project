import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { adminPrisma, createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';

const DIA = 86_400_000;
const RUN = Date.now().toString(36);

/**
 * Lo que hacen las personas con la retención: el operador restaura, pausa y aprueba el borrado;
 * el administrador recupera su restaurante. El trabajo diario se prueba aparte, con dobles: aquí
 * recorrería los restaurantes de las demás pruebas.
 */
describe('Retención: restaurar, pausar, borrar y recuperar', () => {
  let t: TestApp;
  let operador: string;
  const creados: TestTenant[] = [];
  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const archivar = (id: string, haceDias: number) =>
    t.container.prisma.tenant.update({ where: { id }, data: { archivadoAt: new Date(Date.now() - haceDias * DIA) } });

  async function restaurante(opts: Parameters<typeof createTestTenant>[1] = {}) {
    const r = await createTestTenant(t.container.prisma, opts);
    creados.push(r);
    return r;
  }

  beforeAll(async () => {
    t = await createTestApp();
    const ORG = t.container.env.ZITADEL_DEFAULT_ORG_ID;
    operador = await tokenFor(t.keys, { userId: `operador-${RUN}`, orgId: ORG, email: `operador-${RUN}@plataforma.test`, rolesExtra: { orgId: ORG, roles: ['Plataforma'] } });
  });

  afterAll(async () => {
    for (const c of creados) await deleteTestTenant(t.container.prisma, c.id).catch(() => {});
    await t.container.shutdown();
  });

  it('archivado: el POS se bloquea, /me lo dice y el Admin lo recupera', async () => {
    const r = await restaurante();
    await archivar(r.id, 3);
    const admin = await tokenFor(t.keys, { userId: `adm-${RUN}`, orgId: r.orgId, roles: ['Admin'] });
    const mesero = await tokenFor(t.keys, { userId: `mes-${RUN}`, orgId: r.orgId, roles: ['Mesero'] });

    const bloqueado = await api().get('/api/catalogos/tipo-producto').set(auth(admin));
    expect(bloqueado.status).toBe(403);
    expect(bloqueado.body.code).toBe('RESTAURANTE_ARCHIVADO');

    const me = await api().get('/api/tenants/me').set(auth(admin));
    expect(me.body.data.accesoBloqueado).toBe('RESTAURANTE_ARCHIVADO');
    expect(new Date(me.body.data.tenant.recuperableHasta).getTime()).toBeGreaterThan(Date.now());

    expect((await api().post('/api/tenants/me/recuperar').set(auth(mesero))).status).toBe(403);
    const rec = await api().post('/api/tenants/me/recuperar').set(auth(admin));
    expect(rec.status).toBe(200);

    expect((await api().get('/api/catalogos/tipo-producto').set(auth(admin))).status).toBe(200);
    const fila = await t.container.prisma.tenant.findUnique({ where: { id: r.id } });
    expect(fila?.archivadoAt).toBeNull();
  });

  it('solo el operador toca la retención', async () => {
    const r = await restaurante();
    const admin = await tokenFor(t.keys, { userId: `adm2-${RUN}`, orgId: r.orgId, roles: ['Admin'] });
    expect((await api().post(`/api/plataforma/restaurantes/${r.id}/pausa`).send({ pausada: true })).status).toBe(401);
    expect((await api().post(`/api/plataforma/restaurantes/${r.id}/pausa`).set(auth(admin)).send({ pausada: true })).status).toBe(403);
    expect((await api().post(`/api/plataforma/restaurantes/${r.id}/borrar`).set(auth(admin)).send({ confirmacion: r.slug })).status).toBe(403);
  });

  it('el operador pausa, reanuda y restaura, y queda en la bitácora', async () => {
    const r = await restaurante();
    expect((await api().post(`/api/plataforma/restaurantes/${r.id}/pausa`).set(auth(operador)).send({ pausada: true })).status).toBe(200);
    expect((await t.container.prisma.tenant.findUnique({ where: { id: r.id } }))?.retencionPausada).toBe(true);
    await api().post(`/api/plataforma/restaurantes/${r.id}/pausa`).set(auth(operador)).send({ pausada: false });
    expect((await t.container.prisma.tenant.findUnique({ where: { id: r.id } }))?.retencionPausada).toBe(false);

    // Restaurar algo que no está archivado no tiene sentido.
    expect((await api().post(`/api/plataforma/restaurantes/${r.id}/restaurar`).set(auth(operador))).status).toBe(400);
    await archivar(r.id, 5);
    expect((await api().post(`/api/plataforma/restaurantes/${r.id}/restaurar`).set(auth(operador))).status).toBe(200);
    expect((await t.container.prisma.tenant.findUnique({ where: { id: r.id } }))?.archivadoAt).toBeNull();

    const admin = adminPrisma();
    const acciones = (await admin.bitacoraPlataforma.findMany({ where: { operadorId: `operador-${RUN}` }, orderBy: { creadoAt: 'asc' } })).map((b) => b.accion);
    await admin.$disconnect();
    expect(acciones).toEqual(expect.arrayContaining(['pausar-retencion', 'reanudar-retencion', 'restaurar-restaurante']));
  });

  it('borrar: solo archivado, pasado el plazo, sin plan vivo y con el subdominio escrito', async () => {
    const r = await restaurante({ trialEndsAt: new Date(Date.now() - 100 * DIA) });
    const borrar = (confirmacion: string) => api().post(`/api/plataforma/restaurantes/${r.id}/borrar`).set(auth(operador)).send({ confirmacion });

    expect((await borrar(r.slug)).body.code).toBe('NO_ARCHIVADO');
    await archivar(r.id, 10);
    expect((await borrar(r.slug)).body.code).toBe('AUN_RECUPERABLE');
    await archivar(r.id, 31);
    expect((await borrar('otro-nombre')).body.code).toBe('CONFIRMACION_INCORRECTA');

    const ok = await borrar(r.slug);
    expect(ok.status).toBe(200);
    expect(await t.container.prisma.tenant.findUnique({ where: { id: r.id } })).toBeNull();

    const admin = adminPrisma();
    const entrada = await admin.bitacoraPlataforma.findFirst({ where: { operadorId: `operador-${RUN}`, accion: 'borrar-restaurante' } });
    await admin.$disconnect();
    expect(entrada?.detalle).toMatchObject({ slug: r.slug });
  });

  it('un restaurante con plan activo no se borra aunque esté archivado', async () => {
    const r = await restaurante({ planStatus: 'active', trialEndsAt: null });
    await archivar(r.id, 60);
    const res = await api().post(`/api/plataforma/restaurantes/${r.id}/borrar`).set(auth(operador)).send({ confirmacion: r.slug });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROTEGIDO');
  });
});
