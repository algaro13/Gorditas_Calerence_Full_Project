/**
 * Migración baseline: documenta el estado actual del schema.
 * Crea los índices definidos en los modelos Mongoose como punto de referencia.
 * 
 * Colecciones: ordenes, subordenes, ordendetalleproductos, ordendetalleplatillos,
 *              ordendetalleextras, productos, usuarios, gastos, counters
 */

module.exports = {
  async up(db) {
    // Índices de Orden
    await db.collection('ordens').createIndex({ folio: 1 }, { unique: true, background: true });
    await db.collection('ordens').createIndex({ estatus: 1 }, { background: true });
    await db.collection('ordens').createIndex({ fechaHora: -1 }, { background: true });
    await db.collection('ordens').createIndex({ idMesa: 1 }, { background: true });

    // Índices de Usuario (email único)
    await db.collection('usuarios').createIndex({ email: 1 }, { unique: true, sparse: true, background: true });

    // Índices de Producto
    await db.collection('productos').createIndex({ nombre: 1 }, { background: true });
    await db.collection('productos').createIndex({ idTipoProducto: 1 }, { background: true });

    // Índices de Suborden
    await db.collection('subordens').createIndex({ idOrden: 1 }, { background: true });

    // Índices de OrdenDetalleProducto
    await db.collection('ordendetalleproductos').createIndex({ idOrden: 1 }, { background: true });

    // Índices de OrdenDetallePlatillo
    await db.collection('ordendetalleplatillos').createIndex({ idSuborden: 1 }, { background: true });

    // Índices de OrdenDetalleExtra
    await db.collection('ordendetalleextras').createIndex({ idOrdenDetallePlatillo: 1 }, { background: true });

    // Índices de Gasto
    await db.collection('gastos').createIndex({ fecha: -1 }, { background: true });
    await db.collection('gastos').createIndex({ idTipoGasto: 1 }, { background: true });

    console.log('✅ Baseline migration applied: all indexes created');
  },

  async down(db) {
    // Revertir: eliminar los índices creados (no los _id que son automáticos)
    await db.collection('ordens').dropIndex('folio_1').catch(() => {});
    await db.collection('ordens').dropIndex('estatus_1').catch(() => {});
    await db.collection('ordens').dropIndex('fechaHora_-1').catch(() => {});
    await db.collection('ordens').dropIndex('idMesa_1').catch(() => {});

    await db.collection('usuarios').dropIndex('email_1').catch(() => {});

    await db.collection('productos').dropIndex('nombre_1').catch(() => {});
    await db.collection('productos').dropIndex('idTipoProducto_1').catch(() => {});

    await db.collection('subordens').dropIndex('idOrden_1').catch(() => {});

    await db.collection('ordendetalleproductos').dropIndex('idOrden_1').catch(() => {});

    await db.collection('ordendetalleplatillos').dropIndex('idSuborden_1').catch(() => {});

    await db.collection('ordendetalleextras').dropIndex('idOrdenDetallePlatillo_1').catch(() => {});

    await db.collection('gastos').dropIndex('fecha_-1').catch(() => {});
    await db.collection('gastos').dropIndex('idTipoGasto_1').catch(() => {});

    console.log('⬇️  Baseline migration reverted: indexes removed');
  },
};
