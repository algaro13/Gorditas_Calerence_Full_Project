import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { appPrisma, createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';
import { generateFolio, nextCounter, nextPedidoNumber } from '../../src/shared/infrastructure/prisma/counters';

describe('Contadores por tenant', () => {
  let prisma: PrismaClient;
  let a: TestTenant;
  let b: TestTenant;
  const now = new Date('2026-09-06T18:00:00Z');

  beforeAll(async () => {
    prisma = appPrisma();
    a = await createTestTenant(prisma);
    b = await createTestTenant(prisma);
  });

  afterAll(async () => {
    await deleteTestTenant(prisma, a.id);
    await deleteTestTenant(prisma, b.id);
    await prisma.$disconnect();
  });

  it('cada tenant tiene su propia secuencia', async () => {
    const folioA1 = await runAsTenant(prisma, a.id, () => generateFolio(now, 'America/Mexico_City'));
    const folioA2 = await runAsTenant(prisma, a.id, () => generateFolio(now, 'America/Mexico_City'));
    const folioB1 = await runAsTenant(prisma, b.id, () => generateFolio(now, 'America/Mexico_City'));
    expect(folioA1).toBe('ORD-260906-0001');
    expect(folioA2).toBe('ORD-260906-0002');
    expect(folioB1).toBe('ORD-260906-0001');
  });

  it('el número de pedido reinicia por día y es atómico bajo concurrencia', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => runAsTenant(prisma, a.id, () => nextPedidoNumber(now, 'America/Mexico_City'))));
    expect([...results].sort((x, y) => x - y)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    const otroDia = await runAsTenant(prisma, a.id, () => nextPedidoNumber(new Date('2026-09-07T18:00:00Z'), 'America/Mexico_City'));
    expect(otroDia).toBe(1);
  });

  it('nextCounter falla fuera de una transacción de tenant', async () => {
    await expect(nextCounter('x')).rejects.toThrow('No tenant context');
  });
});
