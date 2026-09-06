import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, seedCatalogo, type TestTenant } from '../helpers/db';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';

describe('Módulo reportes', () => {
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
    encargado = await tokenFor(t.keys, { userId: 'enc', orgId: tenant.orgId, roles: ['Encargado'] });
    mesero = await tokenFor(t.keys, { userId: 'mes', orgId: tenant.orgId, roles: ['Mesero'] });

    // Órdenes directas en la base con fechas controladas
    await runAsTenant(t.container.prisma, tenant.id, async (db) => {
      const base = { idTipoOrden: cat.tipoOrden.id, nombreTipoOrden: 'En mesa', idMesa: cat.mesa.id, nombreMesa: 'Mesa 1' };
      // 03:30Z del 6 sep = 21:30 del 5 sep en CDMX
      const o1 = await db.orden.create({ data: { ...base, folio: 'R-1', estatus: 'Pagada', total: 100, fechaHora: new Date('2026-09-06T03:30:00Z'), fechaPago: new Date('2026-09-06T03:30:00Z') } });
      const o2 = await db.orden.create({ data: { ...base, folio: 'R-2', estatus: 'Pagada', total: 50, fechaHora: new Date('2026-09-06T18:00:00Z'), fechaPago: new Date('2026-09-06T18:00:00Z') } });
      const o3 = await db.orden.create({ data: { ...base, folio: 'R-3', estatus: 'Entregada', total: 30, fechaHora: new Date('2026-09-06T19:00:00Z') } });
      await db.orden.create({ data: { ...base, folio: 'R-4', estatus: 'Recepcion', total: 999, fechaHora: new Date('2026-09-06T20:00:00Z') } });
      for (const [o, cant] of [[o1, 2], [o2, 1], [o3, 3]] as const) {
        await db.ordenDetalleProducto.create({ data: { idOrden: o.id, idProducto: cat.producto.id, nombreProducto: 'Agua', costoProducto: 15, cantidad: cant, importe: 15 * cant } });
      }
      const sub = await db.suborden.create({ data: { idOrden: o1.id, nombre: 'S' } });
      const p = await db.ordenDetallePlatillo.create({
        data: { idSuborden: sub.id, idPlatillo: cat.platillo.id, nombrePlatillo: 'Gordita sencilla', idGuiso: cat.guiso.id, nombreGuiso: 'Chicharrón', costoPlatillo: 25, cantidad: 2, importe: 50 },
      });
      await db.ordenDetalleExtra.create({ data: { idOrdenDetallePlatillo: p.id, idExtra: cat.extra.id, nombreExtra: 'Queso extra', costoExtra: 5, cantidad: 1, importe: 5 } });
    });
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  it('solo Encargado/Admin', async () => {
    expect((await api().get('/api/reportes/ventas').set(auth(mesero))).status).toBe(403);
  });

  it('ventas: forma legacy y corte de día en Mexico City', async () => {
    const res = await api().get('/api/reportes/ventas?fechaInicio=2026-09-01&fechaFin=2026-09-30').set(auth(encargado));
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.ordenes).toHaveLength(2);
    expect(d.ordenes.every((o: { estatus: string }) => o.estatus === 'Pagada')).toBe(true);
    expect(d.productos).toHaveLength(2);
    expect(d.platillos).toHaveLength(1);
    expect(d.extras).toHaveLength(1);
    expect(d.pagination).toEqual({ total: 2 });
    expect(d.resumen).toEqual({ totalVentas: 150, cantidadOrdenes: 2, promedioVenta: 75 });
    expect(d.ventasPorDia).toEqual([
      { _id: '2026-09-05', ventas: 100, ordenes: 1 },
      { _id: '2026-09-06', ventas: 50, ordenes: 1 },
    ]);
    expect(d.ventasPorTipo).toEqual([{ _id: 'En mesa', ventas: 150, ordenes: 2 }]);
    expect(d.ordenesPagadas).toBe(2);

    const solo5 = await api().get('/api/reportes/ventas?fechaInicio=2026-09-05&fechaFin=2026-09-05').set(auth(encargado));
    expect(solo5.body.data.ordenes).toHaveLength(1);
    expect(solo5.body.data.ordenes[0].folio).toBe('R-1');
  });

  it('inventario', async () => {
    const res = await api().get('/api/reportes/inventario').set(auth(encargado));
    expect(res.status).toBe(200);
    expect(res.body.data.resumen).toMatchObject({ totalProductos: 2, stockBajo: 1, stockAgotado: 0, valorInventario: 180 });
    expect(res.body.data.alertas.stockBajo.map((p: { nombre: string }) => p.nombre)).toEqual(['Última cerveza']);
  });

  it('gastos: crear, listar con agregados y eliminar', async () => {
    const bad = await api().post('/api/reportes/gastos').set(auth(encargado)).send({ nombre: 'x', idTipoGasto: 9999, gastoTotal: 10 });
    expect(bad.status).toBe(400);
    const g = await api().post('/api/reportes/gastos').set(auth(encargado)).send({ nombre: 'Gas', idTipoGasto: cat.tipoGasto.id, gastoTotal: 200, descripcion: 'tanque' });
    expect(g.status).toBe(201);
    expect(g.body.data).toMatchObject({ nombre: 'Gas', nombreTipoGasto: 'Insumos', gastoTotal: 200 });

    const lista = await api().get('/api/reportes/gastos').set(auth(encargado));
    expect(lista.status).toBe(200);
    expect(lista.body.data.gastos).toHaveLength(1);
    expect(lista.body.data.resumen).toEqual({ totalGastos: 200, cantidadGastos: 1, promedioGasto: 200 });
    expect(lista.body.data.gastosPorTipo).toEqual([{ _id: 'Insumos', gastos: 200, cantidad: 1 }]);
    expect(lista.body.data.gastosPorDia).toHaveLength(1);

    expect((await api().delete(`/api/reportes/gastos/${g.body.data._id}`).set(auth(encargado))).status).toBe(200);
    expect((await api().delete(`/api/reportes/gastos/${g.body.data._id}`).set(auth(encargado))).status).toBe(404);
  });

  it('productos más vendidos cuenta Entregada y Pagada', async () => {
    const res = await api().get('/api/reportes/productos-vendidos').set(auth(encargado));
    expect(res.status).toBe(200);
    expect(res.body.data.productos).toEqual([{ _id: { idProducto: cat.producto.id, nombreProducto: 'Agua' }, cantidadVendida: 6, totalVentas: 90, vecesVendido: 3 }]);
    expect(res.body.data.platillos).toEqual([{ _id: { idPlatillo: cat.platillo.id, nombrePlatillo: 'Gordita sencilla' }, cantidadVendida: 2, totalVentas: 50, vecesVendido: 1 }]);
    const rango = await api().get('/api/reportes/productos-vendidos?fechaInicio=2026-09-06&fechaFin=2026-09-06').set(auth(encargado));
    expect(rango.body.data.productos[0].cantidadVendida).toBe(4);
  });
});
