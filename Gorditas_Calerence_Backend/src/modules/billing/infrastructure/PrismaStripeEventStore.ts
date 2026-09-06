import type { PrismaClient } from '@prisma/client';
import type { StripeEventStore } from '../application/ports/StripeEventStore';

export class PrismaStripeEventStore implements StripeEventStore {
  constructor(private readonly prisma: PrismaClient) {}

  async claim(eventId: string, type: string): Promise<boolean> {
    const r = await this.prisma.stripeEvent.createMany({ data: [{ id: eventId, type }], skipDuplicates: true });
    return r.count === 1;
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.prisma.stripeEvent.update({ where: { id: eventId }, data: { processedAt: new Date(), error: null } });
  }

  async markError(eventId: string, error: string): Promise<void> {
    await this.prisma.stripeEvent.update({ where: { id: eventId }, data: { error: error.slice(0, 1000) } });
  }
}
