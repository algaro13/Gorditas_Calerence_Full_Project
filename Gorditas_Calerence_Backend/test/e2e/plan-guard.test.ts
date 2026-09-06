import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';
import { FixedClock } from '../../src/shared/infrastructure/clock/SystemClock';

describe('planGuard', () => {
  let t: TestApp;
  let app: express.Express;
  let vigente: TestTenant;
  let vencido: TestTenant;
  let cancelado: TestTenant;
  const clock = new FixedClock(new Date('2026-09-06T12:00:00Z'));

  beforeAll(async () => {
    t = await createTestApp({ clock });
    // Ruta de prueba protegida con la cadena completa
    app = express();
    app.use('/protegida', t.container.middlewares.authenticate, t.container.middlewares.tenantContext, t.container.middlewares.planGuard, (_req, res) => {
      res.json({ ok: true });
    });
    app.use(t.container.middlewares.errorHandler);
    vigente = await createTestTenant(t.container.prisma, { trialEndsAt: new Date('2026-09-10T00:00:00Z') });
    vencido = await createTestTenant(t.container.prisma, { trialEndsAt: new Date('2026-09-01T00:00:00Z') });
    cancelado = await createTestTenant(t.container.prisma, { planStatus: 'canceled', trialEndsAt: null });
  });

  afterAll(async () => {
    for (const x of [vigente, vencido, cancelado]) await deleteTestTenant(t.container.prisma, x.id);
    await t.container.shutdown();
  });

  it('trial vigente pasa', async () => {
    const token = await tokenFor(t.keys, { userId: 'u', orgId: vigente.orgId, roles: ['Admin'] });
    expect((await request(app).get('/protegida').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });

  it('trial vencido responde 403 TRIAL_EXPIRED', async () => {
    const token = await tokenFor(t.keys, { userId: 'u', orgId: vencido.orgId, roles: ['Admin'] });
    const res = await request(app).get('/protegida').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TRIAL_EXPIRED');
  });

  it('suscripción cancelada responde 403 SUBSCRIPTION_INACTIVE', async () => {
    const token = await tokenFor(t.keys, { userId: 'u', orgId: cancelado.orgId, roles: ['Admin'] });
    const res = await request(app).get('/protegida').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SUBSCRIPTION_INACTIVE');
  });

  it('el guard depende del reloj: al avanzar el tiempo el trial vence', async () => {
    const token = await tokenFor(t.keys, { userId: 'u', orgId: vigente.orgId, roles: ['Admin'] });
    clock.set(new Date('2026-09-11T00:00:00Z'));
    try {
      expect((await request(app).get('/protegida').set('Authorization', `Bearer ${token}`)).status).toBe(403);
    } finally {
      clock.set(new Date('2026-09-06T12:00:00Z'));
    }
  });

  it('sin tenant en el request nunca hace next()', async () => {
    const bare = express();
    bare.use('/x', t.container.middlewares.planGuard, (_req, res) => res.json({ ok: true }));
    const res = await request(bare).get('/x');
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('NO_TENANT_CONTEXT');
  });
});
