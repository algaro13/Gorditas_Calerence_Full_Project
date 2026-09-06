import { Prisma, type TenantUser as Row } from '@prisma/client';
import type { Role } from '../../../shared/domain/Auth';
import { currentDb } from '../../../shared/infrastructure/prisma/unit-of-work';
import type { StaffMember, StaffRepository } from '../application/ports/StaffRepository';

const toMember = (r: Row): StaffMember => ({
  id: r.id,
  zitadelUserId: r.zitadelUserId,
  email: r.email,
  nombre: r.nombre,
  role: r.role,
  grantId: r.grantId,
  activo: r.activo,
  lastSeenAt: r.lastSeenAt,
  createdAt: r.createdAt,
});

export class PrismaStaffRepository implements StaffRepository {
  async list(): Promise<StaffMember[]> {
    const rows = await currentDb().tenantUser.findMany({ orderBy: [{ activo: 'desc' }, { nombre: 'asc' }] });
    return rows.map(toMember);
  }

  async findById(id: string): Promise<StaffMember | null> {
    const row = await currentDb().tenantUser.findUnique({ where: { id } });
    return row ? toMember(row) : null;
  }

  async findByEmail(email: string): Promise<StaffMember | null> {
    const row = await currentDb().tenantUser.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    return row ? toMember(row) : null;
  }

  countActive(): Promise<number> {
    return currentDb().tenantUser.count({ where: { activo: true } });
  }

  countActiveAdmins(): Promise<number> {
    return currentDb().tenantUser.count({ where: { activo: true, role: 'Admin' } });
  }

  async create(data: { zitadelUserId: string; email: string; nombre: string; role: Role; grantId: string | null }): Promise<StaffMember> {
    return toMember(await currentDb().tenantUser.create({ data }));
  }

  async update(id: string, data: Partial<{ nombre: string; role: Role; activo: boolean; grantId: string | null }>): Promise<StaffMember | null> {
    try {
      return toMember(await currentDb().tenantUser.update({ where: { id }, data }));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return null;
      throw err;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await currentDb().tenantUser.delete({ where: { id } });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return false;
      throw err;
    }
  }
}
