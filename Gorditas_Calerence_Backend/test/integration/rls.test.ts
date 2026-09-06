import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { appPrisma, createTestTenant, deleteTestTenant, seedMinimal, type TestTenant } from '../helpers/db';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';

describe('Row Level Security', () => {
  let prisma: PrismaClient;
  let a: TestTenant;
  let b: TestTenant;
  let productoA: { id: number };
  let productoB: { id: number };

  beforeAll(async () => {
    prisma = appPrisma();
    a = await createTestTenant(prisma);
    b = await createTestTenant(prisma);
    productoA = (await seedMinimal(prisma, a.id)).producto;
    productoB = (await seedMinimal(prisma, b.id)).producto;
  });

  afterAll(async () => {
    await deleteTestTenant(prisma, a.id);
    await deleteTestTenant(prisma, b.id);
    await prisma.$disconnect();
  });

  it('el rol de runtime no tiene BYPASSRLS y las tablas tienen FORCE RLS', async () => {
    const rows = await prisma.$queryRaw<Array<{ rolbypassrls: boolean }>>`SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user`;
    expect(rows[0].rolbypassrls).toBe(false);
    const tables = await prisma.$queryRaw<Array<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>>`
      SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
      WHERE relname IN ('productos','ordenes','tenant_users','counters','orden_detalle_extras')`;
    expect(tables).toHaveLength(5);
    for (const t of tables) {
      expect(t.relrowsecurity, t.relname).toBe(true);
      expect(t.relforcerowsecurity, t.relname).toBe(true);
    }
  });

  it('sin contexto de tenant no se ve nada y no se puede insertar', async () => {
    expect(await prisma.producto.findMany()).toEqual([]);
    expect(await prisma.producto.count()).toBe(0);
    await expect(prisma.mesa.create({ data: { nombre: 'Fantasma' } })).rejects.toThrow();
  });

  it('dentro del contexto solo se ven las filas propias', async () => {
    const visibles = await runAsTenant(prisma, a.id, (db) => db.producto.findMany());
    expect(visibles.map((p) => p.id)).toEqual([productoA.id]);
    const ajeno = await runAsTenant(prisma, a.id, (db) => db.producto.findUnique({ where: { id: productoB.id } }));
    expect(ajeno).toBeNull();
  });

  it('la aplicación nunca escribe tenant_id: lo pone el DEFAULT', async () => {
    const mesa = await runAsTenant(prisma, b.id, (db) => db.mesa.create({ data: { nombre: 'Mesa nueva' } }));
    expect(mesa.tenantId).toBe(b.id);
  });

  it('actualizar o borrar una fila de otro tenant no afecta nada', async () => {
    const updated = await runAsTenant(prisma, a.id, (db) => db.producto.updateMany({ where: { id: productoB.id }, data: { cantidad: 0 } }));
    expect(updated.count).toBe(0);
    await expect(runAsTenant(prisma, a.id, (db) => db.producto.update({ where: { id: productoB.id }, data: { cantidad: 0 } }))).rejects.toMatchObject({ code: 'P2025' });
    const intacto = await runAsTenant(prisma, b.id, (db) => db.producto.findUnique({ where: { id: productoB.id } }));
    expect(intacto?.cantidad).toBe(10);
  });

  it('una referencia cruzada la rechaza la base (FK compuesta)', async () => {
    await expect(
      runAsTenant(prisma, a.id, (db) => db.producto.create({ data: { nombre: 'Cruzado', idTipoProducto: (productoB as { id: number }).id + 1000, cantidad: 1, costo: 1 } })),
    ).rejects.toThrow();
    // Referencia a un tipo de producto real pero de B
    const tipoB = await runAsTenant(prisma, b.id, (db) => db.tipoProducto.findFirstOrThrow());
    await expect(runAsTenant(prisma, a.id, (db) => db.producto.create({ data: { nombre: 'Cruzado', idTipoProducto: tipoB.id, cantidad: 1, costo: 1 } }))).rejects.toThrow();
  });

  it('el contexto no se filtra a otra conexión tras el commit', async () => {
    await runAsTenant(prisma, a.id, (db) => db.producto.findMany());
    // Varias consultas sin contexto seguidas: deben caer en conexiones del pool ya usadas
    for (let i = 0; i < 5; i++) expect(await prisma.producto.findMany()).toEqual([]);
  });

  it('$queryRaw también está sujeto a RLS', async () => {
    const rows = await runAsTenant(prisma, a.id, (db) => db.$queryRaw<Array<{ id: number }>>`SELECT id FROM productos`);
    expect(rows.map((r) => r.id)).toEqual([productoA.id]);
  });
});
