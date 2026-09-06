import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, seedCatalogo, type TestTenant } from '../helpers/db';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';

describe('Módulo inventario', () => {
  let t: TestApp;
  let tenant: TestTenant;
  let cat: Awaited<ReturnType<typeof seedCatalogo>>;
  let encargado: string;
  let mesero: string;
  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    t = await createTestApp();
    tenant = await createTestTenant(t.container.prisma);
    cat = await seedCatalogo(t.container.prisma, tenant.id);
    await runAsTenant(t.container.prisma, tenant.id, (db) => db.producto.create({ data: { nombre: 'Agotado', idTipoProducto: cat.tipoProducto.id, cantidad: 0, costo: 1 } }));
    encargado = await tokenFor(t.keys, { userId: 'enc', orgId: tenant.orgId, roles: ['Encargado'] });
    mesero = await tokenFor(t.keys, { userId: 'mes', orgId: tenant.orgId, roles: ['Mesero'] });
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  it('consulta con alertas y resumen', async () => {
    const res = await api().get('/api/inventario').set(auth(mesero));
    expect(res.status).toBe(200);
    const byName = Object.fromEntries(res.body.data.productos.map((p: { nombre: string }) => [p.nombre, p]));
    expect(byName['Agua']).toMatchObject({ stockBajo: false, stockAgotado: false, nombreTipoProducto: 'Bebidas' });
    expect(byName['Última cerveza']).toMatchObject({ cantidad: 1, stockBajo: true, stockAgotado: false });
    expect(byName['Agotado']).toMatchObject({ stockBajo: true, stockAgotado: true });
    expect(res.body.data.resumen).toMatchObject({ total: 3, stockBajo: 1, stockAgotado: 1 });
    expect(res.body.data.pagination.total).toBe(3);
  });

  it('recibir por lote (solo Encargado/Admin) y ajustar', async () => {
    expect((await api().post('/api/inventario/recibir').set(auth(mesero)).send({ productos: [{ idProducto: cat.producto.id, cantidad: 1 }] })).status).toBe(403);
    expect((await api().post('/api/inventario/recibir').set(auth(encargado)).send({ productos: [] })).status).toBe(400);

    const rec = await api()
      .post('/api/inventario/recibir')
      .set(auth(encargado))
      .send({ productos: [{ idProducto: cat.producto.id, cantidad: 5 }, { idProducto: cat.productoUnico.id, cantidad: 0 }, { idProducto: 9999, cantidad: 3 }] });
    expect(rec.status).toBe(200);
    expect(rec.body.message).toBe('1 productos actualizados exitosamente');
    expect(rec.body.data[0]).toMatchObject({ nombre: 'Agua', cantidad: 15 });

    expect((await api().put(`/api/inventario/ajustar/${cat.producto.id}`).set(auth(encargado)).send({ cantidad: -1 })).status).toBe(400);
    const adj = await api().put(`/api/inventario/ajustar/${cat.producto.id}`).set(auth(encargado)).send({ cantidad: 7, motivo: 'merma' });
    expect(adj.status).toBe(200);
    expect(adj.body.data.cantidad).toBe(7);
    expect((await api().put('/api/inventario/ajustar/9999').set(auth(encargado)).send({ cantidad: 1 })).status).toBe(404);
  });
});
