import type { Role } from '../../../../shared/domain/Auth';

export interface StaffMember {
  id: string;
  zitadelUserId: string;
  email: string;
  nombre: string;
  role: Role;
  grantId: string | null;
  activo: boolean;
  lastSeenAt: Date | null;
  /** Cuándo lo desactivó el sistema al vencer el plazo de cupo; null si fue a mano o está activo. */
  desactivadoPorCupo: Date | null;
  createdAt: Date;
}

/** Espejo local del personal (`tenant_users`). Zitadel es la fuente de verdad de identidad. */
export interface StaffRepository {
  list(): Promise<StaffMember[]>;
  findById(id: string): Promise<StaffMember | null>;
  findByEmail(email: string): Promise<StaffMember | null>;
  countActive(): Promise<number>;
  countActiveAdmins(): Promise<number>;
  create(data: { zitadelUserId: string; email: string; nombre: string; role: Role; grantId: string | null }): Promise<StaffMember>;
  update(
    id: string,
    data: Partial<{ nombre: string; role: Role; activo: boolean; grantId: string | null; desactivadoPorCupo: Date | null }>,
  ): Promise<StaffMember | null>;
  delete(id: string): Promise<boolean>;
}
