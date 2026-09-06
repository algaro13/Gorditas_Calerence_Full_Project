import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Envuelve handlers async para que los errores lleguen al errorHandler. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
