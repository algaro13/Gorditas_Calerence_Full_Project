import { Prisma, PrismaClient } from '@prisma/client';

export type Db = Prisma.TransactionClient;

export function createPrismaClient(opts: { url: string; logQueries?: boolean }): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: opts.url } },
    log: opts.logQueries ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
}
