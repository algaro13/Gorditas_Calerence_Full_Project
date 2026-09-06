import type { IdentityProvider } from '../../../../shared/application/ports/IdentityProvider';
import type { Logger } from '../../../../shared/application/ports/Logger';
import type { UnitOfWork } from '../../../../shared/application/ports/UnitOfWork';
import type { AuthInfo, Role } from '../../../../shared/domain/Auth';
import { ConflictError, ForbiddenError, NotFoundError, PaymentRequiredError, ValidationError } from '../../../../shared/domain/DomainError';
import type { TenantInfo } from '../../../../shared/domain/Tenant';
import type { StaffMember, StaffRepository } from '../ports/StaffRepository';

const ROLES_OPERATIVOS: Role[] = ['Mesero', 'Despachador', 'Cocinero'];

/** Qué roles puede administrar cada actor. */
export function rolesAdministrables(actor: AuthInfo): Role[] {
  if (actor.roles.includes('Admin')) return ['Admin', 'Encargado', ...ROLES_OPERATIVOS];
  if (actor.roles.includes('Encargado')) return ROLES_OPERATIVOS;
  return [];
}

function exigirPermiso(actor: AuthInfo, role: Role, accion: string): void {
  if (!rolesAdministrables(actor).includes(role)) {
    throw new ForbiddenError(`No tienes permisos para ${accion} usuarios con rol ${role}`, 'ROL_NO_ADMINISTRABLE');
  }
}

export class ListarPersonal {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly staff: StaffRepository,
  ) {}
  execute(): Promise<StaffMember[]> {
    return this.uow.run(() => this.staff.list());
  }
}

export interface InvitarUsuarioInput {
  nombre: string;
  apellido: string;
  email: string;
  role: Role;
}

export class InvitarUsuario {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly staff: StaffRepository,
    private readonly identity: IdentityProvider,
    private readonly logger: Logger,
  ) {}

  async execute(tenant: TenantInfo, actor: AuthInfo, input: InvitarUsuarioInput): Promise<StaffMember> {
    exigirPermiso(actor, input.role, 'crear');
    if (!tenant.zitadelOrgId || !tenant.zitadelProjectGrantId) {
      throw new ValidationError('El restaurante no está vinculado al proveedor de identidad', 'TENANT_SIN_ORG');
    }
    const email = input.email.trim().toLowerCase();

    await this.uow.run(async () => {
      if (await this.staff.findByEmail(email)) throw new ConflictError('Ya existe un usuario con ese correo', 'EMAIL_DUPLICADO');
      const activos = await this.staff.countActive();
      if (activos >= tenant.maxUsuarios) {
        throw new PaymentRequiredError(
          `Tu plan permite ${tenant.maxUsuarios} usuarios activos. Actualiza tu plan para agregar más.`,
          'USER_LIMIT_REACHED',
          { maxUsuarios: tenant.maxUsuarios },
        );
      }
    });

    // Fuera de la transacción: llamadas externas al proveedor de identidad
    const { userId } = await this.identity.createUser({ orgId: tenant.zitadelOrgId, givenName: input.nombre.trim(), familyName: input.apellido.trim(), email });
    let grantId: string | null = null;
    try {
      grantId = (await this.identity.assignRole({ orgId: tenant.zitadelOrgId, userId, projectGrantId: tenant.zitadelProjectGrantId, role: input.role })).grantId;
      await this.identity.sendSetPasswordLink(userId);
    } catch (err) {
      this.logger.warn('Usuario creado en el proveedor pero falló rol o invitación', { userId, err: String(err) });
    }

    return this.uow.run(() =>
      this.staff.create({ zitadelUserId: userId, email, nombre: `${input.nombre.trim()} ${input.apellido.trim()}`.trim(), role: input.role, grantId }),
    );
  }
}

export interface ActualizarUsuarioInput {
  nombre?: string;
  role?: Role;
  activo?: boolean;
}

