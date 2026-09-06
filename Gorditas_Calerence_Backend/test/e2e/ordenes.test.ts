import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, seedCatalogo, type TestTenant } from '../helpers/db';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';

describe('Módulo ordenes', () => {
  let t: TestApp;
  let tenant: TestTenant;
  let cat: Awaited<ReturnType<typeof seedCatalogo>>;
  let mesero: string;
  let cocinero: string;
  let admin: string;

  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    t = await createTestApp();
    tenant = await createTestTenant(t.container.prisma);
    cat = await seedCatalogo(t.container.prisma, tenant.id);
    mesero = await tokenFor(t.keys, { userId: 'mesero', orgId: tenant.orgId, roles: ['Mesero'] });
    cocinero = await tokenFor(t.keys, { userId: 'cocinero', orgId: tenant.orgId, roles: ['Cocinero'] });
    admin = await tokenFor(t.keys, { userId: 'admin', orgId: tenant.orgId, roles: ['Admin'] });
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  async function crearOrden(extra: Record<string, unknown> = {}) {
    const res = await api()
      .post('/api/ordenes/nueva')
      .set(auth(mesero))
      .send({ idTipoOrden: cat.tipoOrden.id, nombreTipoOrden: 'ignorado', idMesa: cat.mesa.id, nombreMesa: 'ignorada', total: 999, ...extra });
    expect(res.status).toBe(201);
    return res.body.data as { _id: string; folio: string; estatus: string; nombreMesa: string; nombreTipoOrden: string; total: number };
  }

  it('crea la orden con folio por tenant y datos del catálogo', async () => {
    const orden = await crearOrden();
    expect(orden.folio).toMatch(/^ORD-\d{6}-\d{4}$/);
    expect(orden.estatus).toBe('Recepcion');
    expect(orden.nombreMesa).toBe('Mesa 1');
    expect(orden.nombreTipoOrden).toBe('En mesa');
    expect(orden.total).toBe(0);
  });

  it('rechaza tipo de orden o mesa inexistentes', async () => {
    const r1 = await api().post('/api/ordenes/nueva').set(auth(mesero)).send({ idTipoOrden: 9999 });
    expect(r1.status).toBe(400);
    const r2 = await api().post('/api/ordenes/nueva').set(auth(mesero)).send({ idTipoOrden: cat.tipoOrden.id, idMesa: 9999 });
    expect(r2.status).toBe(400);
  });

  it('arma el árbol completo con precios del catálogo y recalcula el total', async () => {
    const orden = await crearOrden();

    const sub = await api().post(`/api/ordenes/${orden._id}/suborden`).set(auth(mesero)).send({ nombre: 'Juan' });
    expect(sub.status).toBe(201);
    const subId = sub.body.data._id as string;

    const plat = await api()
      .post(`/api/ordenes/suborden/${subId}/platillo`)
      .set(auth(mesero))
      .send({ idPlatillo: cat.platillo.id, nombrePlatillo: 'x', idGuiso: cat.guiso.id, nombreGuiso: 'x', costoPlatillo: 999, cantidad: 2, notas: 'sin cebolla' });
    expect(plat.status).toBe(201);
    expect(plat.body.data).toMatchObject({ nombrePlatillo: 'Gordita sencilla', nombreGuiso: 'Chicharrón', costoPlatillo: 25, importe: 50, notas: 'sin cebolla', total: 50 });
    const platId = plat.body.data._id as string;

    const ext = await api().post(`/api/ordenes/platillo/${platId}/extra`).set(auth(mesero)).send({ idExtra: cat.extra.id, nombreExtra: 'x', costoExtra: 999, cantidad: 1 });
    expect(ext.status).toBe(201);
    expect(ext.body.data).toMatchObject({ nombreExtra: 'Queso extra', costoExtra: 5, importe: 5, total: 55 });

    const prod = await api().post(`/api/ordenes/${orden._id}/producto`).set(auth(mesero)).send({ idProducto: cat.producto.id, nombreProducto: 'x', costoProducto: 999, cantidad: 2 });
    expect(prod.status).toBe(201);
    expect(prod.body.data).toMatchObject({ nombreProducto: 'Agua', costoProducto: 15, importe: 30, total: 85 });

    const stock = await runAsTenant(t.container.prisma, tenant.id, (db) => db.producto.findUniqueOrThrow({ where: { id: cat.producto.id } }));
    expect(stock.cantidad).toBe(8);

    const detalle = await api().get(`/api/ordenes/${orden._id}`).set(auth(mesero));
    expect(detalle.status).toBe(200);
    const d = detalle.body.data;
    expect(d.total).toBe(85);
    expect(d.subordenes).toHaveLength(1);
    expect(d.productos).toHaveLength(1);
    expect(d.platillos).toHaveLength(1);
    expect(d.platillos[0].idSuborden).toBe(subId);
    expect(d.platillos[0].extras).toHaveLength(1);
    expect(d.extras).toHaveLength(1);
    expect(d.tenantId).toBeUndefined();

    // Quitar el extra recalcula
    const del = await api().delete(`/api/ordenes/extra/${d.extras[0]._id}`).set(auth(mesero));
    expect(del.status).toBe(200);
    const after = await api().get(`/api/ordenes/${orden._id}`).set(auth(mesero));
    expect(after.body.data.total).toBe(80);

    // Nota, listo y entregado
    expect((await api().put(`/api/ordenes/platillo/${platId}/nota`).set(auth(mesero)).send({ notas: 'extra salsa' })).status).toBe(200);
    expect((await api().put(`/api/ordenes/platillo/${platId}/listo`).set(auth(cocinero))).status).toBe(200);
    expect((await api().put(`/api/ordenes/producto/${prod.body.data._id}/entregado`).set(auth(mesero))).status).toBe(200);
    const flags = await api().get(`/api/ordenes/${orden._id}`).set(auth(mesero));
    expect(flags.body.data.platillos[0]).toMatchObject({ notas: 'extra salsa', listo: true });
    expect(flags.body.data.productos[0].entregado).toBe(true);
    expect((await api().put('/api/ordenes/platillo/00000000-0000-0000-0000-000000000000/listo').set(auth(mesero))).status).toBe(404);
  });

  it('stock insuficiente responde 400 sin crear línea; el decremento es atómico', async () => {
    const orden = await crearOrden();
    const mucho = await api().post(`/api/ordenes/${orden._id}/producto`).set(auth(mesero)).send({ idProducto: cat.producto.id, cantidad: 100 });
    expect(mucho.status).toBe(400);
    expect(mucho.body.message).toBe('Producto no disponible o stock insuficiente');

    const [a, b] = await Promise.all([
      api().post(`/api/ordenes/${orden._id}/producto`).set(auth(mesero)).send({ idProducto: cat.productoUnico.id, cantidad: 1 }),
      api().post(`/api/ordenes/${orden._id}/producto`).set(auth(mesero)).send({ idProducto: cat.productoUnico.id, cantidad: 1 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 400]);
    const stock = await runAsTenant(t.container.prisma, tenant.id, (db) => db.producto.findUniqueOrThrow({ where: { id: cat.productoUnico.id } }));
    expect(stock.cantidad).toBe(0);
  });

  it('lista con filtros y paginación legacy', async () => {
    const res = await api().get('/api/ordenes?limit=1000&estatusNo=Pagada,Cancelado').set(auth(mesero));
    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 1000 });
    expect(res.body.data.ordenes.every((o: { estatus: string }) => !['Pagada', 'Cancelado'].includes(o.estatus))).toBe(true);
    const porMesa = await api().get(`/api/ordenes?mesa=${cat.mesa.id}&limit=2`).set(auth(mesero));
    expect(porMesa.body.data.ordenes.length).toBeLessThanOrEqual(2);
    expect(porMesa.body.data.ordenes.every((o: { idMesa: number }) => o.idMesa === cat.mesa.id)).toBe(true);
    const hoy = new Date().toISOString().slice(0, 10);
    expect((await api().get(`/api/ordenes?fecha=${hoy}`).set(auth(mesero))).status).toBe(200);
    expect((await api().get('/api/ordenes?fecha=ayer').set(auth(mesero))).status).toBe(400);
  });

  it('transiciones por rol, Surtida marca listo y Pagada fija fechaPago', async () => {
    const orden = await crearOrden();
    const sub = (await api().post(`/api/ordenes/${orden._id}/suborden`).set(auth(mesero)).send({ nombre: 'Ana' })).body.data;
    await api().post(`/api/ordenes/suborden/${sub._id}/platillo`).set(auth(mesero)).send({ idPlatillo: cat.platillo.id, idGuiso: cat.guiso.id, cantidad: 1 });
    await api().post(`/api/ordenes/${orden._id}/producto`).set(auth(mesero)).send({ idProducto: cat.producto.id, cantidad: 1 });

    expect((await api().put(`/api/ordenes/${orden._id}/estatus`).set(auth(mesero)).send({ estatus: 'Volando' })).status).toBe(400);

    const surtida = await api().put(`/api/ordenes/${orden._id}/estatus`).set(auth(cocinero)).send({ estatus: 'Surtida' });
    expect(surtida.status).toBe(200);
    const d = (await api().get(`/api/ordenes/${orden._id}`).set(auth(mesero))).body.data;
    expect(d.platillos.every((p: { listo: boolean }) => p.listo)).toBe(true);
    expect(d.productos.every((p: { listo: boolean }) => p.listo)).toBe(true);

    const cocineroCobra = await api().put(`/api/ordenes/${orden._id}/estatus`).set(auth(cocinero)).send({ estatus: 'Pagada' });
    expect(cocineroCobra.status).toBe(403);
    expect(cocineroCobra.body.message).toBe('Transición de estatus no permitida para su rol');

    const pagada = await api().put(`/api/ordenes/${orden._id}/estatus`).set(auth(mesero)).send({ estatus: 'Pagada', role: 'admin' });
    expect(pagada.status).toBe(200);
    expect(pagada.body.data.fechaPago).toBeTruthy();

    // Admin puede regresar cualquier estatus
    expect((await api().put(`/api/ordenes/${orden._id}/estatus`).set(auth(admin)).send({ estatus: 'Recepcion' })).status).toBe(200);
  });

  it('verificar solo aplica a órdenes pendientes y actualiza fecha-hora', async () => {
    const pendiente = await crearOrden({ estatus: 'Pendiente' });
    expect(pendiente.estatus).toBe('Pendiente');
    const ok = await api().put(`/api/ordenes/${pendiente._id}/verificar`).set(auth(mesero)).send({ isComplete: true });
    expect(ok.status).toBe(200);
    expect(ok.body.data.estatus).toBe('Recepcion');
    const otra = await api().put(`/api/ordenes/${pendiente._id}/verificar`).set(auth(mesero)).send({ isComplete: true });
    expect(otra.status).toBe(400);
    expect((await api().put(`/api/ordenes/${pendiente._id}/verificar`).set(auth(cocinero)).send({ isComplete: true })).status).toBe(403);

    const fh = await api().put(`/api/ordenes/${pendiente._id}/fecha-hora`).set(auth(mesero)).send({ fechaHora: '2026-01-02T03:04:05.000Z' });
    expect(fh.status).toBe(200);
    expect(new Date(fh.body.data.fechaHora).toISOString()).toBe('2026-01-02T03:04:05.000Z');
  });

  it('eliminar la orden borra todo el árbol', async () => {
    const orden = await crearOrden();
    const sub = (await api().post(`/api/ordenes/${orden._id}/suborden`).set(auth(mesero)).send({ nombre: 'Luis' })).body.data;
    const plat = (await api().post(`/api/ordenes/suborden/${sub._id}/platillo`).set(auth(mesero)).send({ idPlatillo: cat.platillo.id, idGuiso: cat.guiso.id, cantidad: 1 })).body.data;
    await api().post(`/api/ordenes/platillo/${plat._id}/extra`).set(auth(mesero)).send({ idExtra: cat.extra.id, cantidad: 2 });
    await api().post(`/api/ordenes/${orden._id}/producto`).set(auth(mesero)).send({ idProducto: cat.producto.id, cantidad: 1 });

    expect((await api().delete(`/api/ordenes/${orden._id}`).set(auth(mesero))).status).toBe(200);
    expect((await api().get(`/api/ordenes/${orden._id}`).set(auth(mesero))).status).toBe(404);
    const restos = await runAsTenant(t.container.prisma, tenant.id, async (db) => ({
      sub: await db.suborden.count({ where: { idOrden: orden._id } }),
      plat: await db.ordenDetallePlatillo.count({ where: { idSuborden: sub._id } }),
      ext: await db.ordenDetalleExtra.count({ where: { idOrdenDetallePlatillo: plat._id } }),
      prod: await db.ordenDetalleProducto.count({ where: { idOrden: orden._id } }),
    }));
    expect(restos).toEqual({ sub: 0, plat: 0, ext: 0, prod: 0 });
  });

  it('otro tenant no ve ni puede tocar la orden', async () => {
    const orden = await crearOrden();
    const otro = await createTestTenant(t.container.prisma);
    try {
      const ajeno = await tokenFor(t.keys, { userId: 'x', orgId: otro.orgId, roles: ['Admin'] });
      expect((await api().get(`/api/ordenes/${orden._id}`).set(auth(ajeno))).status).toBe(404);
      expect((await api().delete(`/api/ordenes/${orden._id}`).set(auth(ajeno))).status).toBe(404);
      expect((await api().put(`/api/ordenes/${orden._id}/estatus`).set(auth(ajeno)).send({ estatus: 'Pagada' })).status).toBe(404);
    } finally {
      await deleteTestTenant(t.container.prisma, otro.id);
    }
  });
});
