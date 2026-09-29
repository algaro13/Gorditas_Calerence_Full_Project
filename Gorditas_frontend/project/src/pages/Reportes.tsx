import React, { useState, useEffect, useRef } from 'react';
import { Aviso } from '../components/Aviso';
import type { LineaDescuento } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  DollarSign,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Plus,
  X,
  Save,
  Trash2,
  Check,
  Edit2
} from 'lucide-react';
import { apiService } from '../services/api';
import ExcelJS from 'exceljs';
import { useAuth } from '../context/AuthContext';
import { diaEn } from '../utils/dia';

interface VentaPorDia {
  _id: string;
  ventas: number;
  ordenes: number;
}

interface GastoPorDia {
  _id: string;
  gastos: number;
  cantidad: number;
}

interface ReporteVentas {
  fecha: string;
  /** Lo cobrado: neto, ya con las promociones descontadas. */
  ventasTotales: number;
  /** Lo que valían los artículos antes de descontar. */
  bruto: number;
  /** Lo que se regaló ese día. */
  descuentos: number;
  gastosTotales: number;
  utilidad: number;
  ordenes: number;
  montoCaja?: number; // Nuevo campo para el monto de caja
}

/** Lo que dio cada promoción en el período: la que trae gente frente a la que solo regala. */
interface DescuentoPorPromocion {
  _id: string;
  descuento: number;
  ordenes: number;
}

interface ProductoInventario {
  nombre: string;
  cantidad: number;
  costo: number;
}

interface ReporteInventario {
  producto: ProductoInventario;
  valorTotal: number;
  stockMinimo: boolean;
}

interface ProductoVendido {
  nombre: string;
  cantidadVendida: number;
  totalVendido: number;
}

interface Gasto {
  _id: string;
  nombre: string;
  idTipoGasto: number;
  nombreTipoGasto: string;
  gastoTotal: number;
  descripcion: string;
  fecha: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Una cifra con su nombre.
 *
 * En una tabla el nombre lo pone la cabecera de la columna; en una tarjeta no hay cabecera, así
 * que cada número tiene que traer escrito qué es. Sin esto una tarjeta de inventario serían
 * cuatro cantidades sueltas.
 */
const Dato: React.FC<{ etiqueta: string; children: React.ReactNode; className?: string }> = ({
  etiqueta,
  children,
  className = '',
}) => (
  <div className={`min-w-0 ${className}`}>
    <dt className="text-meta text-gray-500">{etiqueta}</dt>
    <dd className="text-cuerpo font-medium text-gray-900">{children}</dd>
  </div>
);

/** La tarjeta de un registro: su identidad arriba y sus datos debajo. */
const Tarjeta: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-sp-3 space-y-sp-2">{children}</div>
);

