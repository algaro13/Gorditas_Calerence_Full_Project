import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, seedMinimal, type TestTenant } from '../helpers/db';
import { asyncHandler } from '../../src/shared/http/express/async-handler';
import { currentDb } from '../../src/shared/infrastructure/prisma/unit-of-work';

/**
 * Aislamiento bajo concurrencia: dos tenants, requests intercaladas sobre la misma app y el mismo pool.
 * Usa una ruta mínima que crea y lista mesas a través del UnitOfWork (mismo camino que los módulos).
 */
describe('Aislamiento entre tenants bajo concurrencia', () => {
  let t: TestApp;
  let app: express.Express;
  let a: TestTenant;
  let b: TestTenant;

  beforeAll(async () => {
    t = await createTestApp();
    a = await createTestTenant(t.container.prisma);
    b = await createTestTenant(t.container.prisma);
    await seedMinimal(t.container.prisma, a.id);
    await seedMinimal(t.container.prisma, b.id);

    app = express();
    app.use(express.json());
    const chain = [t.container.middlewares.authenticate, t.container.middlewares.tenantContext, t.container.middlewares.planGuard];
    app.post(
      '/mesas',
      ...chain,
      asyncHandler(async (req, res) => {
        const mesa = await t.container.uow.run(() => currentDb().mesa.create({ data: { nombre: req.body.nombre } }));
        res.json({ id: mesa.id, tenantId: mesa.tenantId, nombre: mesa.nombre });
      }),
    );
    app.get(
      '/mesas',
      ...chain,
      asyncHandler(async (_req, res) => {
        const mesas = await t.container.uow.run(() => currentDb().mesa.findMany({ orderBy: { id: 'asc' } }));
        res.json(mesas.map((m) => ({ id: m.id, tenantId: m.tenantId, nombre: m.nombre })));
      }),
    );
    app.get(
      '/productos',
      ...chain,
      asyncHandler(async (_req, res) => {
        const rows = await t.container.uow.run(() => currentDb().$queryRaw<Array<{ id: number; tenant_id: string }>>`SELECT id, tenant_id FROM productos`);
        res.json(rows);
      }),
    );
    app.use(t.container.middlewares.errorHandler);
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, a.id);
    await deleteTestTenant(t.container.prisma, b.id);
    await t.container.shutdown();
  });

  it('40 requests intercaladas nunca cruzan datos', async () => {
    const tokenA = await tokenFor(t.keys, { userId: 'ua', orgId: a.orgId, roles: ['Admin'] });
    const tokenB = await tokenFor(t.keys, { userId: 'ub', orgId: b.orgId, roles: ['Admin'] });

    const calls = Array.from({ length: 40 }, (_, i) => {
      const mine = i % 2 === 0 ? { token: tokenA, tenant: a } : { token: tokenB, tenant: b };
      const kind = i % 4;
      if (kind < 2) {
        return request(app)
          .post('/mesas')
          .set('Authorization', `Bearer ${mine.token}`)
          .send({ nombre: `Mesa ${i}` })
          .then((res) => {
            expect(res.status).toBe(200);
            expect(res.body.tenantId).toBe(mine.tenant.id);
          });
      }
      if (kind === 2) {
        return request(app)
          .get('/mesas')
          .set('Authorization', `Bearer ${mine.token}`)
          .then((res) => {
            expect(res.status).toBe(200);
            for (const m of res.body) expect(m.tenantId).toBe(mine.tenant.id);
          });
      }
      return request(app)
        .get('/productos')
        .set('Authorization', `Bearer ${mine.token}`)
        .then((res) => {
          expect(res.status).toBe(200);
          expect(res.body).toHaveLength(1);
          expect(res.body[0].tenant_id).toBe(mine.tenant.id);
        });
    });
    await Promise.all(calls);

    const finalA = await request(app).get('/mesas').set('Authorization', `Bearer ${tokenA}`);
    const finalB = await request(app).get('/mesas').set('Authorization', `Bearer ${tokenB}`);
    // 1 mesa del seed + 10 creadas por cada tenant
    expect(finalA.body).toHaveLength(11);
    expect(finalB.body).toHaveLength(11);
    expect(finalA.body.every((m: { tenantId: string }) => m.tenantId === a.id)).toBe(true);
    expect(finalB.body.every((m: { tenantId: string }) => m.tenantId === b.id)).toBe(true);
  });

  it('UnitOfWork fuera de contexto lanza NoTenantContext', async () => {
    await expect(t.container.uow.run(async () => 1)).rejects.toThrow('No tenant context');
  });
});
