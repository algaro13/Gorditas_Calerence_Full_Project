import type { Db } from '../../../shared/infrastructure/prisma/client';

export interface SeedInput {
  mesas: Array<{ nombre: string }>;
  platillos: Array<{ nombre: string; precio: number }>;
  guisos: Array<{ nombre: string }>;
}

/**
 * Catálogo inicial de un restaurante nuevo. Se ejecuta dentro de la transacción del tenant
 * (runAsTenant), así que tenant_id lo pone la base.
 */
export async function seedTenant(db: Db, input: SeedInput): Promise<void> {
  const mesas = input.mesas.length > 0 ? input.mesas : Array.from({ length: 5 }, (_, i) => ({ nombre: `Mesa ${i + 1}` }));
  await db.mesa.createMany({ data: [...mesas.map((m, i) => ({ nombre: m.nombre?.trim() || `Mesa ${i + 1}` })), { nombre: 'Nuevo pedido' }] });

  const tiposPlatillo = await Promise.all(
    [
      { nombre: 'Gorditas', descripcion: 'Gorditas de maíz rellenas' },
      { nombre: 'Quesadillas', descripcion: 'Quesadillas de harina o maíz' },
      { nombre: 'Tacos', descripcion: 'Tacos dorados o suaves' },
      { nombre: 'Tortas', descripcion: 'Tortas y cemitas' },
      { nombre: 'Otros', descripcion: 'Otros platillos' },
    ].map((t) => db.tipoPlatillo.create({ data: t })),
  );
  const gorditas = tiposPlatillo[0];

  if (input.platillos.length > 0) {
    await db.platillo.createMany({
      data: input.platillos.map((p) => ({ nombre: p.nombre.trim(), precio: p.precio, costo: 0, idTipoPlatillo: gorditas.id })),
    });
  }
  if (input.guisos.length > 0) {
    await db.guiso.createMany({ data: input.guisos.map((g) => ({ nombre: g.nombre.trim() })) });
  }

  const [bebidas] = await Promise.all(
    [
      { nombre: 'Bebidas', descripcion: 'Refrescos, aguas, jugos' },
      { nombre: 'Postres', descripcion: 'Postres y dulces' },
      { nombre: 'Complementos', descripcion: 'Salsas, tortillas extra, aderezos' },
      { nombre: 'Snacks', descripcion: 'Frituras, dulces empaquetados' },
    ].map((t) => db.tipoProducto.create({ data: t })),
  );
  await db.producto.createMany({
    data: [
      { nombre: 'Coca-Cola 600ml', idTipoProducto: bebidas.id, cantidad: 24, costo: 18 },
      { nombre: 'Agua natural 600ml', idTipoProducto: bebidas.id, cantidad: 24, costo: 12 },
      { nombre: 'Jarritos 600ml', idTipoProducto: bebidas.id, cantidad: 12, costo: 15 },
    ],
  });

  const [ingredientes, salsas] = await Promise.all(
    [
      { nombre: 'Ingredientes extra', descripcion: 'Queso, crema, aguacate, cebolla' },
      { nombre: 'Salsas', descripcion: 'Salsas adicionales' },
    ].map((t) => db.tipoExtra.create({ data: t })),
  );
  await db.extra.createMany({
    data: [
      { nombre: 'Queso extra', costo: 10, idTipoExtra: ingredientes.id },
      { nombre: 'Crema', costo: 5, idTipoExtra: ingredientes.id },
      { nombre: 'Aguacate', costo: 15, idTipoExtra: ingredientes.id },
      { nombre: 'Salsa verde extra', costo: 5, idTipoExtra: salsas.id },
      { nombre: 'Salsa roja extra', costo: 5, idTipoExtra: salsas.id },
    ],
  });

  await db.tipoGasto.createMany({ data: ['Insumos', 'Servicios', 'Nómina', 'Mantenimiento', 'Otros'].map((nombre) => ({ nombre })) });
  await db.tipoOrden.createMany({ data: ['En mesa', 'Para llevar', 'Domicilio'].map((nombre) => ({ nombre })) });
}
