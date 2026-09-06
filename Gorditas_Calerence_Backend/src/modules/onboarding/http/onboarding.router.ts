import { Router } from 'express';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';
import type { FileStorage } from '../../../shared/application/ports/FileStorage';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { sendCreated, sendError, sendOk } from '../../../shared/http/express/respond';
import { singleImageUpload } from '../../../shared/http/express/upload';
import { validateBody } from '../../../shared/http/express/validate';
import type { RegistrarRestaurante } from '../application/use-cases/RegistrarRestaurante';
import { PALETAS } from '../../../shared/domain/Tenant';

const passwordRule = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[A-Za-z]/, 'letra')
  .pattern(/\d/, 'número')
  .required()
  .messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'string.pattern.name': 'La contraseña debe incluir al menos una {#name}',
  });

export const completeSchema = Joi.object({
  admin: Joi.object({
    nombre: Joi.string().trim().min(1).max(60).required(),
    apellido: Joi.string().trim().min(1).max(60).required(),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required(),
    password: passwordRule,
  }).required(),
  nombre: Joi.string().trim().min(2).max(120).required(),
  slug: Joi.string().trim().lowercase().min(3).max(50).required(),
  paleta: Joi.string()
    .valid(...PALETAS)
    .default('orange'),
  imagen: Joi.string().max(300).allow('', null).optional(),
  mesas: Joi.array().items(Joi.object({ nombre: Joi.string().trim().max(60).allow('').default('') })).max(100).default([]),
  platillos: Joi.array()
    .items(Joi.object({ nombre: Joi.string().trim().min(1).max(120).required(), precio: Joi.number().min(0).required() }))
    .max(200)
    .default([]),
  guisos: Joi.array().items(Joi.object({ nombre: Joi.string().trim().min(1).max(120).required() })).max(200).default([]),
});

export interface OnboardingRouterDeps {
  registrar: RegistrarRestaurante;
  storage: FileStorage;
  rateLimitEnabled: boolean;
}

export function createOnboardingRouter(deps: OnboardingRouterDeps): Router {
  const router = Router();

  const limiter = (max: number) =>
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      skip: () => !deps.rateLimitEnabled,
      handler: (_req, res) => sendError(res, 429, 'Demasiados intentos. Intenta más tarde.', 'RATE_LIMITED'),
    });

  router.post(
    '/upload-image',
    limiter(30),
    singleImageUpload('image'),
    asyncHandler(async (req, res) => {
      if (!req.file) {
        sendError(res, 400, 'No se recibió imagen', 'NO_IMAGE');
        return;
      }
      const stored = await deps.storage.saveTemporaryLogo({ buffer: req.file.buffer, mimeType: req.file.mimetype, size: req.file.size });
      sendOk(res, { url: stored.url, filename: stored.url.split('/').pop() });
    }),
  );

  router.post(
    '/complete',
    limiter(10),
    validateBody(completeSchema, { stripUnknown: true }),
    asyncHandler(async (req, res) => {
      const r = await deps.registrar.execute(req.body);
      sendCreated(
        res,
        {
          tenant: { id: r.tenant.id, slug: r.tenant.slug, nombre: r.tenant.nombre, url: r.url, config: r.tenant.config, trialEndsAt: r.tenant.trialEndsAt },
          user: r.user,
          url: r.url,
        },
        'Negocio registrado exitosamente',
      );
    }),
  );

  return router;
}
