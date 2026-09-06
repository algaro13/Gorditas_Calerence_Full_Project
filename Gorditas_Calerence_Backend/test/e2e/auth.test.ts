import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';

describe('Autenticación con tokens de Zitadel (JWKS local)', () => {
  let t: TestApp;
  let tenant: TestTenant;

  beforeAll(async () => {
    t = await createTestApp();
    tenant = await createTestTenant(t.container.prisma);
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  it('GET /health es público', async () => {
    const res = await request(t.app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('sin token responde 401 NO_TOKEN', async () => {
    const res = await request(t.app).get('/api/tenants/me');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: 'NO_TOKEN', message: 'Token no proporcionado' });
  });

  it('token con firma desconocida responde 401', async () => {
    const res = await request(t.app).get('/api/tenants/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('token HS256 legacy (JWT_SECRET) es rechazado', async () => {
    const legacy = await new SignJWT({ id: 'x', email: 'x@y' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .sign(new TextEncoder().encode('StAn121120360ne'));
    const res = await request(t.app).get('/api/tenants/me').set('Authorization', `Bearer ${legacy}`);
    expect(res.status).toBe(401);
  });

  it('token expirado o de otro issuer es rechazado', async () => {
    const expired = await tokenFor(t.keys, { userId: 'u1', orgId: tenant.orgId, roles: ['Admin'], expiresIn: '-10s' });
    expect((await request(t.app).get('/api/tenants/me').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
    const otherIssuer = await tokenFor(t.keys, { userId: 'u1', orgId: tenant.orgId, roles: ['Admin'], issuer: 'https://otro.test' });
    expect((await request(t.app).get('/api/tenants/me').set('Authorization', `Bearer ${otherIssuer}`)).status).toBe(401);
  });

  it('token sin organización responde 401 TOKEN_WITHOUT_ORG', async () => {
    const token = await tokenFor(t.keys, { userId: 'u1', orgId: tenant.orgId, roles: ['Admin'], omitOrgClaim: true });
    const res = await request(t.app).get('/api/tenants/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_WITHOUT_ORG');
  });

  it('token válido devuelve tenant y usuario con roles de su organización', async () => {
    const token = await tokenFor(t.keys, {
      userId: 'u-admin',
      orgId: tenant.orgId,
      roles: ['Mesero', 'Admin'],
      rolesForOtherOrg: { orgId: 'org-ajena', roles: ['Cocinero'] },
      email: 'admin@test.local',
      name: 'Admin Test',
    });
    const res = await request(t.app).get('/api/tenants/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tenant).toMatchObject({ id: tenant.id, slug: tenant.slug, planStatus: 'trial' });
    expect(res.body.data.user).toMatchObject({ id: 'u-admin', email: 'admin@test.local', role: 'Admin' });
    expect([...res.body.data.user.roles].sort()).toEqual(['Admin', 'Mesero']);
  });

  it('organización sin tenant responde 404 NO_TENANT', async () => {
    const token = await tokenFor(t.keys, { userId: 'u2', orgId: 'org-sin-tenant', roles: ['Admin'] });
    const res = await request(t.app).get('/api/tenants/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NO_TENANT');
  });

  it('tenant inactivo responde 403 TENANT_INACTIVE', async () => {
    const inactive = await createTestTenant(t.container.prisma, { activo: false });
    try {
      const token = await tokenFor(t.keys, { userId: 'u3', orgId: inactive.orgId, roles: ['Admin'] });
      const res = await request(t.app).get('/api/tenants/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('TENANT_INACTIVE');
    } finally {
      await deleteTestTenant(t.container.prisma, inactive.id);
    }
  });

  it('el espejo tenant_users se crea en la primera request del miembro', async () => {
    const token = await tokenFor(t.keys, { userId: 'u-mirror', orgId: tenant.orgId, roles: ['Cocinero'], email: 'coci@test.local', name: 'Coci Nero' });
    await request(t.app).get('/api/tenants/me').set('Authorization', `Bearer ${token}`);
    await new Promise((r) => setTimeout(r, 200)); // onMemberSeen es fire-and-forget
    const rows = await t.container.prisma.$queryRawUnsafe<Array<{ email: string; role: string }>>(
      `SELECT email, role FROM tenant_users WHERE tenant_id = $1::uuid AND zitadel_user_id = $2`,
      tenant.id,
      'u-mirror',
    );
    // sin contexto de tenant RLS oculta la fila: se consulta como tenant
    expect(rows).toEqual([]);
    const { runAsTenant } = await import('../../src/shared/infrastructure/prisma/unit-of-work');
    const mirror = await runAsTenant(t.container.prisma, tenant.id, (db) => db.tenantUser.findFirst({ where: { zitadelUserId: 'u-mirror' } }));
    expect(mirror).toMatchObject({ email: 'coci@test.local', nombre: 'Coci Nero', role: 'Cocinero' });
  });

  it('rutas públicas de tenants: by-slug y check-slug', async () => {
    const bySlug = await request(t.app).get(`/api/tenants/by-slug/${tenant.slug}`);
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.data).toMatchObject({ slug: tenant.slug, orgId: tenant.orgId });
    expect((await request(t.app).get('/api/tenants/by-slug/no-existe-xyz')).status).toBe(404);
    const check = await request(t.app).get('/api/tenants/check-slug/app');
    expect(check.body.data).toMatchObject({ available: false, reason: 'reserved' });
    const free = await request(t.app).get('/api/tenants/check-slug/restaurante-nuevo');
    expect(free.body.data.available).toBe(true);
  });
});
