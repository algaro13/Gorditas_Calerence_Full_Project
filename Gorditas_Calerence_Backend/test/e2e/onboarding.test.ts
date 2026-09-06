import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { PNG_1X1 } from '../helpers/image';
import { FakeIdentityProvider } from '../../src/infrastructure/zitadel/FakeIdentityProvider';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';

const payload = (slug: string, extra: Record<string, unknown> = {}) => ({
  admin: { nombre: 'Rosa', apellido: 'Pérez', email: `${slug}@test.local`, password: 'Secreta123!' },
  nombre: `Gorditas ${slug}`,
  slug,
  paleta: 'green',
  mesas: [{ nombre: 'Mesa 1' }, { nombre: 'Mesa 2' }, { nombre: '' }],
  platillos: [
    { nombre: 'Gordita de chicharrón', precio: 25 },
    { nombre: 'Quesadilla', precio: 20 },
  ],
  guisos: [{ nombre: 'Chicharrón prensado' }, { nombre: 'Rajas' }],
  ...extra,
});

describe('Onboarding público', () => {
  let t: TestApp;
  let fake: FakeIdentityProvider;
  let uploadsDir: string;
  const created: string[] = [];
  const api = () => request(t.app);

  beforeAll(async () => {
    fake = new FakeIdentityProvider();
    uploadsDir = mkdtempSync(path.join(tmpdir(), 'kustodela-onb-'));
    t = await createTestApp({ identityProvider: fake, env: { UPLOADS_DIR: uploadsDir } });
  });

  afterAll(async () => {
    await t.container.prisma.tenant.deleteMany({ where: { slug: { in: created } } });
    await t.container.shutdown();
    rmSync(uploadsDir, { recursive: true, force: true });
  });

  it('registra restaurante, admin y catálogo inicial en un paso', async () => {
    const slug = `onb-${Date.now().toString(36)}`;
    created.push(slug);

    const up = await api().post('/api/onboarding/upload-image').attach('image', PNG_1X1, { filename: 'logo.png', contentType: 'image/png' });
    expect(up.status).toBe(200);
    expect(up.body.data.url).toMatch(/^\/uploads\/tmp\/[A-Za-z0-9-]+\/logo\.png$/);

    const res = await api().post('/api/onboarding/complete').send(payload(slug, { imagen: up.body.data.url }));
    expect(res.status).toBe(201);
    const data = res.body.data;
    expect(data.tenant).toMatchObject({ slug, nombre: `Gorditas ${slug}`, config: { paleta: 'green' } });
    expect(data.url).toBe(t.container.urls.tenantUrl(slug));
    expect(data.user).toEqual({ email: `${slug}@test.local`, role: 'Admin' });
    expect(data.tenant.config.imagen).toBe(`/uploads/${data.tenant.id}/logo.png`);
    expect((await api().get(data.tenant.config.imagen)).status).toBe(200);

    // Proveedor de identidad
    const org = [...fake.orgs.values()].find((o) => o.name === `Gorditas ${slug}`)!;
    expect(org).toBeDefined();
    expect(org.projectGrantId).toBeTruthy();
    const adminUser = [...org.users.values()][0];
    expect(adminUser).toMatchObject({ email: `${slug}@test.local`, role: 'Admin' });
    expect(fake.redirectUris.has(t.container.urls.tenantCallbackUrl(slug))).toBe(true);

    // Base de datos
    const row = await t.container.prisma.tenant.findUniqueOrThrow({ where: { slug } });
    expect(row).toMatchObject({ zitadelOrgId: org.id, provisioningStatus: 'ready', plan: 'trial', planStatus: 'trial', maxUsuarios: 3 });
    expect(row.trialEndsAt!.getTime()).toBeGreaterThan(Date.now() + 13 * 86_400_000);
    const seed = await runAsTenant(t.container.prisma, row.id, async (db) => ({
      mesas: (await db.mesa.findMany({ orderBy: { id: 'asc' } })).map((m) => m.nombre),
      platillos: await db.platillo.count(),
      guisos: await db.guiso.count(),
      productos: await db.producto.count(),
      extras: await db.extra.count(),
      tiposOrden: await db.tipoOrden.count(),
      tiposGasto: await db.tipoGasto.count(),
      admin: await db.tenantUser.findFirst(),
    }));
    expect(seed.mesas).toEqual(['Mesa 1', 'Mesa 2', 'Mesa 3', 'Nuevo pedido']);
    expect(seed).toMatchObject({ platillos: 2, guisos: 2, productos: 3, extras: 5, tiposOrden: 3, tiposGasto: 5 });
    expect(seed.admin).toMatchObject({ zitadelUserId: [...org.users.keys()][0], role: 'Admin', nombre: 'Rosa Pérez' });

    // El admin ya puede usar el API con un token de su organización
    const token = await tokenFor(t.keys, { userId: seed.admin!.zitadelUserId, orgId: org.id, roles: ['Admin'] });
    const me = await api().get('/api/tenants/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.tenant.slug).toBe(slug);

    // Slug ocupado
    expect((await api().post('/api/onboarding/complete').send(payload(slug))).status).toBe(409);
  });

  it('rechaza slug reservado o inválido y contraseña débil sin tocar el proveedor', async () => {
    const before = fake.orgs.size;
    expect((await api().post('/api/onboarding/complete').send(payload('api'))).status).toBe(400);
    expect((await api().post('/api/onboarding/complete').send(payload('Mal Slug'))).status).toBe(400);
    const weak = await api().post('/api/onboarding/complete').send(payload('debil-pass', { admin: { nombre: 'A', apellido: 'B', email: 'a@test.local', password: 'corta' } }));
    expect(weak.status).toBe(400);
    expect(weak.body.code).toBe('VALIDATION');
    expect(fake.orgs.size).toBe(before);
  });

  it('si falla después de crear la organización, la elimina y deja el slug libre', async () => {
    const slug = `rb-${Date.now().toString(36)}`;
    const original = fake.grantProjectToOrganization.bind(fake);
    fake.grantProjectToOrganization = async () => {
      throw new Error('boom');
    };
    try {
      const res = await api().post('/api/onboarding/complete').send(payload(slug));
      expect(res.status).toBe(500);
      expect(res.body.code).toBe('ONBOARDING_FAILED');
    } finally {
      fake.grantProjectToOrganization = original;
    }
    expect([...fake.orgs.values()].some((o) => o.name === `Gorditas ${slug}`)).toBe(false);
    expect(await t.container.prisma.tenant.findUnique({ where: { slug } })).toBeNull();
    const check = await api().get(`/api/tenants/check-slug/${slug}`);
    expect(check.body.data.available).toBe(true);
  });

  it('rechaza archivos que no son imagen', async () => {
    const res = await api().post('/api/onboarding/upload-image').attach('image', Buffer.from('hola'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });
});
