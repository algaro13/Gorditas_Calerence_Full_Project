import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { createTestTenant, deleteTestTenant, seedCatalogo, type TestTenant } from '../helpers/db';

/**
 * Las promociones de extremo a extremo: el catálogo, y lo que le hacen a una orden de verdad.
 *
 * Las reglas una por una se prueban en `test/unit/promociones.test.ts`, sin base. Aquí se
 * comprueba lo que solo se ve montando la orden: que el descuento es una línea, que entra en el
 * total, que se rehace al cambiar las líneas, y que un restaurante no ve las promociones de otro.
 */
describe('Módulo promociones', () => {
  let t: TestApp;
  let tenant: TestTenant;
  let cat: Awaited<ReturnType<typeof seedCatalogo>>;
  let admin: string;
  let mesero: string;

  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    t = await createTestApp();
    tenant = await createTestTenant(t.container.prisma);
    cat = await seedCatalogo(t.container.prisma, tenant.id);
    admin = await tokenFor(t.keys, { userId: 'admin', orgId: tenant.orgId, roles: ['Admin'] });
    mesero = await tokenFor(t.keys, { userId: 'mesero', orgId: tenant.orgId, roles: ['Mesero'] });
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  /** Una orden con `cantidad` platillos del catálogo sembrado. */
  async function ordenCon(cantidad: number) {
    const orden = await api()
      .post('/api/ordenes/nueva')
      .set(auth(mesero))
      .send({ idMesa: cat.mesa.id, nombreCliente: 'Promo' });
    const idOrden = orden.body.data._id as string;
    const sub = await api().post(`/api/ordenes/${idOrden}/suborden`).set(auth(mesero)).send({ nombre: 'Uno' });
    const linea = await api()
      .post(`/api/ordenes/suborden/${sub.body.data._id}/platillo`)
      .set(auth(mesero))
      .send({ idPlatillo: cat.platillo.id, idGuiso: cat.guiso.id, cantidad });
    return { idOrden, idLinea: linea.body.data._id as string, total: linea.body.data.total as number };
  }

  const verOrden = async (id: string) => (await api().get(`/api/ordenes/${id}`).set(auth(mesero))).body.data;

  it('cada forma exige sus propios parámetros', async () => {
    const malas = [
      { nombre: 'Combo sin precio', forma: 'combo', items: [{ idPlatillo: cat.platillo.id, cantidad: 2 }] },
      { nombre: 'Combo sin artículos', forma: 'combo', precio: 50 },
      { nombre: 'Paga más de lo que lleva', forma: 'nxm', lleva: 2, paga: 3 },
      { nombre: 'Porcentaje imposible', forma: 'porcentaje', porcentaje: 0 },
      { nombre: 'Media franja', forma: 'porcentaje', porcentaje: 10, horaInicio: '16:00' },
    ];
    for (const mala of malas) {
      const res = await api().post('/api/promociones').set(auth(admin)).send(mala);
      expect(res.status, JSON.stringify(mala)).toBe(400);
    }
  });

  it('escribir promociones es cosa del Admin; leerlas basta con Encargado', async () => {
    const delMesero = await api().post('/api/promociones').set(auth(mesero)).send({ nombre: 'x', forma: 'porcentaje', porcentaje: 10 });
    expect(delMesero.status).toBe(403);
    // Un mesero tampoco las lee: la lista es de quien maneja el reporte.
    expect((await api().get('/api/promociones').set(auth(mesero))).status).toBe(403);
    expect((await api().get('/api/promociones').set(auth(admin))).status).toBe(200);
  });

  it('un descuento es una línea de la orden y entra en el total', async () => {
    const promo = await api()
      .post('/api/promociones')
      .set(auth(admin))
      .send({ nombre: '10 % de bienvenida', forma: 'porcentaje', porcentaje: 10 });
    expect(promo.status).toBe(201);
    const idPromo = promo.body.data.id as number;

    try {
      // Dos platillos de 25 = 50 de carta; menos el 10 % = 45.
      const { idOrden } = await ordenCon(2);
      const d = await verOrden(idOrden);

      expect(d.descuentos).toHaveLength(1);
      expect(d.descuentos[0]).toMatchObject({ nombre: '10 % de bienvenida', importe: -5 });
      expect(d.total).toBe(45);

      // El bruto sigue en las líneas: el descuento no les tocó el precio.
      expect(d.platillos[0].importe).toBe(50);
    } finally {
      await api().delete(`/api/promociones/${idPromo}`).set(auth(admin));
    }
  });

  it('quitar la línea que ganaba la promoción retira su descuento', async () => {
    const promo = await api()
      .post('/api/promociones')
      .set(auth(admin))
      .send({ nombre: '3x2', forma: 'nxm', lleva: 3, paga: 2 });
    const idPromo = promo.body.data.id as number;

    try {
      const { idOrden, idLinea } = await ordenCon(3);
      const conPromo = await verOrden(idOrden);
      expect(conPromo.descuentos).toHaveLength(1);
      expect(conPromo.total).toBe(50); // 75 de carta, una gordita gratis

      // Se quita la línea entera: ya no hay tres, así que no hay 3x2 que valga.
      expect((await api().delete(`/api/ordenes/platillo/${idLinea}`).set(auth(mesero))).status).toBe(200);
      const sinPromo = await verOrden(idOrden);
      expect(sinPromo.descuentos).toEqual([]);
      expect(sinPromo.total).toBe(0);
    } finally {
      await api().delete(`/api/promociones/${idPromo}`).set(auth(admin));
    }
  });

  it('una promoción desactivada deja de aplicarse, y no se borra', async () => {
    const promo = await api()
      .post('/api/promociones')
      .set(auth(admin))
      .send({ nombre: 'Temporal', forma: 'porcentaje', porcentaje: 20 });
    const idPromo = promo.body.data.id as number;

    const { idOrden } = await ordenCon(1);
    expect((await verOrden(idOrden)).descuentos).toHaveLength(1);

    expect((await api().delete(`/api/promociones/${idPromo}`).set(auth(admin))).status).toBe(200);

    // Sigue en la lista completa, desactivada: la orden anterior aún explica su descuento.
    const todas = await api().get('/api/promociones').set(auth(admin));
    expect(todas.body.data.promociones.find((p: { id: number }) => p.id === idPromo)).toMatchObject({ activo: false });

    // Y una orden nueva ya no la gana.
    const otra = await ordenCon(1);
    expect((await verOrden(otra.idOrden)).descuentos).toEqual([]);
  });

  it('una orden pagada no cambia de descuentos aunque cambien las promociones', async () => {
    const promo = await api()
      .post('/api/promociones')
      .set(auth(admin))
      .send({ nombre: 'Del día', forma: 'porcentaje', porcentaje: 10 });
    const idPromo = promo.body.data.id as number;

    const { idOrden } = await ordenCon(2);
    expect((await api().put(`/api/ordenes/${idOrden}/estatus`).set(auth(admin)).send({ estatus: 'Pagada' })).status).toBe(200);
    const alPagar = await verOrden(idOrden);

    // Se desactiva la promoción y se intenta mover la orden: lo cobrado es un hecho consumado.
    await api().delete(`/api/promociones/${idPromo}`).set(auth(admin));
    const sub = alPagar.subordenes[0]._id;
    expect((await api().post(`/api/ordenes/suborden/${sub}/platillo`).set(auth(mesero)).send({ idPlatillo: cat.platillo.id, idGuiso: cat.guiso.id, cantidad: 1 })).status).toBe(409);

    const despues = await verOrden(idOrden);
    expect(despues.total).toBe(alPagar.total);
    expect(despues.descuentos).toEqual(alPagar.descuentos);
    // Y el nombre sigue ahí aunque la promoción ya no esté activa.
    expect(despues.descuentos[0].nombre).toBe('Del día');
  });

  it('el reporte separa bruto, descuento y neto, y dice qué dio cada promoción', async () => {
    const encargado = await tokenFor(t.keys, { userId: 'enc', orgId: tenant.orgId, roles: ['Encargado'] });
    const promo = await api()
      .post('/api/promociones')
      .set(auth(admin))
      .send({ nombre: 'Mitad de precio', forma: 'porcentaje', porcentaje: 50 });
    const idPromo = promo.body.data.id as number;

    try {
      const { idOrden } = await ordenCon(2); // 50 de carta, 25 de descuento
      await api().put(`/api/ordenes/${idOrden}/estatus`).set(auth(admin)).send({ estatus: 'Pagada' });

      const rep = await api().get('/api/reportes/ventas').set(auth(encargado));
      const d = rep.body.data;

      // Las tres cifras, y que cuadren entre sí: sin el bruto no se puede ver cuánto se regaló.
      expect(d.resumen.totalDescuentos).toBeGreaterThanOrEqual(25);
      expect(d.resumen.totalBruto).toBe(d.resumen.totalVentas + d.resumen.totalDescuentos);

      const mia = d.descuentosPorPromocion.find((x: { _id: string }) => x._id === 'Mitad de precio');
      expect(mia, 'la promoción no aparece desglosada en el reporte').toMatchObject({ descuento: 25, ordenes: 1 });
    } finally {
      await api().delete(`/api/promociones/${idPromo}`).set(auth(admin));
    }
  });

  it('otro restaurante no ve estas promociones', async () => {
    const otro = await createTestTenant(t.container.prisma);
    try {
      const ajeno = await tokenFor(t.keys, { userId: 'a2', orgId: otro.orgId, roles: ['Admin'] });
      const suyas = await api().get('/api/promociones').set(auth(ajeno));
      expect(suyas.status).toBe(200);
      expect(suyas.body.data.promociones, 'un restaurante vio las promociones de otro').toEqual([]);
    } finally {
      await deleteTestTenant(t.container.prisma, otro.id);
    }
  });
});
