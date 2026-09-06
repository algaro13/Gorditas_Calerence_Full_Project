import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';
import { PNG_1X1 } from '../helpers/image';

describe('Configuración y logo del tenant', () => {
  let t: TestApp;
  let tenant: TestTenant;
  let admin: string;
  let mesero: string;
  let uploadsDir: string;
  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    uploadsDir = mkdtempSync(path.join(tmpdir(), 'kustodela-uploads-'));
    t = await createTestApp({ env: { UPLOADS_DIR: uploadsDir } });
    tenant = await createTestTenant(t.container.prisma);
    admin = await tokenFor(t.keys, { userId: 'adm', orgId: tenant.orgId, roles: ['Admin'] });
    mesero = await tokenFor(t.keys, { userId: 'mes', orgId: tenant.orgId, roles: ['Mesero'] });
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
    rmSync(uploadsDir, { recursive: true, force: true });
  });

  it('cambia la paleta y se refleja de inmediato en /me', async () => {
    const res = await api().put('/api/tenants/me/config').set(auth(admin)).send({ paleta: 'blue' });
    expect(res.status).toBe(200);
    expect(res.body.data.config.paleta).toBe('blue');
    const me = await api().get('/api/tenants/me').set(auth(admin));
    expect(me.body.data.tenant.config.paleta).toBe('blue');
  });

  it('valida paleta, imagen ajena y rol', async () => {
    expect((await api().put('/api/tenants/me/config').set(auth(admin)).send({ paleta: 'neon' })).status).toBe(400);
    expect((await api().put('/api/tenants/me/config').set(auth(admin)).send({ imagen: '/uploads/otro-tenant/logo.png' })).status).toBe(400);
    expect((await api().put('/api/tenants/me/config').set(auth(mesero)).send({ paleta: 'red' })).status).toBe(403);
    expect((await api().put('/api/tenants/me/config').set(auth(admin)).send({})).status).toBe(400);
  });

  it('sube el logo a la carpeta del tenant y lo sirve', async () => {
    const up = await api().post('/api/tenants/me/logo').set(auth(admin)).attach('image', PNG_1X1, { filename: 'cualquier.png', contentType: 'image/png' });
    expect(up.status).toBe(200);
    expect(up.body.data.url).toBe(`/uploads/${tenant.id}/logo.png`);
    const served = await api().get(up.body.data.url);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toContain('image/png');
    const me = await api().get('/api/tenants/me').set(auth(admin));
    expect(me.body.data.tenant.config.imagen).toBe(`/uploads/${tenant.id}/logo.png`);

    const pdf = await api().post('/api/tenants/me/logo').set(auth(admin)).attach('image', Buffer.from('%PDF-1.4'), { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(pdf.status).toBe(400);
    const big = await api().post('/api/tenants/me/logo').set(auth(admin)).attach('image', Buffer.alloc(2 * 1024 * 1024 + 1), { filename: 'big.png', contentType: 'image/png' });
    expect(big.status).toBe(400);
    expect((await api().post('/api/tenants/me/logo').set(auth(admin))).status).toBe(400);

    const quitar = await api().put('/api/tenants/me/config').set(auth(admin)).send({ imagen: null });
    expect(quitar.body.data.config.imagen).toBeNull();
  });
});