const Reportes: React.FC = () => {
  const { zonaHoraria } = useAuth();
  const [activeTab, setActiveTab] = useState('ventas');
  // El dia del negocio, no el de Greenwich. A las 18:04 en Mexico, `toISOString()` ya decia 26
  // cuando eran las seis de la tarde del 25, y el reporte abria en un dia sin ventas.
  const [fechaInicio, setFechaInicio] = useState(() => diaEn(zonaHoraria));
  const [fechaFin, setFechaFin] = useState(() => diaEn(zonaHoraria));

  // La zona llega con el restaurante, que puede tardar un instante mas que el primer pintado.
  // Cuando llega, se corrige el dia por omision — pero solo si el usuario no ha elegido otro.
  const rangoTocado = useRef(false);
  useEffect(() => {
    if (rangoTocado.current) return;
    const hoy = diaEn(zonaHoraria);
    setFechaInicio(hoy);
    setFechaFin(hoy);
  }, [zonaHoraria]);
  
  const [reporteVentas, setReporteVentas] = useState<ReporteVentas[]>([]);
  const [reporteInventario, setReporteInventario] = useState<ReporteInventario[]>([]);
  const [productosVendidos, setProductosVendidos] = useState<ProductoVendido[]>([]);
  const [reporteGastos, setReporteGastos] = useState<Gasto[]>([]);
  const [descuentosPorPromocion, setDescuentosPorPromocion] = useState<DescuentoPorPromocion[]>([]);
  
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [platillos, setPlatillos] = useState<any[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
  // Las líneas de descuento de cada orden: sin ellas, el detalle de una orden con promoción no
  // cuadra con lo que se cobró.
  const [descuentos, setDescuentos] = useState<Array<LineaDescuento & { idOrden: string }>>([]);
  const [ordenesDia, setOrdenesDia] = useState<any[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [ordenExpandida, setOrdenExpandida] = useState<string | null>(null);
  
  // Expense management states
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [tiposGasto, setTiposGasto] = useState<any[]>([]);
  const [nuevoGasto, setNuevoGasto] = useState({
    nombre: '',
    idTipoGasto: '',
    gastoTotal: 0,
    descripcion: ''
  });
  const [savingGasto, setSavingGasto] = useState(false);
  const [deletingGasto, setDeletingGasto] = useState<string | null>(null);
  
  // Estados para la funcionalidad de caja
  const [montoCajaPorFecha, setMontoCajaPorFecha] = useState<{[fecha: string]: number}>({});
  const [editandoCaja, setEditandoCaja] = useState<string | null>(null);
  const [montoTemporal, setMontoTemporal] = useState<number>(0);
  const [guardandoCaja, setGuardandoCaja] = useState<string | null>(null);
  
  // Estados para editar caja del día actual en el recuadro superior
  const [editandoCajaDiaActual, setEditandoCajaDiaActual] = useState<boolean>(false);
  const [montoAgregarCaja, setMontoAgregarCaja] = useState<number>(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * La caja del restaurante, no la del navegador.
   *
   * Vivia en `localStorage`, y de ahi salia «Total Caja» y la utilidad del dia. Eso significaba
   * que una cifra presentada como dato del negocio no se compartia entre dispositivos, no
   * entraba en el respaldo, se borraba al limpiar el navegador, y —lo peor— dos restaurantes
   * abiertos en el mismo navegador compartian la misma llave.
   */
  /**
   * Trae la caja, la mezcla con lo que ya hubiera y devuelve lo traido.
   *
   * Devuelve, y no solo guarda, porque quien arma el resumen necesita saber que dias tienen caja
   * en el mismo momento en que lo arma: leer el estado justo despues de fijarlo daria el valor
   * anterior, y un dia de solo caja no apareceria hasta el siguiente refresco.
   */
  const traerCaja = async (inicio?: string, fin?: string) => {
    const res = await apiService.getCaja(inicio, fin);
    if (!res.success || !res.data) return {};
    const montos: { [fecha: string]: number } = {};
    for (const fila of res.data.caja) montos[fila.fecha] = fila.monto;
    setMontoCajaPorFecha((previo) => ({ ...previo, ...montos }));
    return montos;
  };

  const cargarMontoCaja = async () => {
    const montos = await traerCaja();
    await subirCajaDelNavegador(montos);
  };

  /** La llave donde vivia antes; se conserva para no destruir nada al migrar. */
  const LLAVE_LOCAL = 'montoCajaPorFecha';

  /**
   * Lo que alguien tuviera anotado en su navegador se sube una sola vez.
   *
   * Solo los dias que el servidor no conoce: si ya hay un monto arriba, manda ese, porque pudo
   * fijarlo otra persona desde otro dispositivo. El original no se borra, se guarda bajo otra
   * llave por si hiciera falta mirarlo.
   */
  const subirCajaDelNavegador = async (yaEnServidor: { [fecha: string]: number }) => {
    let local: { [fecha: string]: number };
    try {
      const crudo = localStorage.getItem(LLAVE_LOCAL);
      if (!crudo) return;
      local = JSON.parse(crudo);
    } catch {
      return;
    }

    const pendientes = Object.entries(local).filter(
      ([fecha, monto]) => typeof monto === 'number' && monto > 0 && yaEnServidor[fecha] === undefined,
    );
    for (const [fecha, monto] of pendientes) {
      const res = await apiService.fijarCaja(fecha, monto);
      if (!res.success) return; // Si algo falla, se deja el original y se reintenta la proxima.
    }

    localStorage.setItem(`${LLAVE_LOCAL}.importado`, JSON.stringify(local));
    localStorage.removeItem(LLAVE_LOCAL);
    if (pendientes.length > 0) {
      setMontoCajaPorFecha({ ...yaEnServidor, ...Object.fromEntries(pendientes) });
    }
  };

  const guardarMontoCaja = async (fecha: string, monto: number) => {
    const res = await apiService.fijarCaja(fecha, monto);
    if (!res.success) {
      setError(res.error || 'No se pudo guardar el monto de caja');
      return;
    }
    setMontoCajaPorFecha((previo) => ({ ...previo, [fecha]: monto }));
  };

  // Función para calcular utilidad con caja
  const calcularUtilidadConCaja = (ventasTotales: number, gastosTotales: number, fecha: string): number => {
    const montoCaja = montoCajaPorFecha[fecha] || 0;
    return (ventasTotales + montoCaja) - gastosTotales;
  };

  // Funciones para manejar la edición de caja
  const iniciarEdicionCaja = (fecha: string) => {
    setEditandoCaja(fecha);
    setMontoTemporal(montoCajaPorFecha[fecha] || 0);
  };

  const cancelarEdicionCaja = () => {
    setEditandoCaja(null);
    setMontoTemporal(0);
  };

  const confirmarEdicionCaja = async () => {
    if (editandoCaja) {
      setGuardandoCaja(editandoCaja);
      try {
        await guardarMontoCaja(editandoCaja, montoTemporal);
        setEditandoCaja(null);
        setMontoTemporal(0);
      } catch (error) {
        console.error('Error al guardar el monto de caja:', error);
      } finally {
        setGuardandoCaja(null);
      }
    }
  };

  // La fecha bajo la que se archiva el dinero de la caja. Calcularla en UTC no era un detalle de
  // presentacion: despues de las 18:00 el dinero quedaba anotado en el dia siguiente, la fila del
  // dia real se quedaba en cero y la cantidad reaparecia sola al dia siguiente.
  const obtenerFechaActual = (): string => diaEn(zonaHoraria);

  const iniciarEdicionCajaDiaActual = () => {
    const fechaActual = obtenerFechaActual();
    setEditandoCajaDiaActual(true);
    setMontoAgregarCaja(0);
  };

  const cancelarEdicionCajaDiaActual = () => {
    setEditandoCajaDiaActual(false);
    setMontoAgregarCaja(0);
  };

  const confirmarAgregarCajaDiaActual = async () => {
    const fechaActual = obtenerFechaActual();
    const montoActual = montoCajaPorFecha[fechaActual] || 0;
    const nuevoMonto = montoActual + montoAgregarCaja;
    
    
    await guardarMontoCaja(fechaActual, nuevoMonto);
    setEditandoCajaDiaActual(false);
    setMontoAgregarCaja(0);
  };

  useEffect(() => {
    void cargarMontoCaja();
  }, []);

  useEffect(() => {
    // Cerrar la sección de "Ver órdenes" cuando cambian los filtros
    setDiaSeleccionado(null);
    setOrdenExpandida(null);
    loadReports();
  }, [activeTab, fechaInicio, fechaFin]);

  /**
   * Cada carga lleva su numero, y solo la ultima manda.
   *
   * Cambiar las dos fechas del filtro seguidas dispara dos cargas: la primera con el rango a
   * medio cambiar y la segunda con el bueno. Si la primera contesta despues, sus datos pisan a
   * los de la segunda y la pantalla acaba mostrando numeros de un periodo que no es el que dicen
   * los campos. Paso de verdad al probar: los dos campos decian el mismo dia de 1999 y arriba
   * habia $795 de ventas.
   */
  const turnoDeCarga = useRef(0);

  const loadReports = async () => {
    const miTurno = ++turnoDeCarga.current;
    const vigente = () => miTurno === turnoDeCarga.current;

    // Cerrar sección de "Ver órdenes" al recargar manualmente
    setDiaSeleccionado(null);
    setOrdenExpandida(null);
    
    setLoading(true);
    setError('');
    
    try {
      switch (activeTab) {
        case 'ventas':
          const ventasRes = await apiService.getReporteVentas(fechaInicio, fechaFin);
          if (ventasRes.success) {

            const ventasFormateadas: ReporteVentas[] = [];
            const ventasPorDia = ventasRes.data.ventasPorDia || [];
            const ordenes = ventasRes.data.ordenes || [];
            const productos = ventasRes.data.productos || [];
            const platillos = ventasRes.data.platillos || [];
            const extras = ventasRes.data.extras || [];
            const descuentosDeOrdenes = ventasRes.data.descuentos || [];

            setOrdenes(ordenes);
            setDescuentosPorPromocion(ventasRes.data.descuentosPorPromocion || []);
            setProductos(productos);
            setPlatillos(platillos);
            setExtras(extras);
            setDescuentos(descuentosDeOrdenes);

            // Los gastos se piden siempre, haya ventas o no. Antes esta llamada vivia dentro
            // de un `if (ventasPorDia.length > 0)`, asi que un mes sin ventas y con gastos se
            // veia completamente vacio.
            const gastosRes = await apiService.getReporteGastos(fechaInicio, fechaFin);
            const gastosPorDia: { [fecha: string]: number } = gastosRes.success
              ? (gastosRes.data.gastosPorDia || []).reduce(
                  (acc: { [key: string]: number }, gasto: any) => {
                    acc[gasto._id] = gasto.gastos || 0;
                    return acc;
                  },
                  {},
                )
              : {};

            const cajaPorDia = await traerCaja(fechaInicio, fechaFin);

            const ventasPorFecha: { [fecha: string]: { ventas: number; descuentos: number; ordenes: number } } = {};
            for (const venta of ventasPorDia) {
              ventasPorFecha[venta._id] = {
                ventas: venta.ventas || 0,
                descuentos: venta.descuentos || 0,
                ordenes: venta.ordenes || 0,
              };
            }

            // Un dia con movimiento es un dia del resumen: ventas, caja o gastos.
            //
            // Antes se recorrian solo los dias con ventas, y como los totales de arriba se
            // calculan sobre esta misma lista, lo que ocurriera en un dia sin ventas no se
            // sumaba en ninguna parte. Con los gastos eso no era un renglon que faltaba: la
            // utilidad salia inflada, porque se ignoraba dinero que si se gasto.
            // Un cero no es movimiento. Un dia puede tener fila de caja valiendo cero —porque
            // alguien la corrigio a cero, o porque la dejo una prueba— y ese dia no ocurrio
            // nada: aparecia como una tarjeta entera de ceros.
            const conValor = (m: { [f: string]: number }) => Object.keys(m).filter((f) => m[f] !== 0);
            const dias = new Set([
              ...Object.keys(ventasPorFecha),
              ...conValor(gastosPorDia),
              ...conValor(cajaPorDia),
            ]);

            for (const fecha of dias) {
              const delDia = ventasPorFecha[fecha] ?? { ventas: 0, descuentos: 0, ordenes: 0 };
              const gastosTotales = gastosPorDia[fecha] || 0;
              ventasFormateadas.push({
                fecha,
                ventasTotales: delDia.ventas,
                descuentos: delDia.descuentos,
                // El bruto no se guarda: es lo cobrado más lo que se regaló.
                bruto: delDia.ventas + delDia.descuentos,
                gastosTotales,
                utilidad: delDia.ventas - gastosTotales,
                ordenes: delDia.ordenes,
              });
            }

            // Las fechas son `YYYY-MM-DD`: comparandolas como texto se ordenan solas, sin
            // construir un `Date` por comparacion.
            ventasFormateadas.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

            if (!vigente()) return;
            setReporteVentas(ventasFormateadas);
          }
          break;
          
        case 'inventario':
          const inventarioRes = await apiService.getReporteInventario();
          if (inventarioRes.success) {
            const inventarioFormateado = inventarioRes.data.productos.map((producto: any) => ({
              producto: {
                nombre: producto.nombre,
                cantidad: producto.cantidad,
                costo: producto.costo
              },
              valorTotal: producto.cantidad * producto.costo,
              stockMinimo: producto.cantidad <= 5
            }));
            if (!vigente()) return;
            setReporteInventario(inventarioFormateado);
          }
          break;
          
        case 'productos':
          const productosRes = await apiService.getProductosVendidos();
          if (productosRes.success) {
            // Combinar productos y platillos vendidos
            const todosProductos = [
              ...productosRes.data.productos.map((p: any) => ({
                nombre: p._id.nombreProducto,
                cantidadVendida: p.cantidadVendida,
                totalVendido: p.totalVentas
              })),
              ...productosRes.data.platillos.map((p: any) => ({
                nombre: p._id.nombrePlatillo,
                cantidadVendida: p.cantidadVendida,
                totalVendido: p.totalVentas
              }))
            ];
            if (!vigente()) return;
            setProductosVendidos(todosProductos);
          }
          break;
          
        case 'gastos':
          const gastosRes = await apiService.getReporteGastos(fechaInicio, fechaFin);
          if (gastosRes.success) {
            if (!vigente()) return;
            setReporteGastos(gastosRes.data.gastos);
          }
          break;
      }
    } catch (error) {
      setError('Error cargando reportes');
      console.error('Error en loadReports:', error);
    } finally {
      // Solo la ultima carga apaga el indicador: si lo apagara una vieja, la pantalla diria que
      // termino mientras la buena sigue en camino.
      if (vigente()) setLoading(false);
    }
  };

  // Load tipos de gasto when gastos tab is selected
  useEffect(() => {
    if (activeTab === 'gastos' && tiposGasto.length === 0) {
      loadTiposGasto();
    }
  }, [activeTab]);

  const loadTiposGasto = async () => {
    try {
      const response = await apiService.getCatalog('tipogasto');
      if (response.success) {
        const tiposArray = response.data?.items || response.data || [];
        setTiposGasto(tiposArray);
      }
    } catch (error) {
      console.error('Error loading tipos de gasto:', error);
    }
  };

  const handleCreateGasto = async () => {
    if (!nuevoGasto.nombre || !nuevoGasto.idTipoGasto || nuevoGasto.gastoTotal <= 0) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    setSavingGasto(true);
    setError('');

    try {
      const response = await apiService.createGasto(nuevoGasto);
      
      if (response.success) {
        setShowGastoModal(false);
        setNuevoGasto({
          nombre: '',
          idTipoGasto: '',
          gastoTotal: 0,
          descripcion: ''
        });
        // Reload gastos after creation
        loadReports();
      } else {
        setError('Error creando el gasto');
      }
    } catch (error) {
      setError('Error creando el gasto');
    } finally {
      setSavingGasto(false);
    }
  };

  const handleDeleteGasto = async (gastoId: string, nombreGasto: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el gasto "${nombreGasto}"?`)) {
      return;
    }

    setDeletingGasto(gastoId);
    setError('');

    try {
      const response = await apiService.deleteGasto(gastoId);
      
      if (response.success) {
        // Reload gastos after deletion
        loadReports();
      } else {
        setError('Error eliminando el gasto');
      }
    } catch (error) {
      setError('Error eliminando el gasto');
    } finally {
      setDeletingGasto(null);
    }
  };

  
  const handleExportReport = async () => {
    let data: Array<Record<string, any>> = [];
    if (activeTab === 'ventas' && diaSeleccionado && ordenesDia.length > 0) {
      // Exportar órdenes del día seleccionado
      data = ordenesDia.map(orden => ({
        Folio: orden.folio,
        Mesa: orden.idMesa || 'N/A',
        Tipo: orden.nombreTipoOrden,
        Total: orden.total,
        Hora: new Date(orden.fechaHora).toLocaleTimeString(),
        Fecha: new Date(orden.fechaHora).toLocaleDateString(),
      }));
    } else if (activeTab === 'ventas' && !diaSeleccionado && ordenes.length > 0) {
      // Exportar todas las órdenes del filtro de fechas cuando no hay día seleccionado
      const ordenesFiltradas = ordenes.filter((orden: any) => {
        if (orden.estatus !== 'Pagada') return false;
        if (!orden.fechaHora) return false;
        
        const fechaOrdenUTC = obtenerFechaDelDia(orden.fechaHora);
        return fechaOrdenUTC >= fechaInicio && fechaOrdenUTC <= fechaFin;
      });
      
      data = ordenesFiltradas.map(orden => ({
        Folio: orden.folio,
        Cliente: orden.nombreCliente || 'Sin nombre',
        Mesa: orden.idMesa || 'N/A',
        Tipo: orden.nombreTipoOrden,
        Total: orden.total,
        Fecha: new Date(orden.fechaHora).toLocaleDateString(),
        Hora: new Date(orden.fechaHora).toLocaleTimeString(),
      }));
    } else if (activeTab === 'inventario') {
      data = reporteInventario.map(item => ({
        Producto: item.producto.nombre,
        Cantidad: item.producto.cantidad,
        'Costo Unitario': item.producto.costo,
        'Valor Total': item.valorTotal,
        Estado: item.stockMinimo ? 'Stock Bajo' : 'Normal',
      }));
    } else if (activeTab === 'productos') {
      data = productosVendidos.map(prod => ({
        Producto: prod.nombre,
        'Cantidad Vendida': prod.cantidadVendida,
        'Total Vendido': prod.totalVendido,
      }));
    } else if (activeTab === 'gastos') {
      data = reporteGastos.map(gasto => ({
        Fecha: new Date(gasto.fecha).toLocaleDateString(),
        Nombre: gasto.nombre,
        Tipo: gasto.nombreTipoGasto,
        Descripción: gasto.descripcion,
        Monto: gasto.gastoTotal,
      }));
    }

    if (data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    // Agregar encabezados
    worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));

    // Agregar filas
    data.forEach(row => worksheet.addRow(row));

    // Descargar el archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${activeTab}_${diaEn(zonaHoraria)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'ventas', name: 'Ventas', icon: TrendingUp },
    { id: 'inventario', name: 'Inventario', icon: Package },
    { id: 'productos', name: 'Productos Vendidos', icon: BarChart3 },
    { id: 'gastos', name: 'Gastos', icon: DollarSign },
  ];

  const getTotalVentas = () => {
    return reporteVentas.reduce((total, reporte) => 
      total + (reporte.ventasTotales || 0), 0
    );
  };

  const getTotalCaja = () => {
    return reporteVentas.reduce((total, reporte) => 
      total + (montoCajaPorFecha[reporte.fecha] || 0), 0
    );
  };

  const getCajaDiaActual = () => {
    const fechaActual = obtenerFechaActual();
    return montoCajaPorFecha[fechaActual] || 0;
  };

  const getTotalIngresosConCaja = () => {
    return getTotalVentas() + getTotalCaja();
  };

  const getTotalDescuentos = () => reporteVentas.reduce((t, r) => t + (r.descuentos || 0), 0);

  const getTotalGastos = () => {
    return reporteVentas.reduce((total, reporte) => 
      total + (reporte.gastosTotales || 0), 0
    );
  };

  const getTotalUtilidad = () => {
    const totalIngresos = getTotalIngresosConCaja();
    const totalGastos = getTotalGastos();
    return totalIngresos - totalGastos;
  };

  const getTotalInventario = () => {
    return reporteInventario.reduce((total, item) => total + item.valorTotal, 0);
  };

  /**
   * El dia al que pertenece una orden, para emparejarla con el dia que se abrio.
   *
   * Llevaba `America/Mexico_City` escrita a mano —correcta para este restaurante y equivocada
   * para cualquier otro— y tres comentarios que decian que replicaba un `$dateToString` de
   * MongoDB «sin timezone = UTC», que es justo lo contrario de lo que hacia el codigo. Usa la
   * zona del negocio, como el resto de la pantalla.
   */
  const obtenerFechaDelDia = (fecha: string | Date): string => {
    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) {
      console.warn(`Fecha inválida recibida: ${fecha}`);
      return '';
    }
    const fechaLocalStr = diaEn(zonaHoraria, fechaObj);
    return fechaLocalStr;
  };

  // Función para agrupar órdenes por mesa en intervalos de 15 minutos
  const agruparOrdenesPorMesa = (ordenesDelDia: any[]) => {
    if (ordenesDelDia.length === 0) return [];
    
    // Agrupar por mesa/pedido
    const ordenesPorMesa: { [key: string]: any[] } = {};
    
    ordenesDelDia.forEach(orden => {
      const mesaKey = orden.nombreMesa || orden.nombreTipoOrden || 'Sin Mesa';
      if (!ordenesPorMesa[mesaKey]) {
        ordenesPorMesa[mesaKey] = [];
      }
      ordenesPorMesa[mesaKey].push(orden);
    });
    
    // Agrupar órdenes de cada mesa por intervalos de 15 minutos
    const gruposFinales: any[] = [];
    
    Object.keys(ordenesPorMesa).forEach(mesaKey => {
      const ordenesMesa = ordenesPorMesa[mesaKey].sort((a, b) => 
        new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
      );
      
      let grupoActual: any[] = [];
      let tiempoReferencia: number | null = null;
      
      ordenesMesa.forEach(orden => {
        const tiempoOrden = new Date(orden.fechaHora).getTime();
        
        // Si es la primera orden del grupo o está dentro de 15 minutos
        if (tiempoReferencia === null || (tiempoOrden - tiempoReferencia) <= 15 * 60 * 1000) {
          grupoActual.push(orden);
          // Actualizar tiempo de referencia a la orden más reciente
          tiempoReferencia = tiempoOrden;
        } else {
          // Guardar el grupo actual y empezar uno nuevo
          if (grupoActual.length > 0) {
            gruposFinales.push({
              mesa: mesaKey,
              ordenes: grupoActual,
              total: grupoActual.reduce((sum, o) => sum + o.total, 0),
              primeraOrden: grupoActual[0],
              ultimaOrden: grupoActual[grupoActual.length - 1],
              esGrupo: grupoActual.length > 1
            });
          }
          grupoActual = [orden];
          tiempoReferencia = tiempoOrden;
        }
      });
      
      // Guardar el último grupo
      if (grupoActual.length > 0) {
        gruposFinales.push({
          mesa: mesaKey,
          ordenes: grupoActual,
          total: grupoActual.reduce((sum, o) => sum + o.total, 0),
          primeraOrden: grupoActual[0],
          ultimaOrden: grupoActual[grupoActual.length - 1],
          esGrupo: grupoActual.length > 1
        });
      }
    });
    
    // Ordenar por hora de la última orden de cada grupo
    return gruposFinales.sort((a, b) => 
      new Date(a.ultimaOrden.fechaHora).getTime() - new Date(b.ultimaOrden.fechaHora).getTime()
    );
  };

  const mostrarOrdenesDeDia = (fecha: string) => {
    
    // Si no hay órdenes, mostrar array vacío
    if (ordenes.length === 0) {
      setOrdenesDia([]);
      setDiaSeleccionado(fecha);
      setOrdenExpandida(null);
      return;
    }
    
    // Verificar que la fecha seleccionada esté dentro del rango del filtro
    if (fecha < fechaInicio || fecha > fechaFin) {
      console.log(` La fecha ${fecha} está fuera del rango permitido (${fechaInicio} - ${fechaFin})`);
      setOrdenesDia([]);
      setDiaSeleccionado(fecha);
      setOrdenExpandida(null);
      return;
    }
    
    // Filtrar órdenes usando EXACTAMENTE la misma lógica que el backend
    const ordenesFiltradas = ordenes.filter((orden: any) => {
      // Solo órdenes pagadas (mismo filtro que el backend)
      if (orden.estatus !== 'Pagada') {
        return false;
      }
      
      // Usar fechaHora y aplicar EXACTAMENTE la misma conversión que el backend
      if (!orden.fechaHora) {
        return false;
      }
      
      // Replicar exactamente: $dateToString: { format: '%Y-%m-%d', date: '$fechaHora' } (UTC)
      const fechaOrdenUTC = obtenerFechaDelDia(orden.fechaHora);
      
      // La fecha debe coincidir exactamente con la fecha del resumen
      const coincideFecha = fechaOrdenUTC === fecha;
      
      if (coincideFecha) {
        console.log(` Orden ${orden.folio}: fechaHora=${orden.fechaHora} -> UTC=${fechaOrdenUTC} -> COINCIDE`);
      }
      
      return coincideFecha;
    });
   
    ordenesFiltradas.forEach((orden: any, index: number) => {
      console.log(`  ${index + 1}. Folio: ${orden.folio}, Total: $${orden.total}, FechaHora: ${orden.fechaHora}`);
    });
    
    setOrdenesDia(ordenesFiltradas);
    setDiaSeleccionado(fecha);
    setOrdenExpandida(null);
  };

  /**
   * Los campos que comparten la tabla y la tarjeta se definen aqui, una sola vez.
   *
   * Es la misma decision que en Recibir Productos: si cada presentacion escribe su propio JSX,
   * alguien corrige el estado del stock en la tabla y no en la tarjeta, y el fallo solo se ve
   * en telefono, que es justo donde nadie mira.
   */
  /**
   * Todo lo que hay que calcular de un grupo de ordenes, una sola vez.
   *
   * Antes esto vivia dentro del `map` del `<tbody>`: cuarenta lineas de calculo incrustadas en
   * el JSX de la tabla. Mientras hubo una sola presentacion daba igual; con dos, o se saca
   * aqui o se copia, y una copia de un calculo de totales es una copia que acabara dando otro
   * numero.
   */
  const prepararGrupo = (grupo: any, idx: number) => {
    const productosGrupo = productos.filter((p) =>
      grupo.ordenes.some((o: any) => o._id === p.idOrden)
    );

    // Por `idOrden`, que el backend ya manda con cada platillo.
    //
    // Antes se comparaban los siete primeros caracteres del id de la orden con los del id de la
    // suborden. Eso funcionaba con ObjectId de Mongo, que comparten prefijo por haberse
    // generado con el mismo reloj; con UUID no acierta nunca, y el reporte llevaba meses
    // diciendo que en ninguna orden se habia vendido nada.
    const platillosGrupo = platillos.filter((pl) =>
      grupo.ordenes.some((o: any) => pl.idOrden && pl.idOrden === o._id)
    );

    const platillosConExtras = platillosGrupo.map((platillo) => ({
      ...platillo,
      extras: extras.filter((extra) => extra.idOrdenDetallePlatillo === platillo._id),
    }));

    const descuentosGrupo = descuentos.filter((d) => grupo.ordenes.some((o: { _id: string }) => o._id === d.idOrden));

    const totalProductos = productosGrupo.reduce((sum: number, p: any) => sum + p.cantidad, 0);
    const totalPlatillos = platillosGrupo.reduce((sum: number, p: any) => sum + p.cantidad, 0);

    const resumenPorCliente: {
      [cliente: string]: { platillos: number; productos: number; total: number };
    } = {};

    if (grupo.esGrupo) {
      grupo.ordenes.forEach((o: any) => {
        const nombreCliente = o.nombreCliente || 'Sin nombre';
        if (!resumenPorCliente[nombreCliente]) {
          resumenPorCliente[nombreCliente] = { platillos: 0, productos: 0, total: 0 };
        }
        const productosOrden = productosGrupo.filter((p: any) => p.idOrden === o._id);
        resumenPorCliente[nombreCliente].productos += productosOrden.reduce(
          (sum: number, p: any) => sum + p.cantidad,
          0
        );
        const platillosOrden = platillosGrupo.filter((pl: any) => pl.idOrden === o._id);
        resumenPorCliente[nombreCliente].platillos += platillosOrden.reduce(
          (sum: number, p: any) => sum + p.cantidad,
          0
        );
        resumenPorCliente[nombreCliente].total += o.total;
      });
    }

    return {
      grupo,
      id: `grupo-${idx}`,
      orden: grupo.primeraOrden,
      productosGrupo,
      platillosConExtras,
      totalProductos,
      totalPlatillos,
      resumenPorCliente,
      importePlatillos: platillosConExtras.reduce((sum, pl) => {
        const extrasTotal =
          pl.extras?.reduce((e: number, x: any) => e + (x.importe || 0), 0) || 0;
        return sum + (pl.importe || 0) + extrasTotal;
      }, 0),
      importeProductos: productosGrupo.reduce((sum: number, p: any) => sum + p.importe, 0),
      descuentosGrupo,
    };
  };

  /** Un concepto con su cantidad y su importe, alineados a la derecha. */
  const linea = (
    concepto: React.ReactNode,
    cantidad: React.ReactNode,
    importe: string,
    clase = ''
  ) => (
    <div className={`flex items-baseline gap-sp-1 py-1 ${clase}`}>
      <span className="flex-1 min-w-0 break-words">{concepto}</span>
      <span className="w-8 text-right tabular-nums">{cantidad}</span>
      <span className="w-20 text-right tabular-nums">{importe}</span>
    </div>
  );

  /**
   * El detalle de un grupo: sus productos, sus platillos con extras, y los extras sueltos.
   *
   * Eran tres tablas anidadas dentro de una celda de otra tabla, cada una con su propio
   * arrastre lateral. Son listas de concepto, cantidad e importe; nunca necesitaron columnas.
   */
  const detalleDelGrupo = (g: ReturnType<typeof prepararGrupo>) => (
    <div className="bg-gray-50 p-sp-2 rounded-lg space-y-sp-2 text-meta">
      {g.grupo.esGrupo && (
        <div className="p-sp-2 bg-blue-50 rounded border border-blue-200">
          <h4 className="font-semibold text-cuerpo text-blue-800 mb-2">
            Órdenes agrupadas ({g.grupo.ordenes.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {g.grupo.ordenes.map((o: any) => (
              <div key={o._id} className="bg-white p-2 rounded border border-blue-200">
                <div>
                  <strong>Folio:</strong> {o.folio}
                </div>
                <div>
                  <strong>Cliente:</strong> {o.nombreCliente || 'Sin nombre'}
                </div>
                <div>
                  <strong>Total:</strong> ${o.total.toFixed(2)}
                </div>
                <div>
                  <strong>Hora:</strong>{' '}
                  {new Date(o.fechaHora).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="font-semibold mb-1">Productos</h4>
        {g.productosGrupo.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {g.productosGrupo.map((prod: any) =>
              <React.Fragment key={prod._id}>
                {linea(prod.nombreProducto, prod.cantidad, `$${prod.importe.toFixed(2)}`)}
              </React.Fragment>
            )}
            {linea(
              'Total productos',
              g.totalProductos,
              `$${g.importeProductos.toFixed(2)}`,
              'font-semibold border-t border-gray-300'
            )}
          </div>
        ) : (
          <p className="text-gray-500">No hay productos.</p>
        )}
      </div>

      <div>
        <h4 className="font-semibold mb-1">Platillos</h4>
        {g.platillosConExtras.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {g.platillosConExtras.map((pl) => (
              <div key={pl._id} className="py-1">
                {linea(
                  <>
                    {pl.nombrePlatillo}
                    {pl.nombreGuiso && <span className="text-gray-500"> · {pl.nombreGuiso}</span>}
                  </>,
                  pl.cantidad,
                  `$${pl.importe.toFixed(2)}`
                )}
                {pl.notas && (
                  <p className="pl-sp-2 text-blue-700 italic">Nota: {pl.notas}</p>
                )}
                {pl.extras?.map((extra: any) => (
                  <div key={extra._id} className="pl-sp-2 text-purple-700">
                    {linea(`+ ${extra.nombreExtra}`, extra.cantidad, `$${extra.importe?.toFixed(2) || '0.00'}`)}
                  </div>
                ))}
              </div>
            ))}
            {linea(
              'Total platillos',
              g.totalPlatillos,
              `$${g.importePlatillos.toFixed(2)}`,
              'font-semibold border-t border-gray-300'
            )}
          </div>
        ) : (
          <p className="text-gray-500">No hay platillos.</p>
        )}
      </div>

      {/* Lo que explica que la orden cobre menos que sus artículos: cada descuento, con su nombre. */}
      {g.descuentosGrupo.length > 0 && (
        <div>
          <h4 className="font-semibold mb-1">Promociones</h4>
          <div className="divide-y divide-gray-200 text-blue-700">
            {g.descuentosGrupo.map((d) => (
              <React.Fragment key={d._id}>{linea(d.nombre, '', `-$${Math.abs(d.importe).toFixed(2)}`)}</React.Fragment>
            ))}
            {linea(
              'Total descuentos',
              '',
              `-$${Math.abs(g.descuentosGrupo.reduce((s, d) => s + d.importe, 0)).toFixed(2)}`,
              'font-semibold border-t border-gray-300'
            )}
          </div>
        </div>
      )}

    </div>
  );

  /** El recuento de una orden en palabras: «2 platillos · 1 producto». */
  const recuento = (platillosN: number, productosN: number) => {
    const partes: string[] = [];
    if (platillosN > 0) partes.push(`${platillosN} platillo${platillosN !== 1 ? 's' : ''}`);
    if (productosN > 0) partes.push(`${productosN} producto${productosN !== 1 ? 's' : ''}`);
    return partes.length > 0 ? partes.join(' · ') : 'Sin items';
  };

  /** La fecha del backend llega ya en UTC como aaaa-mm-dd; solo se le da la vuelta. */
  const formatearFecha = (fecha: string) => {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  };

  /**
   * El monto de caja del dia: se lee, y se edita en el sitio.
   *
   * Lo comparten la tarjeta y la tabla porque es el unico dato editable del reporte; tenerlo
   * escrito dos veces significaria que un arreglo al guardar solo llega a una de las dos.
   */
  const campoCaja = (reporte: any) =>
    editandoCaja === reporte.fecha ? (
      <div className="flex items-center gap-sp-1">
        <input
          type="number"
          value={montoTemporal}
          onChange={(e) => setMontoTemporal(parseFloat(e.target.value) || 0)}
          className="campo w-24"
          placeholder="0.00"
          step="0.01"
          min="0"
          aria-label="Monto de caja"
        />
        <button
          onClick={confirmarEdicionCaja}
          disabled={guardandoCaja === reporte.fecha}
          className="btn btn-avanzar"
          aria-label="Confirmar monto"
        >
          {guardandoCaja === reporte.fecha ? '...' : <Check className="w-4 h-4" />}
        </button>
        <button onClick={cancelarEdicionCaja} className="btn btn-neutro" aria-label="Cancelar">
          <X className="w-4 h-4" />
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-sp-1">
        <span className="text-cuerpo text-blue-600 font-medium">
          ${(montoCajaPorFecha[reporte.fecha] || 0).toFixed(2)}
        </span>
        <button
          onClick={() => iniciarEdicionCaja(reporte.fecha)}
          className="btn btn-neutro"
          aria-label="Editar monto de caja"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    );

  const estadoInventario = (item: any) => (
    <span
      className={`px-2 py-1 text-meta font-medium rounded-full whitespace-nowrap ${
        item.stockMinimo ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
      }`}
    >
      {item.stockMinimo ? 'Stock Bajo' : 'Normal'}
    </span>
  );

  const botonBorrarGasto = (gasto: any) => (
    <button
      onClick={() => handleDeleteGasto(gasto._id, gasto.nombre)}
      disabled={deletingGasto === gasto._id}
      className="btn btn-destructivo"
    >
      {deletingGasto === gasto._id ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      ) : (
        <>
          <Trash2 className="w-4 h-4 mr-1" />
          Eliminar
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-pantalla font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600 mt-1 text-cuerpo">Análisis y estadísticas del restaurante</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={loadReports}
            className="btn flex-1 sm:flex-none btn-neutro"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
          <button
            onClick={handleExportReport}
            className="btn flex-1 sm:flex-none btn-neutro"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      <Aviso error={error} />

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Dos filas en telefono en vez de una tira que se arrastra: las cuatro pestanas
            median 454 px en 375, asi que «Gastos» quedaba fuera y nada lo anunciaba. */}
        <div className="border-b border-gray-200">
          <nav className="grid grid-cols-2 gap-1 p-2 sm:flex sm:gap-0 sm:space-x-8 sm:px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center sm:justify-start gap-1 sm:gap-2 py-2 sm:py-4 px-2 sm:px-4 border-b-2 font-medium text-meta transition-colors text-center sm:whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Date Filter */}
        {(activeTab === 'ventas' || activeTab === 'gastos') && (
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-cuerpo font-medium text-gray-700">Período:</span>
                </div>
                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-4">
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => {
                      rangoTocado.current = true;
                      setFechaInicio(e.target.value);
                    }}
                    className="campo sm:w-auto"
                  />
                  <span className="hidden sm:block text-gray-500">hasta</span>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => {
                      rangoTocado.current = true;
                      setFechaFin(e.target.value);
                    }}
                    className="campo sm:w-auto"
                  />
                </div>
              </div>
              
              {/* Create Expense Button - only show in gastos tab */}
              {activeTab === 'gastos' && (
                <button
                  onClick={() => setShowGastoModal(true)}
                  className="btn btn-primario"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Gasto
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <>
              {/* Sales Report */}
              {activeTab === 'ventas' && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    <div className="bg-green-50 p-4 sm:p-6 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-meta text-green-600">Total Ventas</p>
                          <p className="text-pantalla font-bold text-green-900">
                            ${getTotalVentas().toFixed(2)}
                          </p>
                          {/* Con promociones, «Ventas» pasó a ser neto. Sin el bruto y lo
                              descontado, el número habría cambiado de significado sin avisar. */}
                          {getTotalDescuentos() > 0 && (
                            <p className="text-meta text-green-700 mt-1">
                              ${(getTotalVentas() + getTotalDescuentos()).toFixed(2)} menos $
                              {getTotalDescuentos().toFixed(2)} de promociones
                            </p>
                          )}
                        </div>
                        <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 sm:p-6 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-meta text-blue-600">Total Caja</p>
                          <p className="text-pantalla font-bold text-blue-900">
                            ${getTotalCaja().toFixed(2)}
                          </p>
                          <p className="text-meta text-blue-500 mt-1">
                            Hoy: ${getCajaDiaActual().toFixed(2)}
                          </p>
                          {editandoCajaDiaActual ? (
                            /* En dos alturas, como la nota de un platillo: el campo y sus dos
                               botones no caben en fila dentro de esta tarjeta. */
                            <div className="mt-2 space-y-sp-1">
                              <input
                                type="number"
                                value={montoAgregarCaja}
                                onChange={(e) => setMontoAgregarCaja(parseFloat(e.target.value) || 0)}
                                className="campo"
                                placeholder="Agregar..."
                                step="0.01"
                                min="0"
                                autoFocus
                                aria-label="Monto a agregar a la caja"
                              />
                              <div className="flex gap-sp-1">
                                <button
                                  onClick={cancelarEdicionCajaDiaActual}
                                  className="btn btn-neutro flex-1"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={confirmarAgregarCajaDiaActual}
                                  className="btn btn-avanzar flex-1"
                                >
                                  Agregar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={iniciarEdicionCajaDiaActual}
                              className="btn mt-2 btn-neutro"
                              title="Agregar dinero a caja de hoy"
                            >
                              💰 Agregar a Caja
                            </button>
                          )}
                        </div>
                        <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="bg-red-50 p-4 sm:p-6 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-meta text-red-600">Total Gastos</p>
                          <p className="text-pantalla font-bold text-red-900">
                            ${getTotalGastos().toFixed(2)}
                          </p>
                        </div>
                        <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 p-4 sm:p-6 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-meta text-purple-600">Utilidad Final</p>
                          <p className="text-pantalla font-bold text-purple-900">
                            ${getTotalUtilidad().toFixed(2)}
                          </p>
                          <p className="text-meta text-purple-500 mt-1">
                            (Ventas + Caja) - Gastos
                          </p>
                        </div>
                        <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-titulo font-semibold text-gray-900 mb-4">Resumen por Día</h3>

                    {/* Tarjetas en telefono. La tabla medía 485 px en una pantalla de 375: la
                        columna «Acciones» —o sea «Ver órdenes»— quedaba fuera, y nada indicaba
                        que hubiera algo a la derecha. */}
                    <div className="sm:hidden space-y-sp-2">
                      {reporteVentas.map((reporte, index) => (
                        <Tarjeta key={index}>
                          <h4 className="text-cuerpo font-semibold text-gray-900">
                            {formatearFecha(reporte.fecha)}
                          </h4>
                          {/* Los gastos del dia no se mostraban en ninguna parte: solo entraban
                              en el total del periodo. Un dia de solo gastos habria sido una
                              tarjeta de ceros. */}
                          <dl className="grid grid-cols-2 gap-sp-1">
                            <Dato etiqueta="Ventas">
                              <span className="text-green-600">${reporte.ventasTotales.toFixed(2)}</span>
                            </Dato>
                            <Dato etiqueta="Gastos">
                              <span className="text-red-600">${reporte.gastosTotales.toFixed(2)}</span>
                            </Dato>
                            <Dato etiqueta="Promociones">
                              <span className="text-blue-600">${(reporte.descuentos || 0).toFixed(2)}</span>
                            </Dato>
                            <Dato etiqueta="Órdenes">{reporte.ordenes}</Dato>
                          </dl>
                          {/* La caja se edita aquí mismo, como en la tabla: es el unico dato de
                              este reporte que se escribe, y mandarlo a otra pantalla seria
                              cambiar un problema de ancho por uno de pasos. */}
                          <div>
                            <p className="text-meta text-gray-500">Caja</p>
                            {campoCaja(reporte)}
                          </div>
                          {/* Un dia de solo caja o solo gastos no tiene ordenes que ver. */}
                          {reporte.ordenes > 0 && (
                            <button
                              className="btn btn-neutro w-full"
                              onClick={() => mostrarOrdenesDeDia(reporte.fecha)}
                            >
                              Ver órdenes
                            </button>
                          )}
                        </Tarjeta>
                      ))}
                      {reporteVentas.length === 0 && (
                        <p className="py-8 text-center text-gray-500 text-cuerpo">
                          No hay movimiento en este período
                        </p>
                      )}
                    </div>

                    <div className="hidden sm:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="text-meta">
                            <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-medium text-gray-900">Fecha</th>
                            <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-medium text-gray-900">Ventas</th>
                            <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-medium text-gray-900">Gastos</th>
                            <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-medium text-gray-900">Caja</th>
                            <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-medium text-gray-900">Órdenes</th>
                            <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-medium text-gray-900">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reporteVentas.map((reporte, index) => (
                            <tr key={index} className="text-meta">
                              <td className="py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap">
                                {formatearFecha(reporte.fecha)}
                              </td>
                              <td className="py-2 sm:py-3 px-3 sm:px-4 text-green-600 font-medium whitespace-nowrap">
                                ${reporte.ventasTotales.toFixed(2)}
                              </td>
                              <td className="py-2 sm:py-3 px-3 sm:px-4 text-red-600 font-medium whitespace-nowrap">
                                ${reporte.gastosTotales.toFixed(2)}
                              </td>
                              <td className="py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap">
                                {campoCaja(reporte)}
                              </td>
                              <td className="py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap">{reporte.ordenes}</td>
                              <td className="py-2 sm:py-3 px-3 sm:px-4">
                                {reporte.ordenes > 0 && (
                                  <button
                                    className="btn btn-neutro"
                                    onClick={() => mostrarOrdenesDeDia(reporte.fecha)}
                                  >
                                    Ver órdenes
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Lo que dio cada promoción. Sin este desglose no se distingue la que trae
                      gente de la que solo regala lo que se habría vendido igual. */}
                  {descuentosPorPromocion.length > 0 && (
                    <div>
                      <h3 className="text-titulo font-semibold text-gray-900 mb-4">Promociones aplicadas</h3>
                      <div className="space-y-sp-2">
                        {descuentosPorPromocion.map((d) => (
                          <Tarjeta key={d._id}>
                            <h4 className="text-cuerpo font-semibold text-gray-900 break-words">{d._id}</h4>
                            <dl className="grid grid-cols-2 gap-sp-1">
                              <Dato etiqueta="Descontado">
                                <span className="text-blue-600">${d.descuento.toFixed(2)}</span>
                              </Dato>
                              <Dato etiqueta="Órdenes">{d.ordenes}</Dato>
                            </dl>
                          </Tarjeta>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Órdenes del día */}
                  {diaSeleccionado && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between gap-sp-1 mb-sp-2">
                        <h3 className="font-bold text-titulo">
                          Órdenes del {formatearFecha(diaSeleccionado)}
                        </h3>
                        <button className="btn btn-neutro" onClick={() => setDiaSeleccionado(null)}>
                          Cerrar
                        </button>
                      </div>

                      {/* Tarjetas en telefono. La tabla eran siete columnas en 577 px sobre una
                          pantalla de 375: se salia mas que el ancho entero, y dentro de una de
                          sus celdas vivian otras tres tablas con su propio arrastre. */}
                      <div className="sm:hidden space-y-sp-2">
                        {agruparOrdenesPorMesa(ordenesDia).map((grupo, idx) => {
                          const g = prepararGrupo(grupo, idx);
                          const abierto = g.id === ordenExpandida;
                          return (
                            <div
                              key={g.id}
                              className={`rounded-xl border p-sp-3 space-y-sp-2 ${
                                grupo.esGrupo ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-sp-1">
                                <div className="min-w-0">
                                  <h4 className="text-cuerpo font-semibold text-gray-900 break-words">
                                    {grupo.mesa}
                                  </h4>
                                  <p className="text-meta text-gray-600 break-words">
                                    {grupo.esGrupo
                                      ? `${grupo.ordenes.length} órdenes · ${grupo.ordenes
                                          .map((o: any) => o.folio)
                                          .join(', ')}`
                                      : `Folio ${g.orden.folio} · ${g.orden.nombreCliente || 'Sin nombre'}`}
                                  </p>
                                </div>
                                <span className="text-meta text-gray-500 whitespace-nowrap">
                                  {new Date(g.orden.fechaHora).toLocaleTimeString('es-MX', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              {/* En un grupo, cada cliente con lo suyo: es la razon de agrupar. */}
                              {grupo.esGrupo ? (
                                <div className="text-meta space-y-1">
                                  {Object.entries(g.resumenPorCliente).map(([cliente, datos]) => (
                                    <div key={cliente} className="flex justify-between gap-sp-1">
                                      <span className="min-w-0 break-words">
                                        <span className="font-medium text-gray-700">{cliente}</span>
                                        <span className="text-gray-500">
                                          {' '}
                                          · {recuento(datos.platillos, datos.productos)}
                                        </span>
                                      </span>
                                      <span className="tabular-nums whitespace-nowrap">
                                        ${datos.total.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-meta text-gray-600">
                                  {recuento(g.totalPlatillos, g.totalProductos)}
                                </p>
                              )}

                              <div className="flex items-end justify-between gap-sp-1 pt-sp-1 border-t border-gray-200">
                                <Dato etiqueta="Total">
                                  <span className="tabular-nums">${grupo.total.toFixed(2)}</span>
                                </Dato>
                                <button
                                  className="btn btn-neutro"
                                  onClick={() => setOrdenExpandida(abierto ? null : g.id)}
                                >
                                  {abierto ? 'Ocultar' : 'Ver detalles'}
                                </button>
                              </div>

                              {abierto && detalleDelGrupo(g)}
                            </div>
                          );
                        })}
                        {ordenesDia.length === 0 && (
                          <p className="py-8 text-center text-gray-500 text-cuerpo">
                            No hay órdenes este día
                          </p>
                        )}
                      </div>

                      <div className="hidden sm:block overflow-x-auto w-full">
                        <table className="min-w-full divide-y divide-gray-200 text-meta">
                          <thead>
                            <tr>
                              <th className="text-left px-2 py-2 font-medium text-gray-900">Folio(s)</th>
                              <th className="text-center px-2 py-2 font-medium text-gray-900">Cliente</th>
                              <th className="text-left px-2 py-2 font-medium text-gray-900">Mesa/Pedido</th>
                              <th className="text-left px-2 py-2 font-medium text-gray-900">Resumen</th>
                              <th className="text-right px-2 py-2 font-medium text-gray-900">Total</th>
                              <th className="text-center px-2 py-2 font-medium text-gray-900">Hora</th>
                              <th className="text-center px-2 py-2 font-medium text-gray-900">Detalles</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agruparOrdenesPorMesa(ordenesDia).map((grupo, idx) => {
                              const g = prepararGrupo(grupo, idx);
                              return (
                                <React.Fragment key={g.id}>
                                  <tr className={`${grupo.esGrupo ? 'bg-blue-50' : ''} border-b-4 border-gray-300`}>
                                    <td className="text-left px-2 py-2">
                                      {grupo.esGrupo ? (
                                        <div className="flex flex-col">
                                          <span className="font-semibold text-blue-700">
                                            {grupo.ordenes.length} órdenes
                                          </span>
                                          <span className="text-meta text-gray-600">
                                            {grupo.ordenes.map((o: any) => o.folio).join(', ')}
                                          </span>
                                        </div>
                                      ) : (
                                        g.orden.folio
                                      )}
                                    </td>
                                    <td className="text-center px-2 py-2">
                                      {grupo.esGrupo ? (
                                        <div className="flex flex-col text-meta">
                                          {Object.keys(g.resumenPorCliente).map((cliente) => (
                                            <span key={cliente} className="text-gray-700 font-medium">
                                              {cliente}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        g.orden.nombreCliente || 'Sin nombre'
                                      )}
                                    </td>
                                    <td className="text-left px-2 py-2">{grupo.mesa}</td>
                                    <td className="text-left px-2 py-2">
                                      {grupo.esGrupo ? (
                                        <div className="flex flex-col text-meta space-y-1">
                                          {Object.entries(g.resumenPorCliente).map(([cliente, datos]) => (
                                            <div key={cliente} className="text-gray-700">
                                              {recuento(datos.platillos, datos.productos)}
                                            </div>
                                          ))}
                                          <div className="font-semibold text-blue-700 pt-1 border-t border-blue-300">
                                            {recuento(g.totalPlatillos, g.totalProductos)}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-gray-700">
                                          {recuento(g.totalPlatillos, g.totalProductos)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="text-right px-2 py-2 tabular-nums">
                                      {grupo.esGrupo ? (
                                        <div className="flex flex-col text-meta space-y-1">
                                          {Object.entries(g.resumenPorCliente).map(([cliente, datos]) => (
                                            <div key={cliente} className="text-gray-700">
                                              ${datos.total.toFixed(2)}
                                            </div>
                                          ))}
                                          <div className="font-bold text-blue-700 pt-1 border-t border-blue-300">
                                            ${grupo.total.toFixed(2)}
                                          </div>
                                        </div>
                                      ) : (
                                        <span>${grupo.total.toFixed(2)}</span>
                                      )}
                                    </td>
                                    <td className="text-center px-2 py-2">
                                      {grupo.esGrupo ? (
                                        <div className="flex flex-col text-meta">
                                          <span>
                                            {new Date(grupo.primeraOrden.fechaHora).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}
                                          </span>
                                          <span className="text-gray-500">-</span>
                                          <span>
                                            {new Date(grupo.ultimaOrden.fechaHora).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}
                                          </span>
                                        </div>
                                      ) : (
                                        new Date(g.orden.fechaHora).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})
                                      )}
                                    </td>
                                    <td className="text-center px-2 py-2">
                                      <button
                                        className="btn btn-neutro"
                                        onClick={() => setOrdenExpandida(g.id === ordenExpandida ? null : g.id)}
                                      >
                                        {g.id === ordenExpandida ? 'Ocultar' : 'Ver detalles'}
                                      </button>
                                    </td>
                                  </tr>
                                  {g.id === ordenExpandida && (
                                    <tr className="border-b-4 border-gray-300">
                                      <td colSpan={7} className="p-0">
                                        {detalleDelGrupo(g)}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Inventory Report */}
              {activeTab === 'inventario' && (
                <div className="space-y-6">
                  <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cuerpo text-orange-600">Valor Total del Inventario</p>
                        <p className="text-pantalla font-bold text-orange-900">
                          ${getTotalInventario().toFixed(2)}
                        </p>
                      </div>
                      <Package className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>

                  {/* Tarjetas en telefono. La tabla eran cinco columnas en 459 px: 84 px fuera
                      de la pantalla, sin nada que avisara de que hubiera mas a la derecha. */}
                  <div className="sm:hidden space-y-sp-2">
                    {reporteInventario.map((item, index) => (
                      <Tarjeta key={index}>
                        <div className="flex items-start justify-between gap-sp-1">
                          <h4 className="text-cuerpo font-semibold text-gray-900 break-words">
                            {item.producto.nombre}
                          </h4>
                          {estadoInventario(item)}
                        </div>
                        <dl className="grid grid-cols-3 gap-sp-1">
                          <Dato etiqueta="Cantidad">{item.producto.cantidad}</Dato>
                          <Dato etiqueta="Costo">${item.producto.costo.toFixed(2)}</Dato>
                          <Dato etiqueta="Valor">${item.valorTotal.toFixed(2)}</Dato>
                        </dl>
                      </Tarjeta>
                    ))}
                    {reporteInventario.length === 0 && (
                      <p className="py-8 text-center text-gray-500 text-cuerpo">
                        No hay productos en el inventario
                      </p>
                    )}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Producto</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Cantidad</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Costo Unit.</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Valor Total</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reporteInventario.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-4 font-medium">{item.producto.nombre}</td>
                            <td className="py-3 px-4">{item.producto.cantidad}</td>
                            <td className="py-3 px-4">${item.producto.costo.toFixed(2)}</td>
                            <td className="py-3 px-4 font-medium">${item.valorTotal.toFixed(2)}</td>
                            <td className="py-3 px-4">{estadoInventario(item)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Products Sold Report */}
              {activeTab === 'productos' && (
                <>
                  <div className="sm:hidden space-y-sp-2">
                    {productosVendidos.map((producto, index) => (
                      <Tarjeta key={index}>
                        <h4 className="text-cuerpo font-semibold text-gray-900 break-words">
                          {producto.nombre}
                        </h4>
                        <dl className="grid grid-cols-2 gap-sp-1">
                          <Dato etiqueta="Vendidas">{producto.cantidadVendida}</Dato>
                          <Dato etiqueta="Total">
                            <span className="text-green-600">${producto.totalVendido.toFixed(2)}</span>
                          </Dato>
                        </dl>
                      </Tarjeta>
                    ))}
                    {productosVendidos.length === 0 && (
                      <p className="py-8 text-center text-gray-500 text-cuerpo">
                        No hay productos vendidos en este periodo
                      </p>
                    )}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Producto</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Cantidad Vendida</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Total Vendido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosVendidos.map((producto, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-4 font-medium">{producto.nombre}</td>
                            <td className="py-3 px-4">{producto.cantidadVendida}</td>
                            <td className="py-3 px-4 text-green-600 font-medium">
                              ${producto.totalVendido.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Expenses Report */}
              {activeTab === 'gastos' && (
                <>
                  {/* Seis columnas en 524 px: 246 px fuera, y la que se caia era «Acciones»,
                      o sea el boton de borrar el gasto. */}
                  <div className="sm:hidden space-y-sp-2">
                    {reporteGastos.map((gasto, index) => (
                      <Tarjeta key={index}>
                        <div>
                          <h4 className="text-cuerpo font-semibold text-gray-900 break-words">
                            {gasto.nombre}
                          </h4>
                          <p className="text-meta text-gray-500">
                            {gasto.nombreTipoGasto} · {new Date(gasto.fecha).toLocaleDateString()}
                          </p>
                        </div>
                        {gasto.descripcion && (
                          <p className="text-cuerpo text-gray-700 break-words">{gasto.descripcion}</p>
                        )}
                        <div className="flex items-end justify-between gap-sp-1">
                          <Dato etiqueta="Monto">
                            <span className="text-red-600">${gasto.gastoTotal?.toFixed(2) || '0.00'}</span>
                          </Dato>
                          {botonBorrarGasto(gasto)}
                        </div>
                      </Tarjeta>
                    ))}
                    {reporteGastos.length === 0 && (
                      <p className="py-8 text-center text-gray-500 text-cuerpo">
                        No hay gastos registrados en este periodo
                      </p>
                    )}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Fecha</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Nombre</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Tipo</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Descripcion</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Monto</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reporteGastos.map((gasto, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-4">{new Date(gasto.fecha).toLocaleDateString()}</td>
                            <td className="py-3 px-4 font-medium">{gasto.nombre}</td>
                            <td className="py-3 px-4">{gasto.nombreTipoGasto}</td>
                            <td className="py-3 px-4">{gasto.descripcion}</td>
                            <td className="py-3 px-4 text-red-600 font-medium">
                              ${gasto.gastoTotal?.toFixed(2) || '0.00'}
                            </td>
                            <td className="py-3 px-4">{botonBorrarGasto(gasto)}</td>
                          </tr>
                        ))}
                        {reporteGastos.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500">
                              No hay gastos registrados en este periodo
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Expense Modal */}
      {showGastoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-titulo font-semibold text-gray-900">Crear Nuevo Gasto</h3>
              <button
                onClick={() => setShowGastoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-cuerpo font-medium text-gray-700 mb-2">
                  Nombre del Gasto
                </label>
                <input
                  type="text"
                  value={nuevoGasto.nombre}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, nombre: e.target.value })}
                  className="campo"
                  placeholder="Ej: Compra de ingredientes"
                />
              </div>

              <div>
                <label className="block text-cuerpo font-medium text-gray-700 mb-2">
                  Tipo de Gasto
                </label>
                <select
                  value={nuevoGasto.idTipoGasto}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, idTipoGasto: e.target.value })}
                  className="campo"
                >
                  <option value="">Selecciona un tipo</option>
                  {tiposGasto.map((tipo) => (
                    <option key={tipo._id} value={tipo._id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-cuerpo font-medium text-gray-700 mb-2">
                  Monto
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={nuevoGasto.gastoTotal}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, gastoTotal: parseFloat(e.target.value) || 0 })}
                  className="campo"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-cuerpo font-medium text-gray-700 mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={nuevoGasto.descripcion}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, descripcion: e.target.value })}
                  className="campo"
                  rows={3}
                  placeholder="Detalles adicionales del gasto..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowGastoModal(false)}
                className="btn flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateGasto}
                disabled={savingGasto}
                className="btn flex-1 btn-primario"
              >
                {savingGasto ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Crear Gasto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Reportes;