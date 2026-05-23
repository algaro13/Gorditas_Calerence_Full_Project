import { IOrdenRepository, IProductoRepository, IGastoRepository } from '../interfaces/repositories';
import { ICatalogoRepository } from '../interfaces/repositories';
import { IReportesService } from '../interfaces/services';
import { ServiceError } from './ordenes.service';
import { OrdenStatus } from '../types';

export class ReportesService implements IReportesService {
  constructor(
    private ordenRepo: IOrdenRepository,
    private productoRepo: IProductoRepository,
    private gastoRepo: IGastoRepository,
    private catalogoRepo: ICatalogoRepository
  ) {}

  async getReporteVentas(fechaInicio?: string, fechaFin?: string): Promise<any> {
    const filter: any = { estatus: 'Pagada' };

    if (fechaInicio && fechaFin) {
      filter.fechaHora = {
        $gte: new Date(fechaInicio + 'T00:00:00.000Z'),
        $lte: new Date(fechaFin + 'T23:59:59.999Z'),
      };
    }

    const pagadasCount = await this.ordenRepo.countDocuments({ estatus: 'Pagada' });

    const [total, resumen, ventasPorDia, ventasPorTipo] = await Promise.all([
      this.ordenRepo.countDocuments(filter),
      this.ordenRepo.aggregate([
        { $match: filter },
        { $group: { _id: null, totalVentas: { $sum: '$total' }, cantidadOrdenes: { $sum: 1 }, promedioVenta: { $avg: '$total' } } },
      ]),
      this.ordenRepo.aggregate([
        { $match: filter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$fechaHora' } }, ventas: { $sum: '$total' }, ordenes: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      this.ordenRepo.aggregate([
        { $match: filter },
        { $group: { _id: '$nombreTipoOrden', ventas: { $sum: '$total' }, ordenes: { $sum: 1 } } },
      ]),
    ]);

    // Get ordenes for detail
    const ordenesResult = await this.ordenRepo.find(filter, { page: 1, limit: 10000 });
    const ordenes = ordenesResult.items;
    const ordenIds = ordenes.map((o: any) => String(o._id));

    // Get productos
    const productos = await this.ordenRepo.aggregateDetallesProducto([
      { $match: { idOrden: { $in: ordenIds } } },
    ]);

    // Get subordenes -> platillos -> extras
    const subordenes: any[] = [];
    for (const ordenId of ordenIds) {
      const subs = await this.ordenRepo.findSubordenesByOrdenId(ordenId);
      subordenes.push(...subs);
    }
    const subordenIds = subordenes.map((s: any) => String(s._id));
    const platillos = await this.ordenRepo.findDetallesPlatilloBySubordenIds(subordenIds);
    const platilloIds = platillos.map((p: any) => String(p._id));
    const extras = await this.ordenRepo.findDetallesExtraByPlatilloIds(platilloIds);

    return {
      ordenes,
      productos,
      platillos,
      extras,
      pagination: { total },
      resumen: resumen[0] || { totalVentas: 0, cantidadOrdenes: 0, promedioVenta: 0 },
      ventasPorDia,
      ventasPorTipo,
      ordenesPagadas: pagadasCount,
    };
  }

  async getReporteInventario(): Promise<any> {
    const productos = await this.productoRepo.findAll({ activo: true });

    const resumen = {
      totalProductos: productos.length,
      stockBajo: productos.filter((p: any) => p.cantidad <= 5 && p.cantidad > 0).length,
      stockAgotado: productos.filter((p: any) => p.cantidad === 0).length,
      valorInventario: productos.reduce((total: number, p: any) => total + (p.cantidad * p.costo), 0),
    };

    return {
      productos,
      resumen,
      alertas: {
        stockBajo: productos.filter((p: any) => p.cantidad <= 5),
        stockAlto: productos.filter((p: any) => p.cantidad > 50),
      },
    };
  }

  async getReporteGastos(fechaInicio?: string, fechaFin?: string, tipoGasto?: string): Promise<any> {
    const filter: any = {};

    if (fechaInicio && fechaFin) {
      filter.fecha = {
        $gte: new Date(fechaInicio + 'T00:00:00.000Z'),
        $lte: new Date(fechaFin + 'T23:59:59.999Z'),
      };
    }
    if (tipoGasto) filter.idTipoGasto = parseInt(tipoGasto);

    const [gastos, resumen, gastosPorTipo, gastosPorDia] = await Promise.all([
      this.gastoRepo.find(filter),
      this.gastoRepo.aggregate([
        { $match: filter },
        { $group: { _id: null, totalGastos: { $sum: '$gastoTotal' }, cantidadGastos: { $sum: 1 }, promedioGasto: { $avg: '$gastoTotal' } } },
      ]),
      this.gastoRepo.aggregate([
        { $match: filter },
        { $group: { _id: '$nombreTipoGasto', gastos: { $sum: '$gastoTotal' }, cantidad: { $sum: 1 } } },
        { $sort: { gastos: -1 } },
      ]),
      this.gastoRepo.aggregate([
        { $match: filter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } }, gastos: { $sum: '$gastoTotal' }, cantidad: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      gastos,
      resumen: resumen[0] || { totalGastos: 0, cantidadGastos: 0, promedioGasto: 0 },
      gastosPorTipo,
      gastosPorDia,
    };
  }

  async createGasto(data: Record<string, any>): Promise<any> {
    const { nombre, idTipoGasto, gastoTotal, descripcion } = data;

    const tipoGasto = await this.catalogoRepo.findById('tipogasto', idTipoGasto);
    if (!tipoGasto) {
      throw new ServiceError('Tipo de gasto no encontrado', 400);
    }

    return this.gastoRepo.create({
      nombre,
      idTipoGasto,
      nombreTipoGasto: tipoGasto.nombre,
      gastoTotal,
      descripcion: descripcion || '',
      fecha: new Date(),
    });
  }

  async deleteGasto(id: string): Promise<any> {
    const gasto = await this.gastoRepo.findById(id);
    if (!gasto) throw new ServiceError('Gasto no encontrado', 404);

    await this.gastoRepo.deleteById(id);
    return null;
  }

  async getProductosVendidos(fechaInicio?: string, fechaFin?: string, limit: number = 10): Promise<any> {
    const matchFilter: any = {};

    if (fechaInicio && fechaFin) {
      const ordenesFiltradas = await this.ordenRepo.aggregate([
        {
          $match: {
            fechaHora: {
              $gte: new Date(fechaInicio + 'T00:00:00.000Z'),
              $lte: new Date(fechaFin + 'T23:59:59.999Z'),
            },
            estatus: OrdenStatus.ENTREGADA,
          },
        },
        { $project: { _id: 1 } },
      ]);
      matchFilter.idOrden = { $in: ordenesFiltradas.map((o: any) => o._id) };
    }

    const productosVendidos = await this.ordenRepo.aggregateDetallesProducto([
      { $match: matchFilter },
      { $group: { _id: { idProducto: '$idProducto', nombreProducto: '$nombreProducto' }, cantidadVendida: { $sum: '$cantidad' }, totalVentas: { $sum: '$importe' }, vecesVendido: { $sum: 1 } } },
      { $sort: { cantidadVendida: -1 } },
      { $limit: limit },
    ]);

    const platillosVendidos = await this.ordenRepo.aggregateDetallesPlatillo([
      {
        $lookup: { from: 'subordenes', localField: 'idSuborden', foreignField: '_id', as: 'suborden' },
      },
      {
        $lookup: { from: 'ordenes', localField: 'suborden.idOrden', foreignField: '_id', as: 'orden' },
      },
      {
        $match: {
          'orden.estatus': OrdenStatus.ENTREGADA,
          ...(fechaInicio && fechaFin
            ? { 'orden.fechaHora': { $gte: new Date(fechaInicio + 'T00:00:00.000Z'), $lte: new Date(fechaFin + 'T23:59:59.999Z') } }
            : {}),
        },
      },
      { $group: { _id: { idPlatillo: '$idPlatillo', nombrePlatillo: '$nombrePlatillo' }, cantidadVendida: { $sum: '$cantidad' }, totalVentas: { $sum: '$importe' }, vecesVendido: { $sum: 1 } } },
      { $sort: { cantidadVendida: -1 } },
      { $limit: limit },
    ]);

    return { productos: productosVendidos, platillos: platillosVendidos };
  }
}
