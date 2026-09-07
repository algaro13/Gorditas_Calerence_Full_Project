import path from 'node:path';
import dotenv from 'dotenv';
import Joi from 'joi';

/**
 * Carga y valida la configuración al arrancar. Falla rápido si falta algo.
 * Orden: variables ya presentes en process.env > .env.<NODE_ENV> > .env
 */
const nodeEnv = process.env.NODE_ENV ?? 'development';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(5000),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent').default('info'),
  APP_TZ: Joi.string().default('America/Mexico_City'),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  DIRECT_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).optional(),

  APP_DOMAIN: Joi.string().hostname().required(),
  APP_SCHEME: Joi.string().valid('http', 'https').default('https'),
  APP_PLATFORM_HOST: Joi.string().lowercase().pattern(/^[a-z0-9][a-z0-9-]{0,30}$/).default('app'),
  FRONTEND_BASE_URL: Joi.string().uri().required(),

  ZITADEL_ISSUER: Joi.string().uri().required(),
  ZITADEL_JWKS_URL: Joi.string().uri().required(),
  ZITADEL_JWKS_MODE: Joi.string().valid('remote', 'local').default('remote'),
  ZITADEL_AUDIENCE: Joi.string().required(),
  ZITADEL_PROJECT_ID: Joi.string().required(),
  ZITADEL_API_URL: Joi.string().uri().required(),
  ZITADEL_DEFAULT_ORG_ID: Joi.string().required(),
  ZITADEL_SPA_APP_ID: Joi.string().required(),
  ZITADEL_PAT: Joi.string().when('IDENTITY_PROVIDER', { is: 'zitadel', then: Joi.required(), otherwise: Joi.optional() }),
  IDENTITY_PROVIDER: Joi.string().valid('zitadel', 'fake').default('zitadel'),

  PAYMENT_PROVIDER: Joi.string().valid('stripe', 'fake').default('stripe'),
  STRIPE_SECRET_KEY: Joi.string().when('PAYMENT_PROVIDER', { is: 'stripe', then: Joi.required(), otherwise: Joi.optional() }),
  STRIPE_WEBHOOK_SECRET: Joi.string().when('PAYMENT_PROVIDER', { is: 'stripe', then: Joi.required(), otherwise: Joi.optional() }),
  STRIPE_PRICE_BASICO: Joi.string().optional(),
  STRIPE_PRICE_PROFESIONAL: Joi.string().optional(),
  STRIPE_PRICE_EMPRESARIAL: Joi.string().optional(),

  UPLOADS_DIR: Joi.string().default('uploads'),
}).unknown(true);

export interface Env {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  LOG_LEVEL: string;
  APP_TZ: string;
  DATABASE_URL: string;
  DIRECT_URL?: string;
  APP_DOMAIN: string;
  APP_SCHEME: 'http' | 'https';
  APP_PLATFORM_HOST: string;
  FRONTEND_BASE_URL: string;
  ZITADEL_ISSUER: string;
  ZITADEL_JWKS_URL: string;
  ZITADEL_JWKS_MODE: 'remote' | 'local';
  ZITADEL_AUDIENCE: string;
  ZITADEL_PROJECT_ID: string;
  ZITADEL_API_URL: string;
  ZITADEL_DEFAULT_ORG_ID: string;
  ZITADEL_SPA_APP_ID: string;
  ZITADEL_PAT?: string;
  IDENTITY_PROVIDER: 'zitadel' | 'fake';
  PAYMENT_PROVIDER: 'stripe' | 'fake';
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_BASICO?: string;
  STRIPE_PRICE_PROFESIONAL?: string;
  STRIPE_PRICE_EMPRESARIAL?: string;
  UPLOADS_DIR: string;
}

const { value, error } = schema.validate(process.env, { abortEarly: false, stripUnknown: false });
if (error) {
  const detail = error.details.map((d) => `  - ${d.message}`).join('\n');
  throw new Error(`Configuración inválida (.env.${nodeEnv}):\n${detail}`);
}

export const env: Env = value as Env;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
