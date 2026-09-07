import type { RequestHandler } from 'express';
import type { IdentityProvider } from '../../application/ports/IdentityProvider';
import type { Clock } from '../../application/ports/Clock';
import { sendError } from './respond';

/**
 * Exige que la persona haya confirmado su correo antes de operar.
 *
 * El registro de un restaurante crea al dueño con su contraseña, así que el proveedor de identidad
 * lo deja activo aunque no haya abierto el correo de verificación. El token tampoco lleva ese dato,
 * de modo que hay que preguntárselo al proveedor. Para no pagar una llamada por petición se recuerda
 * el resultado: quien ya verificó no vuelve a consultarse en toda la vida del proceso, y quien no
 * lo ha hecho se reconsulta seguido para que entre en cuanto abra el enlace.
 */
export interface VerificadorDeCorreo {
  estaVerificado(userId: string): Promise<boolean>;
  /** Olvida lo memorizado de un usuario (tras reenviar el correo, por ejemplo). */
  olvidar(userId: string): void;
}

const TTL_NO_VERIFICADO_MS = 15_000;

export function createVerificadorDeCorreo(identity: IdentityProvider, clock: Clock): VerificadorDeCorreo {
  const verificados = new Set<string>();
  const pendientes = new Map<string, number>();

  return {
    async estaVerificado(userId: string): Promise<boolean> {
      if (verificados.has(userId)) return true;
      const revisadoHasta = pendientes.get(userId);
      if (revisadoHasta !== undefined && revisadoHasta > clock.now().getTime()) return false;

      const verificado = await identity.isEmailVerified(userId);
      if (verificado) {
        verificados.add(userId);
        pendientes.delete(userId);
      } else {
        pendientes.set(userId, clock.now().getTime() + TTL_NO_VERIFICADO_MS);
      }
      return verificado;
    },
    olvidar(userId: string): void {
      verificados.delete(userId);
      pendientes.delete(userId);
    },
  };
}

/** Corta la petición con 403 si el correo sigue sin confirmarse. Va después de `authenticate`. */
export function createEmailVerificadoGuard(verificador: VerificadorDeCorreo): RequestHandler {
  return (req, res, next) => {
    const userId = req.auth?.userId;
    if (!userId) {
      next();
      return;
    }
    verificador
      .estaVerificado(userId)
      .then((verificado) => {
        if (verificado) {
          next();
          return;
        }
        sendError(res, 403, 'Confirma tu correo electrónico para empezar a usar el sistema.', 'EMAIL_NO_VERIFICADO');
      })
      .catch(next);
  };
}
