import mongoose from 'mongoose';

/**
 * Registers all POS models on a given connection.
 * Each tenant connection gets its own set of models isolated from other tenants.
 */
export function registerTenantModels(connection: mongoose.Connection) {
  // Only register if not already registered
  if (connection.models['Orden']) return connection;

  // Import schemas (not models — schemas are reusable across connections)
  const { Schema } = mongoose;

  // Counter
  const counterSchema = new Schema({ _id: String, sequence_value: { type: Number, default: 0 } });
  connection.model('Counter', counterSchema);

  // Guiso
  const guisoSchema = new Schema({ _id: Number, nombre: String, descripcion: String, activo: { type: Boolean, default: true } }, { versionKey: false });
  connection.model('Guiso', guisoSchema);

  // TipoProducto
  const tipoProductoSchema = new Schema({ _id: Number, nombre: String, descripcion: String, activo: { type: Boolean, default: true } }, { versionKey: false });
  connection.model('TipoProducto', tipoProductoSchema);

  // Producto
  const productoSchema = new Schema({
    _id: Number, idTipoProducto: Number, nombreTipoProducto: String,
    nombre: String, cantidad: { type: Number, default: 0 }, costo: { type: Number, default: 0 },
    activo: { type: Boolean, default: true }
  }, { versionKey: false });
  productoSchema.index({ nombre: 1 });
  productoSchema.index({ idTipoProducto: 1 });
  connection.model('Producto', productoSchema);

  // TipoPlatillo
  const tipoPlatilloSchema = new Schema({ _id: Number, nombre: String, descripcion: String, activo: { type: Boolean, default: true } }, { versionKey: false });
  connection.model('TipoPlatillo', tipoPlatilloSchema);

  // Platillo
  const platilloSchema = new Schema({
    _id: Number, idTipoPlatillo: Number, nombreTipoPlatillo: String,
    nombre: String, descripcion: String, costo: { type: Number, default: 0 },
    precio: Number, notas: String, activo: { type: Boolean, default: true }
  }, { versionKey: false });
  connection.model('Platillo', platilloSchema);

  // TipoExtra
  const tipoExtraSchema = new Schema({ _id: Number, nombre: String, descripcion: String, activo: { type: Boolean, default: true } }, { versionKey: false });
  connection.model('TipoExtra', tipoExtraSchema);

  // Extra
  const extraSchema = new Schema({
    _id: Number, nombre: String, descripcion: String, costo: { type: Number, default: 0 },
    idTipoExtra: Number, activo: { type: Boolean, default: true }
  }, { versionKey: false });
  connection.model('Extra', extraSchema);

  // TipoUsuario
  const tipoUsuarioSchema = new Schema({ _id: Number, nombre: String, descripcion: String }, { versionKey: false });
  connection.model('TipoUsuario', tipoUsuarioSchema);

  // Usuario
  const usuarioSchema = new Schema({
    nombre: String, email: { type: String, unique: true, sparse: true },
    password: String, idTipoUsuario: Number, nombreTipoUsuario: String,
    activo: { type: Boolean, default: true }
  }, { timestamps: true, versionKey: false });
  connection.model('Usuario', usuarioSchema);

  // TipoOrden
  const tipoOrdenSchema = new Schema({ _id: Number, nombre: String, activo: { type: Boolean, default: true } }, { versionKey: false });
  connection.model('TipoOrden', tipoOrdenSchema);

  // Mesa
  const mesaSchema = new Schema({ _id: Number, nombre: String }, { versionKey: false });
  connection.model('Mesa', mesaSchema);

  // TipoGasto
  const tipoGastoSchema = new Schema({ _id: Number, nombre: String, activo: { type: Boolean, default: true } }, { versionKey: false });
  connection.model('TipoGasto', tipoGastoSchema);

  // Gasto
  const gastoSchema = new Schema({
    nombre: String, idTipoGasto: Number, nombreTipoGasto: String,
    gastoTotal: { type: Number, default: 0 }, descripcion: String,
    fecha: { type: Date, default: Date.now }
  }, { timestamps: true, versionKey: false });
  gastoSchema.index({ fecha: -1 });
  gastoSchema.index({ idTipoGasto: 1 });
  connection.model('Gasto', gastoSchema);

  // Orden
  const ordenSchema = new Schema({
    folio: { type: String, unique: true },
    idTipoOrden: Number, nombreTipoOrden: String,
    estatus: { type: String, default: 'Recepcion' },
    idMesa: Number, nombreMesa: String, nombreCliente: String,
    fechaHora: { type: Date, default: Date.now },
    fechaPago: Date,
    total: { type: Number, default: 0 },
    notas: String
  }, { timestamps: true, versionKey: false });
  ordenSchema.index({ folio: 1 });
  ordenSchema.index({ estatus: 1 });
  ordenSchema.index({ fechaHora: -1 });
  ordenSchema.index({ idMesa: 1 });
  connection.model('Orden', ordenSchema);

  // Suborden
  const subordenSchema = new Schema({
    idOrden: String, nombre: String
  }, { timestamps: true, versionKey: false });
  subordenSchema.index({ idOrden: 1 });
  connection.model('Suborden', subordenSchema);

  // OrdenDetalleProducto
  const ordenDetalleProductoSchema = new Schema({
    idOrden: String, idProducto: Number, nombreProducto: String,
    costoProducto: Number, cantidad: Number, importe: Number,
    listo: { type: Boolean, default: false }, entregado: { type: Boolean, default: false }
  }, { timestamps: true, versionKey: false });
  ordenDetalleProductoSchema.index({ idOrden: 1 });
  connection.model('OrdenDetalleProducto', ordenDetalleProductoSchema);

  // OrdenDetallePlatillo
  const ordenDetallePlatilloSchema = new Schema({
    idSuborden: String, idPlatillo: Number, nombrePlatillo: String,
    idGuiso: Number, nombreGuiso: String,
    costoPlatillo: Number, cantidad: Number, importe: Number,
    notas: String, listo: { type: Boolean, default: false }, entregado: { type: Boolean, default: false }
  }, { timestamps: true, versionKey: false });
  ordenDetallePlatilloSchema.index({ idSuborden: 1 });
  connection.model('OrdenDetallePlatillo', ordenDetallePlatilloSchema);

  // OrdenDetalleExtra
  const ordenDetalleExtraSchema = new Schema({
    idOrdenDetallePlatillo: String, idExtra: Number, nombreExtra: String,
    costoExtra: Number, cantidad: Number, importe: Number,
    listo: { type: Boolean, default: false }, entregado: { type: Boolean, default: false }
  }, { timestamps: true, versionKey: false });
  ordenDetalleExtraSchema.index({ idOrdenDetallePlatillo: 1 });
  connection.model('OrdenDetalleExtra', ordenDetalleExtraSchema);

  return connection;
}
