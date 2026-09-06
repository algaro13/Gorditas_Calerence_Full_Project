import { Router } from 'express';
import Joi from 'joi';
import { ROLES } from '../../../shared/domain/Auth';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { isEncargado } from '../../../shared/http/express/authenticate';
import { sendCreated, sendOk } from '../../../shared/http/express/respond';
import { toApi } from '../../../shared/utils/serialize';
import { validateBody } from '../../../shared/http/express/validate';
import type { ActualizarUsuario, EliminarUsuario, InvitarUsuario, ListarPersonal, ReenviarInvitacion } from '../application/use-cases/Personal';
import type { StaffMember } from '../application/ports/StaffRepository';

export interface UsuariosUseCases {
  listar: ListarPersonal;
  invitar: InvitarUsuario;
  actualizar: ActualizarUsuario;
  eliminar: EliminarUsuario;
  reenviar: ReenviarInvitacion;
}

const invitarSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(60).required(),
  apellido: Joi.string().trim().min(1).max(60).required(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  role: Joi.string()
    .valid(...ROLES)
    .required(),
});

const actualizarSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(120).optional(),
  role: Joi.string()
    .valid(...ROLES)
    .optional(),
  activo: Joi.boolean().optional(),
}).min(1);

/** Forma compatible con el catálogo anterior más los campos nuevos. */
export function toUsuarioApi(m: StaffMember) {
  return toApi({ ...m, nombreTipoUsuario: m.role, zitadelUserId: undefined, grantId: undefined });
}

export function createUsuariosRouter(uc: UsuariosUseCases): Router {
  const router = Router();
  router.use(isEncargado);

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const items = await uc.listar.execute();
      sendOk(res, items.map(toUsuarioApi));
    }),
  );

  router.post(
    '/',
    validateBody(invitarSchema, { stripUnknown: true }),
    asyncHandler(async (req, res) => {
      const member = await uc.invitar.execute(req.tenant!, req.auth!, req.body);
      sendCreated(res, toUsuarioApi(member), 'Usuario invitado. Recibirá un correo para establecer su contraseña.');
    }),
  );

  router.put(
    '/:id',
    validateBody(actualizarSchema, { stripUnknown: true }),
    asyncHandler(async (req, res) => {
      const member = await uc.actualizar.execute(req.tenant!, req.auth!, req.params.id, req.body);
      sendOk(res, toUsuarioApi(member), 'Usuario actualizado');
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await uc.eliminar.execute(req.auth!, req.params.id);
      sendOk(res, null, 'Usuario eliminado');
    }),
  );

  router.post(
    '/:id/resend-invite',
    asyncHandler(async (req, res) => {
      await uc.reenviar.execute(req.auth!, req.params.id);
      sendOk(res, null, 'Invitación reenviada');
    }),
  );

  return router;
}