export class ActualizarUsuario {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly staff: StaffRepository,
    private readonly identity: IdentityProvider,
  ) {}

  async execute(tenant: TenantInfo, actor: AuthInfo, id: string, input: ActualizarUsuarioInput): Promise<StaffMember> {
    const member = await this.uow.run(() => this.staff.findById(id));
    if (!member) throw new NotFoundError('Usuario no encontrado', 'USUARIO_NOT_FOUND');
    exigirPermiso(actor, member.role, 'modificar');
    if (input.role) exigirPermiso(actor, input.role, 'asignar');

    const desactivaAdmin = member.role === 'Admin' && member.activo && (input.activo === false || (input.role && input.role !== 'Admin'));
    if (desactivaAdmin) {
      const admins = await this.uow.run(() => this.staff.countActiveAdmins());
      if (admins <= 1) throw new ValidationError('No puedes quitar al último administrador activo', 'ULTIMO_ADMIN');
    }
    if (input.activo === false && member.zitadelUserId === actor.userId) {
      throw new ValidationError('No puedes desactivarte a ti mismo', 'AUTO_DESACTIVACION');
    }

    let grantId = member.grantId;
    if (input.role && input.role !== member.role && tenant.zitadelOrgId && tenant.zitadelProjectGrantId) {
      if (grantId) {
        await this.identity.updateRole({ orgId: tenant.zitadelOrgId, userId: member.zitadelUserId, grantId, role: input.role });
      } else {
        grantId = (await this.identity.assignRole({ orgId: tenant.zitadelOrgId, userId: member.zitadelUserId, projectGrantId: tenant.zitadelProjectGrantId, role: input.role })).grantId;
      }
    }
    if (input.activo !== undefined && input.activo !== member.activo) {
      if (input.activo) {
        const activos = await this.uow.run(() => this.staff.countActive());
        if (activos >= tenant.maxUsuarios) {
          throw new PaymentRequiredError(`Tu plan permite ${tenant.maxUsuarios} usuarios activos.`, 'USER_LIMIT_REACHED', { maxUsuarios: tenant.maxUsuarios });
        }
      }
      await this.identity.setUserActive(member.zitadelUserId, input.activo);
    }

    const updated = await this.uow.run(() =>
      this.staff.update(id, {
        ...(input.nombre !== undefined ? { nombre: input.nombre.trim() } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.activo !== undefined ? { activo: input.activo } : {}),
        grantId,
      }),
    );
    if (!updated) throw new NotFoundError('Usuario no encontrado', 'USUARIO_NOT_FOUND');
    return updated;
  }
}

export class EliminarUsuario {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly staff: StaffRepository,
    private readonly identity: IdentityProvider,
  ) {}

  async execute(actor: AuthInfo, id: string): Promise<void> {
    const member = await this.uow.run(() => this.staff.findById(id));
    if (!member) throw new NotFoundError('Usuario no encontrado', 'USUARIO_NOT_FOUND');
    exigirPermiso(actor, member.role, 'eliminar');
    if (member.zitadelUserId === actor.userId) throw new ValidationError('No puedes eliminarte a ti mismo', 'AUTO_ELIMINACION');
    if (member.role === 'Admin' && member.activo) {
      const admins = await this.uow.run(() => this.staff.countActiveAdmins());
      if (admins <= 1) throw new ValidationError('No puedes eliminar al último administrador activo', 'ULTIMO_ADMIN');
    }
    await this.identity.deleteUser(member.zitadelUserId);
    await this.uow.run(() => this.staff.delete(id));
  }
}

export class ReenviarInvitacion {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly staff: StaffRepository,
    private readonly identity: IdentityProvider,
  ) {}

  async execute(actor: AuthInfo, id: string): Promise<void> {
    const member = await this.uow.run(() => this.staff.findById(id));
    if (!member) throw new NotFoundError('Usuario no encontrado', 'USUARIO_NOT_FOUND');
    exigirPermiso(actor, member.role, 'invitar');
    await this.identity.sendSetPasswordLink(member.zitadelUserId);
  }
}
