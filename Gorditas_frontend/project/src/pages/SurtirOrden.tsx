import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  CheckCircle, 
  Users,
  Timer,
  Package,
  RefreshCw,
  StickyNote,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { apiService } from '../services/api';
import { Orden, OrdenDetalleProducto, OrdenDetallePlatillo, MesaAgrupada } from '../types';

interface OrdenConDetalles extends Orden {
  productos?: OrdenDetalleProducto[];
  platillos?: OrdenDetallePlatillo[];
  extras?: any[]; // Add extras property
}

const SurtirOrden: React.FC = () => {
  const [ordenes, setOrdenes] = useState<OrdenConDetalles[]>([]);
  const [mesasAgrupadas, setMesasAgrupadas] = useState<MesaAgrupada[]>([]);
  const [expandedMesas, setExpandedMesas] = useState<Set<number>>(new Set());
  const [selectedOrden, setSelectedOrden] = useState<OrdenConDetalles | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [markingItem, setMarkingItem] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasNewOrders, setHasNewOrders] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
    // Set up polling for real-time updates - more frequent for better responsiveness
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Function to group orders by table
  const groupOrdersByTable = (ordenes: OrdenConDetalles[]): MesaAgrupada[] => {
    const grouped: { [idMesa: number]: MesaAgrupada } = {};
    
    ordenes.forEach(orden => {
      const idMesa = orden.idMesa || 0; // 0 for orders without table
      const nombreMesa = orden.nombreMesa || 'Sin Mesa';
      
      if (!grouped[idMesa]) {
        grouped[idMesa] = {
          idMesa,
          nombreMesa,
          ordenes: [],
          totalOrdenes: 0,
          totalMonto: 0,
          clientes: {}
        };
      }
      
      grouped[idMesa].ordenes.push(orden);
      grouped[idMesa].totalOrdenes += 1;
      grouped[idMesa].totalMonto += orden.total;
      
      // Agrupación por cliente eliminada
    });
    
    // Mantener nombres de mesas como están (sin procesar)
    const result = Object.values(grouped);
    
    // Ordenar mesas: primero por la orden más antigua de cada mesa (más antiguas arriba)
    return result.sort((a, b) => {
      // Encontrar la orden más antigua de cada mesa
      const fechaMasAntiguaA = Math.min(...a.ordenes.map(o => new Date(o.fechaHora || o.fecha || Date.now()).getTime()));
      const fechaMasAntiguaB = Math.min(...b.ordenes.map(o => new Date(o.fechaHora || o.fecha || Date.now()).getTime()));
      
      // Ordenar por fecha más antigua primero (más antiguas arriba)
      return fechaMasAntiguaA - fechaMasAntiguaB;
    });
  };

  const toggleMesaExpansion = (idMesa: number) => {
    const newExpanded = new Set(expandedMesas);
    if (newExpanded.has(idMesa)) {
      newExpanded.delete(idMesa);
    } else {
      newExpanded.add(idMesa);
    }
    setExpandedMesas(newExpanded);
  };

  // Función para mostrar el nombre de mesa de una orden individual
  const getMostrarNombreMesaOrden = (orden: OrdenConDetalles): string => {
    if (!orden.nombreMesa) return 'Sin Mesa';
    
    // Mostrar el nombre de la mesa tal como está (sin modificar)
    return orden.nombreMesa;
  };

  const loadData = async () => {
    try {
  const ordenesRes = await apiService.getOrdenesActivas();

      if (ordenesRes.success) {
        let ordenesArray: Orden[] = [];
        if (Array.isArray(ordenesRes.data.ordenes)) {
          ordenesArray = ordenesRes.data.ordenes;
        } else if (Array.isArray(ordenesRes.data)) {
          ordenesArray = ordenesRes.data;
        }
        // Mostrar solo órdenes en estado 'Recepcion' o 'Pendiente' (recién hechas)
        const ordenesParaSurtir = ordenesArray.filter((orden: Orden) => 
          ['Recepcion', 'Pendiente'].includes(orden.estatus)
        );
        
        // Cargar detalles de cada orden automáticamente
        const ordenesConDetalles = await Promise.all(
          ordenesParaSurtir.map(async (orden) => {
            try {
              const response = await apiService.getOrdenDetails(orden._id!);
              if (response.success) {
                const data = response.data;
                
                // Ordenar platillos por más recientes primero (basado en createdAt o _id)
                const platillosOrdenados = (data.platillos || []).sort((a: any, b: any) => {
                  const dateA = new Date(a.createdAt || a._id).getTime();
                  const dateB = new Date(b.createdAt || b._id).getTime();
                  return dateB - dateA; // Más recientes primero
                });
                
                // Ordenar productos por más recientes primero
                const productosOrdenados = (data.productos || []).sort((a: any, b: any) => {
                  const dateA = new Date(a.createdAt || a._id).getTime();
                  const dateB = new Date(b.createdAt || b._id).getTime();
                  return dateB - dateA; // Más recientes primero
                });
                
                return {
                  ...orden,
                  platillos: platillosOrdenados,
                  productos: productosOrdenados,
                  extras: data.extras || []
                };
              }
              return orden;
            } catch (error) {
              return orden;
            }
          })
        );
        
        // Filtrar órdenes que realmente necesitan preparación en cocina
        const ordenesQueNecesitanPreparacion = ordenesConDetalles.filter((orden: any) => {
          const platillos = orden.platillos || [];
          const productos = orden.productos || [];
          
          // Si no tiene platillos y solo tiene productos, no necesita preparación
          if (platillos.length === 0 && productos.length > 0) {
            return false;
          }
          
          // Si todos los platillos están entregados y solo quedan productos, no necesita preparación
          const todosLosPlatillosEntregados = platillos.length > 0 && platillos.every((p: any) => p.entregado);
          const tieneProductosPendientes = productos.some((p: any) => !p.entregado);
          
          if (todosLosPlatillosEntregados && tieneProductosPendientes && platillos.length > 0) {
            return false;
          }
          
          return true;
        });
        
        // Ordenar órdenes por más recientes primero (basado en fechaHora o fecha)
        const ordenesOrdenadas = ordenesQueNecesitanPreparacion.sort((a: any, b: any) => {
          const dateA = new Date(a.fechaHora || a.fecha || 0).getTime();
          const dateB = new Date(b.fechaHora || b.fecha || 0).getTime();
          return dateB - dateA; // Más recientes primero
        });
        
        // Detectar nuevas órdenes comparando con el estado actual
        const currentOrderIds = ordenes.map(o => o._id);
        const newOrderIds = ordenesOrdenadas.map((o: any) => o._id);
        const hasNewData = newOrderIds.some((id: any) => !currentOrderIds.includes(id));
        
        if (hasNewData && ordenes.length > 0) {
          setHasNewOrders(true);
          setSuccess('Nuevas órdenes detectadas');
          setTimeout(() => {
            setHasNewOrders(false);
            setSuccess('');
          }, 5000);
        }
        
        setOrdenes(ordenesOrdenadas);
        setLastUpdateTime(new Date());
        
        // Group orders by table
        const grouped = groupOrdersByTable(ordenesQueNecesitanPreparacion);
        setMesasAgrupadas(grouped);
      }
    } catch (error) {
      setError('Error cargando órdenes');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkItemAsReady = async (itemId: string, type: 'producto' | 'platillo' | 'extra') => {
    if (!selectedOrden) return;

    setMarkingItem(itemId);
    try {
      let response;
      if (type === 'producto') {
        response = await apiService.markProductoListo(itemId);
      } else if (type === 'platillo') {
        response = await apiService.markPlatilloListo(itemId);
      } else if (type === 'extra') {
        // Use updateExtraStatus to mark extra as ready
        response = await apiService.updateExtraStatus(itemId, 'listo');
      }

      if (response && response.success) {
        // Update local state
        if (type === 'producto') {
          setSelectedOrden(prev => ({
            ...prev!,
            productos: prev!.productos?.map(p => 
              p._id === itemId ? { ...p, listo: true } : p
            )
          }));
        } else if (type === 'platillo') {
          setSelectedOrden(prev => ({
            ...prev!,
            platillos: prev!.platillos?.map(p => 
              p._id === itemId ? { ...p, listo: true } : p
            )
          }));
        } else if (type === 'extra') {
          // Update both the general extras list and the nested extras in platillos
          setSelectedOrden(prev => ({
            ...prev!,
            extras: prev!.extras?.map((e: any) => 
              e._id === itemId ? { ...e, listo: true } : e
            ),
            platillos: prev!.platillos?.map(p => ({
              ...p,
              extras: p.extras?.map((e: any) => 
                e._id === itemId ? { ...e, listo: true } : e
              )
            }))
          }));
        }

        setSuccess('Item marcado como listo');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error marcando item como listo');
      }
    } catch (error) {
      setError('Error marcando item como listo');
    } finally {
      setMarkingItem(null);
    }
  };

  const handleIniciarPreparacion = async (ordenId: string) => {
    setUpdating(ordenId);
    setError('');
    try {
      // Usar la misma API que Dashboard para marcar como Surtida
      const response = await apiService.updateOrdenStatus(ordenId, 'Surtida');
      if (response.success) {
        setSuccess('Orden marcada como Surtida');
        await loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error al marcar como Surtida');
      }
    } catch (error) {
      setError('Error al marcar como Surtida');
    } finally {
      setUpdating(null);
    }
  };

  const handleSurtirTodasLasOrdenes = async (mesa: MesaAgrupada) => {
    setUpdating(`mesa-${mesa.idMesa}`);
    setError('');
    try {
      // Obtener todas las órdenes de la mesa que no estén ya surtidas
      const ordenesAPreparar = mesa.ordenes.filter(orden => 
        orden.estatus === 'Recepcion' || orden.estatus === 'Pendiente'
      );
      
      // Marcar todas las órdenes como Surtida
      const promises = ordenesAPreparar.map(orden => 
        apiService.updateOrdenStatus(orden._id!, 'Surtida')
      );
      
      const responses = await Promise.all(promises);
      const todosExitosos = responses.every(response => response.success);
      
      if (todosExitosos) {
        setSuccess(`Todas las órdenes de ${mesa.nombreMesa} han sido surtidas`);
        await loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error al surtir algunas órdenes');
      }
    } catch (error) {
      setError('Error al surtir las órdenes de la mesa');
    } finally {
      setUpdating(null);
    }
  };

  const handleCompletarOrden = async (ordenId: string) => {
    setUpdating(ordenId);
    setError('');
    
    try {
      const response = await apiService.updateOrdenStatus(ordenId, 'Surtida');
      
      if (response.success) {
        setSuccess('Orden surtida exitosamente');
        await loadData(); // Refresh the list
        setSelectedOrden(null); // Close details view
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error al completar la orden');
      }
    } catch (error) {
      setError('Error al completar la orden');
    } finally {
      setUpdating(null);
    }
  };

  const isOrderReadyToComplete = (orden: OrdenConDetalles) => {
    const allProductsReady = orden.productos?.every(p => p.listo) ?? true;
    const allDishesReady = orden.platillos?.every(p => p.listo) ?? true;
    
    // Check if all extras are ready (both general extras and extras within platillos)
    const allGeneralExtrasReady = orden.extras?.every((e: any) => e.listo) ?? true;
    const allPlatilloExtrasReady = orden.platillos?.every(p => 
      p.extras?.every((e: any) => e.listo) ?? true
    ) ?? true;
    
    return allProductsReady && allDishesReady && allGeneralExtrasReady && allPlatilloExtrasReady;
  };

  const getTimeElapsed = (fecha: Date) => {
    const now = new Date();
    const orderTime = new Date(fecha);
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  const getPriorityColor = (fecha: Date) => {
    const now = new Date();
    const orderTime = new Date(fecha);
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes > 40) return 'border-red-500 bg-red-50';
    if (diffInMinutes > 20) return 'border-yellow-500 bg-yellow-50';
    return 'border-green-500 bg-green-50';
  };

  const getMesaPriorityColor = (mesa: MesaAgrupada) => {
    // Encontrar la orden más antigua de la mesa
    let oldestTime = new Date();
    mesa.ordenes.forEach(orden => {
      const orderTime = new Date(orden.fechaHora ?? orden.fecha ?? new Date());
      if (orderTime < oldestTime) {
        oldestTime = orderTime;
      }
    });

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - oldestTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes > 40) return 'border-red-500';
    if (diffInMinutes > 20) return 'border-yellow-500';
    return 'border-green-500';
  };


  // Pantalla de carga global: bloquea scroll cuando updating está activo
  useEffect(() => {
    if (updating) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [updating]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-orange-600 mb-6"></div>
          <span className="text-white text-pantalla font-bold">Cargando órdenes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
      {/* Overlay de carga global al procesar órdenes (pantalla de carga) */}
      {updating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 cursor-wait select-none" style={{ pointerEvents: 'all' }}>
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-orange-500 mb-8"></div>
            <span className="text-white text-pantalla font-bold drop-shadow-lg">Procesando órdenes, por favor espera...</span>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-titulo sm:text-pantalla font-bold text-gray-900">Órdenes Recientes</h1>
          <p className="text-cuerpo text-gray-600 mt-1">Gestiona las órdenes que acaban de hacerse y están listas para preparar</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-white rounded-lg px-3 sm:px-4 py-2 shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-orange-600" />
              <span className="text-meta font-medium text-gray-700">
                {ordenes.length} órdenes pendientes
              </span>
            </div>
          </div>
          {hasNewOrders && (
            <div className="bg-green-100 rounded-lg px-3 py-2 shadow-sm border border-green-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-meta font-medium text-green-700">
                  Nuevas órdenes
                </span>
              </div>
            </div>
          )}
          <div className="text-meta text-gray-500">
           {lastUpdateTime.toLocaleTimeString('es-ES')}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {mesasAgrupadas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-titulo font-semibold text-gray-900 mb-2">No hay órdenes para preparar</h2>
            <p className="text-gray-600">No hay órdenes pendientes o en recepción</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {mesasAgrupadas.map((mesa) => {
            const mesaPriorityColor = getMesaPriorityColor(mesa);
            
            // Encontrar la orden más antigua de la mesa para mostrar el tiempo
            let oldestTime = new Date();
            mesa.ordenes.forEach(orden => {
              const orderTime = new Date(orden.fechaHora ?? orden.fecha ?? new Date());
              if (orderTime < oldestTime) {
                oldestTime = orderTime;
              }
            });
            const timeElapsed = getTimeElapsed(oldestTime);
            
            return (
              <div key={mesa.idMesa} className={`bg-white rounded-xl shadow-sm border-2 ${mesaPriorityColor}`}>
                {/* Mesa Header - Clickable to expand/collapse */}
                <div 
                  className="p-2 sm:p-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleMesaExpansion(mesa.idMesa)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-titulo font-semibold text-gray-900 break-words">
                          {mesa.nombreMesa}
                        </h3>
                        <p className="text-meta text-gray-600 break-words">
                          {mesa.totalOrdenes} {mesa.totalOrdenes === 1 ? 'orden' : 'órdenes'}
                        </p>
                        {/* Lista de clientes de la mesa */}
                        {mesa.ordenes.length > 0 && (
                          <div className="mt-1">
                            <span className="text-meta sm:text-titulo text-gray-500 font-medium">Cliente(s): </span>
                            <span className="text-meta sm:text-titulo text-gray-700">
                              {Array.from(new Set(mesa.ordenes.map(o => o.nombreCliente || 'Sin nombre'))).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center space-x-1 text-meta text-gray-600 mb-1">
                          <Timer className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="font-medium">{timeElapsed}</span>
                        </div>
                        {/* Total eliminado - no mostrar costos */}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Botón para surtir todas las órdenes */}
                        {mesa.ordenes.some(orden => orden.estatus === 'Recepcion' || orden.estatus === 'Pendiente') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSurtirTodasLasOrdenes(mesa);
                            }}
                            disabled={updating === `mesa-${mesa.idMesa}`}
                            className="btn bg-blue-600 text-white rounded-full hover:bg-blue-700"
                          >
                            {updating === `mesa-${mesa.idMesa}` ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                <span>Surtiendo...</span>
                              </>
                            ) : (
                              <>
                                <ChefHat className="w-3 h-3 mr-1" />
                                <span>Surtir Todas</span>
                              </>
                            )}
                          </button>
                        )}
                        <div className="flex items-center justify-between sm:justify-end">
                          {expandedMesas.has(mesa.idMesa) ? (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              {expandedMesas.has(mesa.idMesa) && (
                <div className="p-2 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {mesa.ordenes.map((orden) => {
                      const horaOrden = orden.fechaHora ?? orden.fecha ?? new Date();
                      const timeElapsed = getTimeElapsed(horaOrden);
                      const priorityColor = getPriorityColor(horaOrden);
                      return (
                        <div
                          key={orden._id}
                          className={`bg-white rounded-lg border p-2 sm:p-5 ${priorityColor}`}
                        >
                          {/* Nombre del cliente arriba de la orden */}
                          <div className="mb-1">
                            <span className="text-cuerpo sm:text-titulo font-semibold text-gray-700">Cliente: </span>
                            <span className="text-cuerpo sm:text-titulo text-gray-900">{orden.nombreCliente || 'Sin nombre'}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                            <div className="min-w-0 flex-1">
                              {orden.notas && (
                                <div className="flex items-start space-x-1 mt-1">
                                  <StickyNote className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-meta text-gray-700 italic break-words">
                                    {orden.notas}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="text-left sm:text-right flex-shrink-0">
                              <div className="flex items-center space-x-1 text-meta text-gray-600 mb-1">
                                <Timer className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span>{timeElapsed}</span>
                              </div>
                              <span className={`inline-block px-2 py-1 text-meta font-medium rounded-full ${
                                orden.estatus === 'Recepcion' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : orden.estatus === 'Pendiente'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                <span className="hidden sm:inline">
                                  {orden.estatus === 'Recepcion' 
                                    ? 'Lista para preparar' 
                                    : orden.estatus === 'Pendiente'
                                    ? 'Pendiente de verificar'
                                    : 'En preparación'}
                                </span>
                                <span className="sm:hidden">
                                  {orden.estatus === 'Recepcion' 
                                    ? 'Lista' 
                                    : orden.estatus === 'Pendiente'
                                    ? 'Pendiente'
                                    : 'Preparando'}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Resumen de la orden */}
                          <div className="bg-gray-50 rounded-lg p-2 sm:p-3 mb-4 space-y-2">
                            <h6 className="text-titulo font-semibold text-gray-900 mb-2">Resumen de la orden:</h6>
                            {/* Platillos */}
                            {orden.platillos && orden.platillos.filter((platillo: any) => platillo.listo !== true && platillo.entregado !== true).length > 0 && (
                              <div className="space-y-1">
                                {orden.platillos.filter((platillo: any) => platillo.listo !== true && platillo.entregado !== true).map((platillo: any, index: number) => (
                                  <div key={index} className="flex justify-between items-start text-titulo">
                                    <div className="flex-1 min-w-0">
                                      <span className="font-semibold text-gray-800">
                                        {platillo.cantidad}x {platillo.nombrePlatillo || platillo.platillo}
                                      </span>
                                      <span className="text-gray-600 ml-1">
                                        ({platillo.nombreGuiso || platillo.guiso})
                                      </span>
                                      {platillo.notas && (
                                        <div className="text-blue-600 italic mt-1">
                                          Notas: {platillo.notas}
                                        </div>
                                      )}
                                      {/* Extras del platillo - solo mostrar los no listos ni entregados */}
                                      {platillo.extras && platillo.extras.filter((extra: any) => extra.listo !== true && extra.entregado !== true).length > 0 && (
                                        <div className="ml-2 mt-1">
                                          {platillo.extras.filter((extra: any) => extra.listo !== true && extra.entregado !== true).map((extra: any, extraIndex: number) => (
                                            <div key={extraIndex} className="text-purple-600 text-titulo">
                                              + {extra.cantidad}x {extra.nombreExtra}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    {/* Costo eliminado */}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Productos */}
                            {orden.productos && orden.productos.filter((producto: any) => producto.listo !== true && producto.entregado !== true).length > 0 && (
                              <div className="space-y-1 pt-2 border-t border-gray-200">
                                {orden.productos.filter((producto: any) => producto.listo !== true && producto.entregado !== true).map((producto: any, index: number) => (
                                  <div key={index} className="flex justify-between items-center text-titulo">
                                    <span className="font-semibold text-gray-800">
                                      {producto.cantidad}x {producto.nombreProducto || producto.producto}
                                    </span>
                                    {/* Costo eliminado */}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Mensaje si no hay items pendientes */}
                            {(!orden.platillos || orden.platillos.filter((p: any) => !p.entregado).length === 0) && 
                             (!orden.productos || orden.productos.filter((p: any) => !p.entregado).length === 0) && (
                              <div className="text-titulo text-gray-500 italic">
                                Todos los items han sido entregados
                              </div>
                            )}
                          </div>
                          {orden.estatus === 'Recepcion' || orden.estatus === 'Pendiente' ? (
                            <div className="space-y-2">
                              <button
                                onClick={() => handleIniciarPreparacion(orden._id!)}
                                disabled={updating === orden._id || orden.estatus === 'Pendiente'}
                                className="btn w-full bg-blue-600 text-white hover:bg-blue-700"
                              >
                                {updating === orden._id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2 flex-shrink-0"></div>
                                    <span>Iniciando...</span>
                                  </>
                                ) : (
                                  <>
                                    <ChefHat className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                                    <span>
                                      {orden.estatus === 'Pendiente' ? 'Pendiente' : 'Marcar como Preparada'}
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <span className="text-meta text-orange-600 font-medium">
                                ⏳ En preparación...
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrden && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-titulo font-bold text-gray-900 break-words">
                    Detalles de Orden - {getMostrarNombreMesaOrden(selectedOrden)}
                  </h2>
                  <p className="text-cuerpo text-gray-600 mt-1 break-words">
                    Estado: {selectedOrden.estatus}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrden(null)}
                  className="text-gray-400 hover:text-gray-600 text-pantalla self-start sm:self-center flex-shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-6 space-y-6">
              {/* Products Section */}
              {selectedOrden.productos && selectedOrden.productos.filter((producto) => !producto.listo).length > 0 && (
                <div>
                  <h3 className="text-titulo font-semibold text-gray-900 mb-3 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-orange-600 flex-shrink-0" />
                    Productos
                  </h3>
                  <div className="space-y-2">
                    {selectedOrden.productos.filter((producto) => !producto.listo).map((producto) => (
                      <div
                        key={producto._id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border ${
                          producto.entregado ? 'bg-green-50 border-green-200' : producto.listo ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            producto.entregado ? 'bg-green-500' : producto.listo ? 'bg-yellow-500' : 'bg-gray-300'
                          }`}></div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 break-words">{producto.producto || producto.nombre}</p>
                            <p className="text-cuerpo text-gray-600">Cantidad: {producto.cantidad}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          {/* Costo eliminado */}
                          {producto.entregado ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dishes Section */}
              {selectedOrden.platillos && selectedOrden.platillos.filter((platillo) => !platillo.listo).length > 0 && (
                <div>
                  <h3 className="text-titulo font-semibold text-gray-900 mb-3 flex items-center">
                    <ChefHat className="w-5 h-5 mr-2 text-orange-600 flex-shrink-0" />
                    Platillos
                  </h3>
                  <div className="space-y-2">
                    {selectedOrden.platillos.filter((platillo) => !platillo.listo).map((platillo) => (
                      <div key={platillo._id} className="space-y-2">
                        <div
                          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border ${
                            platillo.entregado ? 'bg-green-50 border-green-200' : platillo.listo ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              platillo.entregado ? 'bg-green-500' : platillo.listo ? 'bg-yellow-500' : 'bg-gray-300'
                            }`}></div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 break-words">{platillo.platillo}</p>
                              {platillo.notas && (
                                <p className="text-meta text-blue-600 italic mt-1 break-words">
                                  Notas: {platillo.notas}
                                </p>
                              )}
                              <p className="text-cuerpo text-gray-600 break-words">
                                Guiso: {platillo.guiso} | Cantidad: {platillo.cantidad}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2">
                            {/* Costo eliminado */}
                            {platillo.entregado ? (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            ) : null}
                          </div>
                        </div>
                        {/* Extras for this platillo */}
                        {platillo.extras && platillo.extras.filter((extra: any) => !extra.listo).length > 0 && (
                          <div className="ml-6 space-y-1">
                            {platillo.extras.filter((extra: any) => !extra.listo).map((extra: any) => (
                              <div
                                key={extra._id}
                                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded border-l-4 ${
                                  extra.entregado ? 'bg-green-50 border-l-green-400' : extra.listo ? 'bg-yellow-50 border-l-yellow-400' : 'bg-purple-50 border-l-purple-400'
                                }`}
                              >
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    extra.entregado ? 'bg-green-500' : extra.listo ? 'bg-yellow-500' : 'bg-purple-400'
                                  }`}></div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-cuerpo font-medium text-purple-900 break-words">
                                      Extra: {extra.nombreExtra}
                                    </p>
                                    <p className="text-meta text-purple-700">
                                      Cantidad: {extra.cantidad}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-2">
                                  {/* Costo eliminado */}
                                  <div className="flex items-center gap-1">
                                    {extra.entregado ? (
                                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    ) : extra.listo ? (
                                      <CheckCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                                    ) : selectedOrden.estatus === 'Preparacion' ? (
                                      <button
                                        onClick={() => handleMarkItemAsReady(extra._id, 'extra')}
                                        disabled={markingItem === extra._id}
                                        className="btn bg-purple-100 text-purple-700 hover:bg-purple-200"
                                      >
                                        {markingItem === extra._id ? (
                                          <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1"></div>
                                            <span>...</span>
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            <span>Listo</span>
                                          </>
                                        )}
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Actions */}
              <div className="border-t border-gray-200 pt-4">
                {selectedOrden.estatus === 'Preparacion' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-cuerpo font-medium text-blue-900">Progreso de preparación</p>
                        <p className="text-meta text-blue-700">
                          Marca cada item como listo cuando esté preparado
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => handleCompletarOrden(selectedOrden._id!)}
                          disabled={updating === selectedOrden._id || !isOrderReadyToComplete(selectedOrden)}
                          className="btn w-full sm:w-auto bg-green-600 text-white hover:bg-green-700"
                        >
                          {updating === selectedOrden._id ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                              <span>Completando...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                              <span>Marcar Surtida</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-8">
        <h3 className="text-titulo font-semibold text-gray-900 mb-4">Código de Prioridad</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-200 border-2 border-green-500 rounded flex-shrink-0"></div>
            <span className="text-meta text-gray-700">Normal (hasta 20 min)</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-200 border-2 border-yellow-500 rounded flex-shrink-0"></div>
            <span className="text-meta text-gray-700">Atención (20-40 min)</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-200 border-2 border-red-500 rounded flex-shrink-0"></div>
            <span className="text-meta text-gray-700">Urgente (más de 40 min)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurtirOrden;