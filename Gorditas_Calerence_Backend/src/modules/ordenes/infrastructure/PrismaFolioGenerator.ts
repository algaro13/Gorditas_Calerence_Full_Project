import { generateFolio } from '../../../shared/infrastructure/prisma/counters';
import type { FolioGenerator } from '../application/ports/FolioGenerator';

export class PrismaFolioGenerator implements FolioGenerator {
  constructor(private readonly timeZone: string) {}
  next(now: Date): Promise<string> {
    return generateFolio(now, this.timeZone);
  }
}
