import type { Router } from 'express';
import type { IdentityProvider } from '../../shared/application/ports/IdentityProvider';
import type { Logger } from '../../shared/application/ports/Logger';
import type { UnitOfWork } from '../../shared/application/ports/UnitOfWork';
import type { EvaluarCupo } from './application/use-cases/EvaluarCupo';
import { ActualizarUsuario, EliminarUsuario, InvitarUsuario, ListarPersonal, ReenviarInvitacion } from './application/use-cases/Personal';
import { createUsuariosRouter } from './http/usuarios.router';
import { PrismaStaffRepository } from './infrastructure/PrismaStaffRepository';

export function createUsuariosModule(deps: {
  uow: UnitOfWork;
  identity: IdentityProvider;
  logger: Logger;
  evaluarCupo: EvaluarCupo;
}): { router: Router; listar: ListarPersonal } {
  const staff = new PrismaStaffRepository();
  const listar = new ListarPersonal(deps.uow, staff);
  const router = createUsuariosRouter({
    listar,
    invitar: new InvitarUsuario(deps.uow, staff, deps.identity, deps.logger),
    actualizar: new ActualizarUsuario(deps.uow, staff, deps.identity),
    eliminar: new EliminarUsuario(deps.uow, staff, deps.identity),
    reenviar: new ReenviarInvitacion(deps.uow, staff, deps.identity),
    evaluarCupo: deps.evaluarCupo,
  });
  return { router, listar };
}
