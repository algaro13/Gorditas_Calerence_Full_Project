import type { RequestHandler } from 'express';
import type Joi from 'joi';
import { sendError } from './respond';

export interface ValidateOptions {
  /** Elimina las claves no declaradas en el esquema (útil para CRUD genérico). */
  stripUnknown?: boolean;
}

/** Valida `req.body` y lo reemplaza por el valor saneado (conversión de tipos, valores por defecto). */
export function validateBody(schema: Joi.ObjectSchema, opts: ValidateOptions = {}): RequestHandler {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: opts.stripUnknown ?? false, convert: true });
    if (error) {
      sendError(res, 400, 'Datos inválidos', 'VALIDATION', error.details.map((d) => d.message));
      return;
    }
    req.body = value;
    next();
  };
}

/** Valida `req.query`; los valores válidos quedan en `res.locals.query`. */
export function validateQuery(schema: Joi.ObjectSchema): RequestHandler {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query ?? {}, { abortEarly: false, stripUnknown: true, convert: true });
    if (error) {
      sendError(res, 400, 'Parámetros inválidos', 'VALIDATION', error.details.map((d) => d.message));
      return;
    }
    res.locals.query = value;
    next();
  };
}
