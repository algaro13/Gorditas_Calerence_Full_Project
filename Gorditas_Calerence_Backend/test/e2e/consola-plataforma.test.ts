import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { adminPrisma, createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';

const DIA = 86_400_000;
const RUN = Date.now().toString(36);

describe('Consola de plataforma', () => {
  let t: TestApp;
  let sinUso: TestTenant;
  let sinStripe: TestTenant;
  let operador: string;
  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    t = await createTestApp();
    const ORG_PLATAFORMA = t.container.env.ZITADEL_DEFAULT_ORG_ID;

    // Se registró hace 40 días y nadie volvió: ni accesos ni órdenes.
    sinUso = await createTestTenant(t.container.prisma, { trialEndsAt: new Date(Date.now() - 26 * DIA) });
    await t.container.prisma.tenant.update({ where: { id: sinUso.id }, data: { createdAt: new Date(Date.now() - 40 * DIA) } });

    // Plan dado sin Stripe, con un acceso de hace 2 días.
    sinStripe = await createTestTenant(t.container.prisma, { planStatus: 'active', trialEndsAt: null });
    await runAsTenant(t.container.prisma, sinStripe.id, (db) =>
      db.tenantUser.create({ data: { zitadelUserId: `u-${RUN}`, email: `u-${RUN}@consola.test`, nombre: 'U', role: 'Admin', lastSeenAt: new Date(Date.now() - 2 * DIA) } }),
    );

    operador = await tokenFor(t.keys, { userId: `operador-${RUN}`, orgId: ORG_PLATAFORMA, email: `operador-${RUN}@plataforma.test`, rolesExtra: { orgId: ORG_PLATAFORMA, roles: ['Plataforma'] } });
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, sinUso.id);
    await deleteTestTenant(t.container.prisma, sinStripe.id);
    await t.container.shutdown();
  });

  it('acceso: dice con qué organización se entra', async () => {
    const res = await api().get('/api/plataforma/acceso');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ orgId: t.container.env.ZITADEL_DEFAULT_ORG_ID });
  });

  it('solo el operador: sin token 401; Admin de restaurante y rol de otra organización, 403', async () => {
    expect((await api().get('/api/plataforma/resumen')).status).toBe(401);

    const adminRestaurante = await tokenFor(t.keys, { userId: 'adm', orgId: sinStripe.orgId, roles: ['Admin'] });
    const r1 = await api().get('/api/plataforma/resumen').set(auth(adminRestaurante));
    expect(r1.status).toBe(403);
    expect(r1.body.code).toBe('NO_PLATAFORMA');

    // El rol «Plataforma» concedido en la organización de un restaurante no abre la consola.
    const rolAjeno = await tokenFor(t.keys, { userId: 'colado', orgId: sinStripe.orgId, rolesExtra: { orgId: sinStripe.orgId, roles: ['Plataforma'] } });
    expect((await api().get('/api/plataforma/resumen').set(auth(rolAjeno))).status).toBe(403);
  });

  it('el operador ve los números y cada restaurante, y la consulta queda en la bitácora', async () => {
    const res = await api().get('/api/plataforma/resumen').set(auth(operador));
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.total).toBeGreaterThanOrEqual(2);

    const filaSinUso = d.restaurantes.find((r: { slug: string }) => r.slug === sinUso.slug);
    expect(filaSinUso).toMatchObject({ situacion: 'prueba-vencida', diasSinUso: 40, tramo: 'de-31-a-90', ultimoAcceso: null, ultimaOrden: null });

    const filaSinStripe = d.restaurantes.find((r: { slug: string }) => r.slug === sinStripe.slug);
    expect(filaSinStripe).toMatchObject({ situacion: 'plan-sin-stripe', diasSinUso: 2, tramo: 'hasta-7', usuariosActivos: 1 });

    const admin = adminPrisma();
    const entrada = await admin.bitacoraPlataforma.findFirst({ where: { operadorId: `operador-${RUN}` } });
    await admin.$disconnect();
    expect(entrada).toMatchObject({ accion: 'ver-resumen', operadorEmail: `operador-${RUN}@plataforma.test` });
  });
});
