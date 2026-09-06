import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import type { Logger } from '../../application/ports/Logger';
import { DomainError, NoTenantContextError } from '../../domain/DomainError';
import { sendError } from './respond';

export const notFound: RequestHandler = (req, res) => {
  sendError(res, 404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND');
};

interface JoiLikeError extends Error {
  isJoi?: boolean;
  details?: Array<{ message: string; path?: unknown[] }>;
}

export function createErrorHandler(deps: { logger: Logger; exposeStack: boolean }): ErrorRequestHandler {
  return (err: unknown, req, res, _next) => {
    if (res.headersSent) return;

    if (err instanceof DomainError) {
      sendError(res, err.status, err.message, err.code, err.details);
      return;
    }

    if (err instanceof NoTenantContextError) {
      deps.logger.error('Operación sin contexto de tenant (bug de programación)', { path: req.originalUrl, method: req.method });
      sendError(res, 500, 'Error interno del servidor', 'NO_TENANT_CONTEXT');
      return;
    }

    const joi = err as JoiLikeError;
    if (joi?.isJoi) {
      sendError(res, 400, 'Datos inválidos', 'VALIDATION', joi.details?.map((d) => d.message));
      return;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      switch (err.code) {
        case 'P2002':
          sendError(res, 409, 'Ya existe un registro con esos datos', 'DUPLICATE', err.meta);
          return;
        case 'P2003':
          sendError(res, 409, 'La operación viola una referencia entre registros', 'FOREIGN_KEY', err.meta);
          return;
        case 'P2025':
          sendError(res, 404, 'Registro no encontrado', 'NOT_FOUND');
          return;
        default:
          break;
      }
    }

    if (err instanceof SyntaxError && 'body' in (err as object)) {
      sendError(res, 400, 'JSON inválido', 'BAD_JSON');
      return;
    }

    const e = err as Error & { status?: number; statusCode?: number; code?: string };
    if (e?.code === 'LIMIT_FILE_SIZE') {
      sendError(res, 400, 'El archivo excede el tamaño permitido', 'FILE_TOO_LARGE');
      return;
    }
    const status = typeof e?.status === 'number' ? e.status : typeof e?.statusCode === 'number' ? e.statusCode : 500;

    deps.logger.error('Error no controlado', {
      path: req.originalUrl,
      method: req.method,
      err: e?.message ?? String(err),
      ...(deps.exposeStack ? { stack: e?.stack } : {}),
    });
    sendError(res, status, status >= 500 ? 'Error interno del servidor' : e.message, status >= 500 ? 'INTERNAL' : 'ERROR');
  };
}
