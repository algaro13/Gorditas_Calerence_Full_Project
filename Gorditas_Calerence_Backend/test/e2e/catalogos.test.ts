import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, seedCatalogo, type TestTenant } from '../helpers/db';

describe('Módulo catalogos', () => {
  let t: TestApp;
  let tenant: TestTenant;
  let cat: Awaited<ReturnType<typeof seedCatalogo>>;
  let admin: string;
  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    t = await createTestApp();
    tenant = await createTestTenant(t.container.prisma);
    cat = await seedCatalogo(t.container.prisma, tenant.id);
    admin = await tokenFor(t.keys, { userId: 'admin', orgId: tenant.orgId, roles: ['Admin'] });
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  it('CRUD de producto con aplanado del tipo y variantes', async () => {
    const creado = await api()
      .post('/api/catalogos/producto')
      .set(auth(admin))
      .send({ idTipoProducto: cat.tipoProducto.id, nombre: 'Refresco', cantidad: 5, costo: 20, variantes: ['Cola', 'Naranja'], _id: 999, nombreTipoProducto: 'basura' });
    expect(creado.status).toBe(201);
    expect(creado.body.data).toMatchObject({ nombre: 'Refresco', nombreTipoProducto: 'Bebidas', variantes: ['Cola', 'Naranja'], costo: 20 });
    expect(typeof creado.body.data._id).toBe('number');
    expect(creado.body.data._id).not.toBe(999);
    const id = creado.body.data._id as number;

    const lista = await api().get('/api/catalogos/producto?search=refre').set(auth(admin));
    expect(lista.status).toBe(200);
    expect(lista.body.data.items.map((i: { nombre: string }) => i.nombre)).toEqual(['Refresco']);
    expect(lista.body.data.pagination).toMatchObject({ page: 1, limit: 20, total: 1 });

    const alias = await api().get('/api/catalogos/tipo-producto').set(auth(admin));
    expect(alias.status).toBe(200);
    expect(alias.body.data.items[0]).toMatchObject({ nombre: 'Bebidas' });

    const upd = await api().put(`/api/catalogos/producto/${id}`).set(auth(admin)).send({ costo: 22, activo: false });
    expect(upd.status).toBe(200);
    expect(upd.body.data).toMatchObject({ costo: 22, activo: false, nombreTipoProducto: 'Bebidas' });

    const activos = await api().get('/api/catalogos/producto?activo=true').set(auth(admin));
    expect(activos.body.data.items.some((i: { _id: number }) => i._id === id)).toBe(false);

    expect((await api().delete(`/api/catalogos/producto/${id}`).set(auth(admin))).status).toBe(200);
    expect((await api().delete(`/api/catalogos/producto/${id}`).set(auth(admin))).status).toBe(404);
  });

  it('modelo inválido, validación y 409 al borrar referenciado', async () => {
    expect((await api().get('/api/catalogos/inexistente').set(auth(admin))).status).toBe(400);
    const sinNombre = await api().post('/api/catalogos/guiso').set(auth(admin)).send({ descripcion: 'x' });
    expect(sinNombre.status).toBe(400);
    expect(sinNombre.body.code).toBe('VALIDATION');

    const ref = await api().delete(`/api/catalogos/tipoproducto/${cat.tipoProducto.id}`).set(auth(admin));
    expect(ref.status).toBe(409);
    expect(ref.body.code).toBe('REGISTRO_REFERENCIADO');
  });

  it('tipousuario fijo, usuario en modo compatibilidad y contador de pedido', async () => {
    const roles = await api().get('/api/catalogos/tipousuario').set(auth(admin));
    expect(roles.body.data.items.map((r: { nombre: string }) => r.nombre)).toEqual(['Admin', 'Encargado', 'Mesero', 'Despachador', 'Cocinero']);

    const usuarios = await api().get('/api/catalogos/usuario').set(auth(admin));
    expect(usuarios.status).toBe(200);
    expect(Array.isArray(usuarios.body.data.items)).toBe(true);
    const post = await api().post('/api/catalogos/usuario').set(auth(admin)).send({ nombre: 'x', email: 'x@y.z', password: '123456' });
    expect(post.status).toBe(400);
    expect(post.body.code).toBe('USE_USUARIOS_API');

    const n1 = await api().get('/api/catalogos/pedido/next-number').set(auth(admin));
    const n2 = await api().get('/api/catalogos/pedido/next-number').set(auth(admin));
    expect(n1.body.data.nextNumber).toBe(1);
    expect(n2.body.data.nextNumber).toBe(2);

    const otro = await createTestTenant(t.container.prisma);
    try {
      const ajeno = await tokenFor(t.keys, { userId: 'o', orgId: otro.orgId, roles: ['Admin'] });
      expect((await api().get('/api/catalogos/pedido/next-number').set(auth(ajeno))).body.data.nextNumber).toBe(1);
      expect((await api().get('/api/catalogos/producto').set(auth(ajeno))).body.data.items).toEqual([]);
    } finally {
      await deleteTestTenant(t.container.prisma, otro.id);
    }
  });

  it('gasto por catálogo con nombreTipoGasto', async () => {
    const g = await api().post('/api/catalogos/gasto').set(auth(admin)).send({ idTipoGasto: cat.tipoGasto.id, nombre: 'Tortillas', gastoTotal: 120.5 });
    expect(g.status).toBe(201);
    expect(g.body.data).toMatchObject({ nombre: 'Tortillas', gastoTotal: 120.5, nombreTipoGasto: 'Insumos' });
  });
});
