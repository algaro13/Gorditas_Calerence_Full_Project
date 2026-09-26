import React, { useState, useEffect } from 'react';
import { Aviso } from '../components/Aviso';
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
  ventasTotales: number;
  gastosTotales: number;
  utilidad: number;
  ordenes: number;
  montoCaja?: number; // Nuevo campo para el monto de caja
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
  const [activeTab, setActiveTab] = useState('ventas');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  
  const [reporteVentas, setReporteVentas] = useState<ReporteVentas[]>([]);
  const [reporteInventario, setReporteInventario] = useState<ReporteInventario[]>([]);
  const [productosVendidos, setProductosVendidos] = useState<ProductoVendido[]>([]);
  const [reporteGastos, setReporteGastos] = useState<Gasto[]>([]);
  
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [platillos, setPlatillos] = useState<any[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
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

  // Cargar datos de caja desde localStorage
  const cargarMontoCaja = () => {
    const cajaDatos = localStorage.getItem('montoCajaPorFecha');
    if (cajaDatos) {
      setMontoCajaPorFecha(JSON.parse(cajaDatos));
    }
  };

  // Guardar monto de caja en localStorage
  const guardarMontoCaja = (fecha: string, monto: number) => {
    const nuevosMontos = { ...montoCajaPorFecha, [fecha]: monto };
    setMontoCajaPorFecha(nuevosMontos);
    localStorage.setItem('montoCajaPorFecha', JSON.stringify(nuevosMontos));
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
        guardarMontoCaja(editandoCaja, montoTemporal);
        setEditandoCaja(null);
        setMontoTemporal(0);
      } catch (error) {
        console.error('Error al guardar el monto de caja:', error);
      } finally {
        setGuardandoCaja(null);
      }
    }
  };

  // Funciones para manejar la caja del día actual (recuadro superior)
  const obtenerFechaActualUTC = (): string => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0]; // YYYY-MM-DD en UTC
  };

  const iniciarEdicionCajaDiaActual = () => {
    const fechaActual = obtenerFechaActualUTC();
    setEditandoCajaDiaActual(true);
    setMontoAgregarCaja(0);
  };

  const cancelarEdicionCajaDiaActual = () => {
    setEditandoCajaDiaActual(false);
    setMontoAgregarCaja(0);
  };

  const confirmarAgregarCajaDiaActual = async () => {
    const fechaActual = obtenerFechaActualUTC();
    const montoActual = montoCajaPorFecha[fechaActual] || 0;
    const nuevoMonto = montoActual + montoAgregarCaja;
    
    
    guardarMontoCaja(fechaActual, nuevoMonto);
    setEditandoCajaDiaActual(false);
    setMontoAgregarCaja(0);
  };

  useEffect(() => {
    cargarMontoCaja();
  }, []);

  useEffect(() => {
    // Cerrar la sección de "Ver órdenes" cuando cambian los filtros
    setDiaSeleccionado(null);
    setOrdenExpandida(null);
    loadReports();
  }, [activeTab, fechaInicio, fechaFin]);

  const loadReports = async () => {
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

            setOrdenes(ordenes);
            setProductos(productos);
            setPlatillos(platillos);
            setExtras(extras);

            if (ventasPorDia.length > 0) {
              // Obtener los gastos del mismo período
              const gastosRes = await apiService.getReporteGastos(fechaInicio, fechaFin);
              const gastosPorDia = gastosRes.success 
                ? (gastosRes.data.gastosPorDia || []).reduce((acc: {[key: string]: number}, gasto: any) => {
                    acc[gasto._id] = gasto.gastos || 0;
                    return acc;
                  }, {})
                : {};

              // Procesar cada venta
              for (const venta of ventasPorDia) {
                const fecha = venta._id;
                const ventasTotales = venta.ventas || 0;
                const gastosTotales = gastosPorDia[fecha] || 0;
                
                ventasFormateadas.push({
                  fecha,
                  ventasTotales,
                  gastosTotales,
                  utilidad: ventasTotales - gastosTotales,
                  ordenes: venta.ordenes || 0
                });
              }

              // Ordenar por fecha descendente
              ventasFormateadas.sort((a, b) => 
                new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
              );
            }

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
            setProductosVendidos(todosProductos);
          }
          break;
          
        case 'gastos':
          const gastosRes = await apiService.getReporteGastos(fechaInicio, fechaFin);
          if (gastosRes.success) {
            setReporteGastos(gastosRes.data.gastos);
          }
          break;
      }
    } catch (error) {
      setError('Error cargando reportes');
      console.error('Error en loadReports:', error);
    } finally {
      setLoading(false);
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
    a.download = `reporte_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    const fechaActual = obtenerFechaActualUTC();
    return montoCajaPorFecha[fechaActual] || 0;
  };

  const getTotalIngresosConCaja = () => {
    return getTotalVentas() + getTotalCaja();
  };

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

  // Función auxiliar para obtener fecha en formato YYYY-MM-DD usando UTC
  // Esta función debe replicar EXACTAMENTE la lógica del backend MongoDB:
  // $dateToString: { format: '%Y-%m-%d', date: '$fechaHora' } (sin timezone = UTC)
  const obtenerFechaDelDia = (fecha: string | Date): string => {
    const fechaObj = new Date(fecha);
    // Verificar que la fecha sea válida
    if (isNaN(fechaObj.getTime())) {
      console.warn(`Fecha inválida recibida: ${fecha}`);
      return '';
    }
    // Obtener la fecha en la zona horaria de Zacatecas (America/Mexico_City)
    // Esto agrupa los pedidos por día local, no UTC
    const fechaLocalStr = fechaObj.toLocaleString('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    // El formato en-CA da YYYY-MM-DD
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

    const platillosGrupo = platillos.filter((pl) =>
      grupo.ordenes.some((o: any) => {
        if (!pl.idSuborden || !o._id) return false;
        if (pl.idOrden === o._id) return true;
        return o._id.slice(0, 7) === pl.idSuborden.slice(0, 7);
      })
    );

    const platillosConExtras = platillosGrupo.map((platillo) => ({
      ...platillo,
      extras: extras.filter((extra) => extra.idOrdenDetallePlatillo === platillo._id),
    }));

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
        const platillosOrden = platillosGrupo.filter((pl: any) => {
          if (!pl.idSuborden || !o._id) return false;
          if (pl.idOrden === o._id) return true;
          return o._id.slice(0, 7) === pl.idSuborden.slice(0, 7);
        });
        resumenPorCliente[nombreCliente].platillos += platillosOrden.reduce(
          (sum: number, p: any) => sum + p.cantidad,
          0
        );
        resumenPorCliente[nombreCliente].total += o.total;
      });
    }

    // Los extras que no cuelgan de ningun platillo de este grupo pero si de sus ordenes.
    const extrasIndependientes = extras.filter((extra) => {
      const pertenece = platillosConExtras.some((pl) =>
        pl.extras?.some((e: any) => e._id === extra._id)
      );
      return (
        !pertenece &&
        grupo.ordenes.some(
          (o: any) =>
            extra.idOrden === o._id ||
            (o._id &&
              extra.idOrdenDetallePlatillo &&
              extra.idOrdenDetallePlatillo.slice(0, 7) === o._id.slice(0, 7))
        )
      );
    });

    return {
      grupo,
      id: `grupo-${idx}`,
      orden: grupo.primeraOrden,
      productosGrupo,
      platillosConExtras,
      totalProductos,
      totalPlatillos,
      resumenPorCliente,
      extrasIndependientes,
      importePlatillos: platillosConExtras.reduce((sum, pl) => {
        const extrasTotal =
          pl.extras?.reduce((e: number, x: any) => e + (x.importe || 0), 0) || 0;
        return sum + (pl.importe || 0) + extrasTotal;
      }, 0),
      importeProductos: productosGrupo.reduce((sum: number, p: any) => sum + p.importe, 0),
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

      {g.extrasIndependientes.length > 0 && (
        <div>
          <h4 className="font-semibold mb-1">Extras adicionales</h4>
          <div className="divide-y divide-gray-200 text-purple-700">
            {g.extrasIndependientes.map((extra) => (
              <React.Fragment key={extra._id}>
                {linea(extra.nombreExtra, extra.cantidad, `$${extra.importe?.toFixed(2) || '0.00'}`)}
              </React.Fragment>
            ))}
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
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="campo sm:w-auto"
                  />
                  <span className="hidden sm:block text-gray-500">hasta</span>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
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
                            <div className="flex items-center space-x-2 mt-2">
                              <input
                                type="number"
                                value={montoAgregarCaja}
                                onChange={(e) => setMontoAgregarCaja(parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-meta"
                                placeholder="Agregar..."
                                step="0.01"
                                min="0"
                                autoFocus
                              />
                              <button
                                onClick={confirmarAgregarCajaDiaActual}
                                className="btn btn-neutro"
                                title="Agregar a caja de hoy"
                              >
                                ✓ Agregar
                              </button>
                              <button
                                onClick={cancelarEdicionCajaDiaActual}
                                className="btn btn-destructivo"
                                title="Cancelar"
                              >
                                ✕
                              </button>
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
                          <dl className="grid grid-cols-2 gap-sp-2">
                            <Dato etiqueta="Ventas">
                              <span className="text-green-600">${reporte.ventasTotales.toFixed(2)}</span>
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
                          <button
                            className="btn btn-neutro w-full"
                            onClick={() => mostrarOrdenesDeDia(reporte.fecha)}
                          >
                            Ver órdenes
                          </button>
                        </Tarjeta>
                      ))}
                      {reporteVentas.length === 0 && (
                        <p className="py-8 text-center text-gray-500 text-cuerpo">
                          No hay ventas en este período
                        </p>
                      )}
                    </div>

                    <div className="hidden sm:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="text-meta">
                            <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-medium text-gray-900">Fecha</th>
                            <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-medium text-gray-900">Ventas</th>
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
                              <td className="py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap">
                                {campoCaja(reporte)}
                              </td>
                              <td className="py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap">{reporte.ordenes}</td>
                              <td className="py-2 sm:py-3 px-3 sm:px-4">
                                <button
                                  className="btn btn-neutro"
                                  onClick={() => mostrarOrdenesDeDia(reporte.fecha)}
                                >
                                  Ver órdenes
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
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