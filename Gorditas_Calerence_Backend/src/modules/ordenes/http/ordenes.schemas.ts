import Joi from 'joi';
import { ORDEN_ESTATUS } from '../domain/OrdenStatus';

// Se aceptan los campos que el frontend ya envía (nombres, costos) aunque el servidor los recalcule.

export const crearOrdenSchema = Joi.object({
  idTipoOrden: Joi.number().integer().required(),
  nombreTipoOrden: Joi.string().allow('').optional(),
  idMesa: Joi.number().integer().allow(null).optional(),
  nombreMesa: Joi.string().allow('', null).optional(),
  nombreCliente: Joi.string().max(100).allow('', null).optional(),
  total: Joi.number().min(0).optional(),
  estatus: Joi.string()
    .valid(...ORDEN_ESTATUS, '')
    .optional(),
  notas: Joi.string().max(500).allow('', null).optional(),
});

export const subordenSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(100).required(),
});

export const agregarPlatilloSchema = Joi.object({
  idPlatillo: Joi.number().integer().required(),
  nombrePlatillo: Joi.string().allow('').optional(),
  idGuiso: Joi.number().integer().required(),
  nombreGuiso: Joi.string().allow('').optional(),
  costoPlatillo: Joi.number().min(0).optional(),
  cantidad: Joi.number().integer().min(1).required(),
  notas: Joi.string().max(200).allow('', null).optional(),
});

export const agregarProductoSchema = Joi.object({
  idOrden: Joi.string().optional(),
  idProducto: Joi.number().integer().required(),
  nombreProducto: Joi.string().allow('').optional(),
  costoProducto: Joi.number().min(0).optional(),
  cantidad: Joi.number().integer().min(1).required(),
});

export const agregarExtraSchema = Joi.object({
  idOrden: Joi.string().optional(),
  idExtra: Joi.number().integer().required(),
  nombreExtra: Joi.string().allow('').optional(),
  costoExtra: Joi.number().min(0).optional(),
  cantidad: Joi.number().integer().min(1).default(1),
});

export const cambiarEstatusSchema = Joi.object({
  estatus: Joi.string().required(),
  role: Joi.any().optional(), // legado: se ignora, el rol viene del token
});

export const verificarSchema = Joi.object({
  isComplete: Joi.boolean().required(),
});

export const fechaHoraSchema = Joi.object({
  fechaHora: Joi.string().isoDate().allow('', null).optional(),
});

export const notaSchema = Joi.object({
  notas: Joi.string().max(200).allow('', null).optional(),
});

export const extraEstatusSchema = Joi.object({
  estatus: Joi.string().valid('entregado', 'pendiente', 'listo').required(),
});

export const listarQuerySchema = Joi.object({
  estatus: Joi.string()
    .valid(...ORDEN_ESTATUS)
    .optional(),
  estatusNo: Joi.string().optional(),
  mesa: Joi.number().integer().optional(),
  fecha: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(10),
});
