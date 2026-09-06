import { AsyncLocalStorage } from 'node:async_hooks';
import type { PrismaClient } from '@prisma/client';
import type { UnitOfWork } from '../../application/ports/UnitOfWork';
import { NoTenantContextError } from '../../domain/DomainError';
import type { Db } from './client';
import { getTenantContext } from './tenant-context';

const txStore = new AsyncLocalStorage<Db>();

/**
 * Cliente de base de datos de la transacción en curso. Los repositorios Prisma
 * lo usan en vez del cliente global, así toda consulta ocurre con
 * `app.tenant_id` fijado y RLS activo.
 */
export function currentDb(): Db {
  const db = txStore.getStore();
  if (!db) throw new NoTenantContextError();
  return db;
}

export function tryCurrentDb(): Db | undefined {
  return txStore.getStore();
}

/**
 * Transacción interactiva con `SET LOCAL app.tenant_id`. La transacción fija una
 * conexión del pool, así que el setting aplica a todo lo que se ejecute dentro,
 * incluido `$queryRaw`, y muere al hacer COMMIT/ROLLBACK: nunca se filtra a otra request.
 */
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly defaults: { maxWaitMs?: number; timeoutMs?: number } = {},
  ) {}

  async run<T>(fn: () => Promise<T>, opts?: { timeoutMs?: number }): Promise<T> {
    if (txStore.getStore()) return fn(); // anidada: reutiliza la transacción

    const { tenant } = getTenantContext();
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
        return txStore.run(tx, fn);
      },
      { maxWait: this.defaults.maxWaitMs ?? 5_000, timeout: opts?.timeoutMs ?? this.defaults.timeoutMs ?? 15_000 },
    );
  }
}

/**
 * Variante para operaciones de plataforma que ya conocen el tenant (onboarding, webhooks):
 * fija el contexto de base sin pasar por el middleware HTTP.
 */
export async function runAsTenant<T>(prisma: PrismaClient, tenantId: string, fn: (db: Db) => Promise<T>, timeoutMs = 30_000): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return txStore.run(tx, () => fn(tx));
    },
    { maxWait: 5_000, timeout: timeoutMs },
  );
}
