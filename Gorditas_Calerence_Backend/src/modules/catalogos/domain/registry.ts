import Joi from 'joi';

/** Nombres de delegate de Prisma que administra el CRUD genérico. */
export type CatalogoModelo = 'guiso' | 'tipoProducto' | 'producto' | 'tipoPlatillo' | 'platillo' | 'tipoExtra' | 'extra' | 'tipoOrden' | 'mesa' | 'tipoGasto' | 'gasto';

export interface CatalogoDef {
  modelo: CatalogoModelo;
  /** Campos de texto que participan en `search`. */
  searchable: string[];
  /** Relación a incluir y su aplanado ("tipoProducto.nombre" -> "nombreTipoProducto"). */
  include?: Record<string, { select: { nombre: true } }>;
  flatten?: Record<string, string>;
  createSchema: Joi.ObjectSchema;
  /** Campo por el que se ordena la lista. */
  orderBy: string;
}

const base = {
  nombre: Joi.string().trim().min(1).max(120).required(),
  descripcion: Joi.string().max(500).allow('', null).optional(),
  activo: Joi.boolean().optional(),
};

const DEFS: Record<string, CatalogoDef> = {
  guiso: { modelo: 'guiso', searchable: ['nombre', 'descripcion'], createSchema: Joi.object(base), orderBy: 'nombre' },
  tipoproducto: { modelo: 'tipoProducto', searchable: ['nombre', 'descripcion'], createSchema: Joi.object(base), orderBy: 'nombre' },
  producto: {
    modelo: 'producto',
    searchable: ['nombre'],
    include: { tipoProducto: { select: { nombre: true } } },
    flatten: { 'tipoProducto.nombre': 'nombreTipoProducto' },
    createSchema: Joi.object({
      idTipoProducto: Joi.number().integer().required(),
      nombre: base.nombre,
      cantidad: Joi.number().integer().min(0).default(0),
      costo: Joi.number().min(0).default(0),
      variantes: Joi.array().items(Joi.string().trim().min(1).max(60)).default([]),
      activo: Joi.boolean().optional(),
    }),
    orderBy: 'nombre',
  },
  tipoplatillo: { modelo: 'tipoPlatillo', searchable: ['nombre', 'descripcion'], createSchema: Joi.object(base), orderBy: 'nombre' },
  platillo: {
    modelo: 'platillo',
    searchable: ['nombre', 'descripcion'],
    include: { tipoPlatillo: { select: { nombre: true } } },
    flatten: { 'tipoPlatillo.nombre': 'nombreTipoPlatillo' },
    createSchema: Joi.object({
      idTipoPlatillo: Joi.number().integer().required(),
      nombre: base.nombre,
      descripcion: base.descripcion,
      costo: Joi.number().min(0).default(0),
      precio: Joi.number().min(0).default(0),
      notas: Joi.string().max(500).allow('', null).optional(),
      activo: Joi.boolean().optional(),
    }),
    orderBy: 'nombre',
  },
  tipoextra: { modelo: 'tipoExtra', searchable: ['nombre', 'descripcion'], createSchema: Joi.object(base), orderBy: 'nombre' },
  extra: {
    modelo: 'extra',
    searchable: ['nombre', 'descripcion'],
    include: { tipoExtra: { select: { nombre: true } } },
    flatten: { 'tipoExtra.nombre': 'nombreTipoExtra' },
    createSchema: Joi.object({
      idTipoExtra: Joi.number().integer().required(),
      nombre: base.nombre,
      descripcion: base.descripcion,
      costo: Joi.number().min(0).default(0),
      activo: Joi.boolean().optional(),
    }),
    orderBy: 'nombre',
  },
  tipoorden: { modelo: 'tipoOrden', searchable: ['nombre'], createSchema: Joi.object({ nombre: base.nombre, activo: base.activo }), orderBy: 'nombre' },
  mesa: { modelo: 'mesa', searchable: ['nombre'], createSchema: Joi.object({ nombre: base.nombre, activo: base.activo }), orderBy: 'nombre' },
  tipogasto: { modelo: 'tipoGasto', searchable: ['nombre'], createSchema: Joi.object({ nombre: base.nombre, activo: base.activo }), orderBy: 'nombre' },
  gasto: {
    modelo: 'gasto',
    searchable: ['nombre', 'descripcion'],
    include: { tipoGasto: { select: { nombre: true } } },
    flatten: { 'tipoGasto.nombre': 'nombreTipoGasto' },
    createSchema: Joi.object({
      idTipoGasto: Joi.number().integer().required(),
      nombre: base.nombre,
      gastoTotal: Joi.number().min(0).default(0),
      descripcion: base.descripcion,
      fecha: Joi.date().iso().optional(),
    }),
    orderBy: 'fecha',
  },
};

const ALIASES: Record<string, string> = {
  'tipo-producto': 'tipoproducto',
  'tipo-platillo': 'tipoplatillo',
  'tipo-extra': 'tipoextra',
  'tipo-orden': 'tipoorden',
  'tipo-gasto': 'tipogasto',
};

export function resolveCatalogo(nombre: string): CatalogoDef | null {
  const key = nombre.toLowerCase();
  return DEFS[ALIASES[key] ?? key] ?? null;
}

/** Esquema de actualización: los mismos campos, todos opcionales. */
export function updateSchemaOf(def: CatalogoDef): Joi.ObjectSchema {
  return def.createSchema.fork(Object.keys(def.createSchema.describe().keys ?? {}), (s) => s.optional());
}

export const CATALOGOS_DISPONIBLES = Object.keys(DEFS);
