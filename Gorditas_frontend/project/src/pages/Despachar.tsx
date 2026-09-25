import React, { useState, useEffect, useRef } from 'react';
import { Aviso } from '../components/Aviso';
import { 
  Truck, 
  Package, 
  CheckCircle, 
  Clock,
  Users,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { apiService } from '../services/api';
import { Orden, Mesa, OrdenDetalleProducto, OrdenDetallePlatillo } from '../types';

interface OrdenConDetalles extends Orden {
  productos?: OrdenDetalleProducto[];
  platillos?: OrdenDetallePlatillo[];
  extras?: any[]; // Add extras property
}

interface MesaAgrupada {
  idMesa: number;
  nombreMesa: string;
  ordenes: OrdenConDetalles[];
  totalOrdenes: number;
  totalMonto: number;
  clientes: { [cliente: string]: OrdenConDetalles[] };
}

const Despachar: React.FC = () => {
  const [ordenes, setOrdenes] = useState<OrdenConDetalles[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesasAgrupadas, setMesasAgrupadas] = useState<MesaAgrupada[]>([]);
  const [expandedMesas, setExpandedMesas] = useState<Set<number>>(new Set());
  const [selectedOrden, setSelectedOrden] = useState<OrdenConDetalles | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mesaEntregando, setMesaEntregando] = useState<number | null>(null); // idMesa que está entregando
  
  // Ref for order details section
  const orderDetailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    // Set up polling for real-time updates
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Sincronizar detalles de la orden seleccionada si hay polling y cambia la orden
  useEffect(() => {
    if (!selectedOrden) return;
    // Buscar la orden seleccionada en la lista actual de ordenes
    const found = ordenes.find(o => o._id === selectedOrden._id);
    if (found) {
      // Si existe, recargar detalles (sin scroll)
      loadOrdenDetails(found, false);
    } else {
      // Si ya no existe, cerrar el detalle
      setSelectedOrden(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenes]);

  // Function to group orders by table
  const groupOrdersByTable = (ordenes: OrdenConDetalles[], _mesas: Mesa[]): MesaAgrupada[] => {
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
      
      // Group by client
      const cliente = orden.nombreCliente || 'Sin nombre';
      if (!grouped[idMesa].clientes[cliente]) {
        grouped[idMesa].clientes[cliente] = [];
      }
      grouped[idMesa].clientes[cliente].push(orden);
    });
    
    // Mantener nombres de mesas como están (sin procesar)
    const result = Object.values(grouped);

    return result.sort((a, b) => a.nombreMesa.localeCompare(b.nombreMesa));
  };  // Function to load order details and set selected order, optionally scroll to details
  const loadOrdenDetails = async (orden: OrdenConDetalles, scroll: boolean = true) => {
    try {
      const detallesRes = await apiService.getOrdenDetails(orden._id!);
      if (detallesRes.success && detallesRes.data) {
        setSelectedOrden({
          ...orden,
          productos: detallesRes.data.productos || [],
          platillos: detallesRes.data.platillos || [],
          extras: detallesRes.data.extras || []
        });
      } else {
        setSelectedOrden({
          ...orden,
          productos: [],
          platillos: [],
          extras: []
        });
      }
      if (scroll && orderDetailsRef.current) {
        orderDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      setError('Error cargando detalles de la orden');
      setTimeout(() => setError(''), 3000);
    }
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

  const loadData = async () => {
    try {
      const [ordenesRes, mesasRes] = await Promise.all([
        apiService.getOrdenesActivas(),
        apiService.getCatalog<Mesa>('mesa')
      ]);

      let mesasArray: Mesa[] = [];
      if (mesasRes.success) {
        if (Array.isArray(mesasRes.data)) {
          mesasArray = mesasRes.data;
        } else if (Array.isArray(mesasRes.data?.items)) {
          mesasArray = mesasRes.data.items;
        }
        setMesas(mesasArray);
      }

      if (ordenesRes.success) {
        let ordenesArray: Orden[] = [];
        if (Array.isArray(ordenesRes.data.ordenes)) {
          ordenesArray = ordenesRes.data.ordenes;
        } else if (Array.isArray(ordenesRes.data)) {
          ordenesArray = ordenesRes.data;
        }

        // Filtrar órdenes para despacho
        const ordenesParaDespachar = ordenesArray.filter((orden: Orden) =>
          ['Surtida', 'Recepcion'].includes(orden.estatus)
        );

        // Marcar automáticamente como entregadas TODAS las órdenes con estatus 'Surtida' y nombreMesa que comience con 'Pedido', repitiendo hasta que no queden más
        let hayPedidosSurtidos = true;
        let ordenesArrayLoop = [...ordenesArray];
        while (hayPedidosSurtidos) {
          hayPedidosSurtidos = false;
          const ordenesParaDespacharLoop = ordenesArrayLoop.filter((orden: Orden) =>
            orden.estatus === 'Surtida' &&
            typeof orden.nombreMesa === 'string' &&
            orden.nombreMesa.trim().toLowerCase().startsWith('pedido')
          );
          if (ordenesParaDespacharLoop.length === 0) break;
          for (const orden of ordenesParaDespacharLoop) {
            try {
              const detallesRes = await apiService.getOrdenDetails(orden._id!);
              if (detallesRes.success && detallesRes.data) {
                const { productos = [], platillos = [], extras = [] } = detallesRes.data;
                for (const producto of productos) {
                  if (!producto.entregado && producto._id) {
                    await apiService.markProductoEntregado(producto._id);
                  }
                }
                for (const platillo of platillos) {
                  if (!platillo.entregado && platillo._id) {
                    await apiService.markPlatilloEntregado(platillo._id);
                  }
                  if (platillo.extras && Array.isArray(platillo.extras)) {
                    for (const extra of platillo.extras) {
                      if (!extra.entregado && extra._id) {
                        await apiService.updateExtraStatus(extra._id, 'entregado');
                      }
                    }
                  }
                }
                if (Array.isArray(extras)) {
                  for (const extra of extras) {
                    if (!extra.entregado && extra._id) {
                      await apiService.updateExtraStatus(extra._id, 'entregado');
                    }
                  }
                }
              }
              await apiService.updateOrdenStatus(orden._id!, 'Entregada');
              hayPedidosSurtidos = true;
            } catch (e) {
              // Ignorar error, continuar
            }
          }
          // Si alguna fue marcada, volver a consultar las órdenes activas para asegurar que no queden pendientes
          if (hayPedidosSurtidos) {
            const ordenesResRepeat = await apiService.getOrdenesActivas();
            if (ordenesResRepeat.success) {
              if (Array.isArray(ordenesResRepeat.data.ordenes)) {
                ordenesArrayLoop = ordenesResRepeat.data.ordenes;
              } else if (Array.isArray(ordenesResRepeat.data)) {
                ordenesArrayLoop = ordenesResRepeat.data;
              }
            }
          }
        }

        // Obtener los detalles de cada orden (productos y platillos)
        const ordenesConDetalles: OrdenConDetalles[] = await Promise.all(
          ordenesParaDespachar.map(async (orden): Promise<OrdenConDetalles> => {
            try {
              const detallesRes = await apiService.getOrdenDetails(orden._id!);
              if (detallesRes.success && detallesRes.data) {
                return {
                  ...orden,
                  productos: detallesRes.data.productos || [],
                  platillos: detallesRes.data.platillos || []
                };
              } else {
                console.warn(`No se pudieron cargar detalles para orden ${orden._id}:`, detallesRes.error);
                return {
                  ...orden,
                  productos: [],
                  platillos: []
                };
              }
            } catch (error) {
              console.error(`Error cargando detalles de orden ${orden._id}:`, error);
              return {
                ...orden,
                productos: [],
                platillos: []
              };
            }
          })
        );

        setOrdenes(ordenesConDetalles);

        // Group orders by table
        const grouped = groupOrdersByTable(ordenesConDetalles, mesasArray);
        setMesasAgrupadas(grouped);

        // Si hay una orden seleccionada, actualizarla con los nuevos datos
        if (selectedOrden) {
          const updatedSelectedOrden = ordenesConDetalles.find(orden => orden._id === selectedOrden._id);
          if (updatedSelectedOrden) {
            // Recargar los detalles completos de la orden seleccionada sin hacer scroll
            loadOrdenDetails(updatedSelectedOrden, false);
          } else {
            // Si la orden seleccionada ya no existe (fue entregada o eliminada), deseleccionarla
            setSelectedOrden(null);
          }
        }
      }
      setLoading(false);
    } catch (error) {
      setError('Error cargando órdenes o mesas');
      setLoading(false);
    }
  };

  // ... rest of the component code remains unchanged ...

  const handleMarkAllAsDelivered = async (orden: OrdenConDetalles) => {
    try {
      // Cargar detalles de la orden primero
      const response = await apiService.getOrdenDetails(orden._id!);
      if (response.success) {
        const data = response.data;
        const platillos = data.platillos || [];
        const productos = data.productos || [];
        const extras = data.extras || [];

        // Marcar productos como entregados
        for (const producto of productos) {
          if (!producto.entregado) {
            await apiService.markProductoEntregado(producto._id);
          }
        }

        // Marcar platillos con listo=true como entregados
        let hayPlatillosNoListos = false;
        for (const platillo of platillos) {
          if (platillo.listo === true && !platillo.entregado) {
            await apiService.markPlatilloEntregado(platillo._id);
            // Marcar extras SOLO si el platillo se entrega en este momento
            if (platillo.extras) {
              for (const extra of platillo.extras) {
                if (!extra.entregado) {
                  await apiService.updateExtraStatus(extra._id, 'entregado');
                }
              }
            }
          } else if (platillo.listo !== true && platillo.entregado !== true) {
            hayPlatillosNoListos = true;
          }
          // Si el platillo ya estaba entregado o no está listo, NO marcar sus extras
        }

        // Marcar extras generales como entregados (si aplica lógica de negocio)
        for (const extra of extras) {
          if (!extra.entregado) {
            await apiService.updateExtraStatus(extra._id, 'entregado');
          }
        }

        // Si hay platillos no listos, NO marcar la orden como entregada
        if (hayPlatillosNoListos && orden.estatus === 'Recepcion') {
          setError('No se puede marcar la orden como entregada porque hay platillos en preparación. Solo se entregaron los platillos listos.');
          setTimeout(() => setError(''), 4000);
        } else {
          // Marcar la orden como entregada (despacho completo)
          await apiService.updateOrdenStatus(orden._id!, 'Entregada');
        }

        // Actualizar el estado local de selectedOrden si es la orden seleccionada
        if (selectedOrden && selectedOrden._id === orden._id) {
          const updatedOrden: OrdenConDetalles = {
            ...selectedOrden,
            productos: selectedOrden.productos?.map(p => ({ ...p, entregado: true })),
            platillos: selectedOrden.platillos?.map(p => (
              p.listo === true ? {
                ...p,
                entregado: true,
                extras: p.extras?.map((e: any) => ({ ...e, entregado: true }))
              } : p
            )),
            extras: selectedOrden.extras?.map((e: any) => ({ ...e, entregado: true })),
            estatus: hayPlatillosNoListos && orden.estatus === 'Recepcion' ? orden.estatus : 'Entregada'
          };
          setSelectedOrden(updatedOrden);
        }

        // Actualizar también la lista local de órdenes
        setOrdenes(prevOrdenes => {
          const updatedOrdenes = prevOrdenes.map(ord => {
            if (ord._id === orden._id) {
              const updatedOrder: OrdenConDetalles = {
                ...ord,
                productos: ord.productos?.map(p => ({ ...p, entregado: true })),
                platillos: ord.platillos?.map(p => (
                  p.listo === true ? {
                    ...p,
                    entregado: true,
                    extras: p.extras?.map((e: any) => ({ ...e, entregado: true }))
                  } : p
                )),
                extras: ord.extras?.map((e: any) => ({ ...e, entregado: true })),
                estatus: hayPlatillosNoListos && orden.estatus === 'Recepcion' ? ord.estatus : 'Entregada'
              };
              return updatedOrder;
            }
            return ord;
          });
          // Filtrar órdenes entregadas para que no aparezcan en la lista de despacho
          return updatedOrdenes.filter(ord => ord.estatus !== 'Entregada');
        });

        // Actualizar también las mesas agrupadas
        setMesasAgrupadas(prevMesas => {
          const updatedMesas = prevMesas.map(mesa => ({
            ...mesa,
            ordenes: mesa.ordenes.filter(ord => ord._id !== orden._id || ord.estatus !== 'Entregada')
          })).filter(mesa => mesa.ordenes.length > 0); // Remover mesas sin órdenes
          return updatedMesas;
        });

        // Si la orden seleccionada fue entregada completamente, deseleccionarla
        if (selectedOrden && selectedOrden._id === orden._id && !(hayPlatillosNoListos && orden.estatus === 'Recepcion')) {
          setSelectedOrden(null);
        }

        await loadData(); // Refresh the list
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error cargando detalles de la orden');
      }
    } catch (error) {
      setError('Error al marcar la orden como entregada');
    }
  };

  const handleMarkAllMesaAsDelivered = async (mesa: MesaAgrupada) => {
    try {
      setMesaEntregando(mesa.idMesa);
      document.body.style.overflow = 'hidden';
      let algunaNoEntregadaPorPreparacion = false;
      for (const orden of mesa.ordenes) {
        const response = await apiService.getOrdenDetails(orden._id!);
        if (response.success) {
          const data = response.data;
          const platillos = data.platillos || [];
          const productos = data.productos || [];
          const extras = data.extras || [];

          // Marcar productos como entregados
          for (const producto of productos) {
            if (!producto.entregado && producto._id) {
              await apiService.markProductoEntregado(producto._id);
            }
          }

          // Marcar platillos con listo=true como entregados
          let hayPlatillosNoListos = false;
          for (const platillo of platillos) {
            if (platillo.listo === true && !platillo.entregado) {
              await apiService.markPlatilloEntregado(platillo._id);
              // Marcar extras SOLO si el platillo se entrega en este momento
              if (platillo.extras) {
                for (const extra of platillo.extras) {
                  if (!extra.entregado) {
                    await apiService.updateExtraStatus(extra._id, 'entregado');
                  }
                }
              }
            } else if (platillo.listo !== true && platillo.entregado !== true) {
              hayPlatillosNoListos = true;
            }
            // Si el platillo ya estaba entregado o no está listo, NO marcar sus extras
          }

          // Marcar extras generales como entregados (si aplica lógica de negocio)
          for (const extra of extras) {
            if (!extra.entregado) {
              await apiService.updateExtraStatus(extra._id, 'entregado');
            }
          }

          // Si hay platillos no listos, NO marcar la orden como entregada
          if (!(hayPlatillosNoListos && orden.estatus === 'Recepcion')) {
            await apiService.updateOrdenStatus(orden._id!, 'Entregada');
          } else {
            algunaNoEntregadaPorPreparacion = true;
          }
        }
      }
      if (algunaNoEntregadaPorPreparacion) {
        setError('Algunas órdenes no se marcaron como entregadas porque tienen platillos en preparación. Solo se entregaron los platillos listos.');
        setTimeout(() => setError(''), 4000);
      } else {
        setSuccess(`Todas las órdenes de ${mesa.nombreMesa} que ya están preparadas han sido entregadas`);
        setTimeout(() => setSuccess(''), 3000);
      }
      await loadData();
      if (selectedOrden && mesa.ordenes.some(o => o._id === selectedOrden._id)) {
        setSelectedOrden(null);
      }
    } catch (error) {
      setError('Error al entregar todas las órdenes de la mesa');
      setTimeout(() => setError(''), 3000);
    } finally {
      setMesaEntregando(null);
      document.body.style.overflow = '';
    }
  };

  const handleMarkAsDelivered = async (itemId: string, type: 'producto' | 'platillo' | 'extra') => {
    if (!selectedOrden) return;

    // Si la orden está en Recepcion, solo permitir marcar productos como entregados
    if (selectedOrden.estatus === 'Recepcion' && (type === 'platillo' || type === 'extra')) {
      setError(`Los ${type === 'platillo' ? 'platillos' : 'extras'} no se pueden marcar como entregados hasta que la orden esté surtida`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      let response;
      if (type === 'producto') {
        response = await apiService.markProductoEntregado(itemId);
      } else if (type === 'platillo') {
        response = await apiService.markPlatilloEntregado(itemId);
      } else if (type === 'extra') {
        // Use updateExtraStatus to mark extra as delivered
        response = await apiService.updateExtraStatus(itemId, 'entregado');
      }

      if (response && response.success) {
        // Update local state
        if (type === 'producto') {
          setSelectedOrden(prev => ({
            ...prev!,
            productos: prev!.productos?.map(p => 
              p._id === itemId ? { ...p, entregado: true } : p
            )
          }));
        } else if (type === 'platillo') {
          setSelectedOrden(prev => ({
            ...prev!,
            platillos: prev!.platillos?.map(p => 
              p._id === itemId ? { ...p, entregado: true } : p
            )
          }));
        } else if (type === 'extra') {
          // Update both the general extras list and the nested extras in platillos
          setSelectedOrden(prev => ({
            ...prev!,
            extras: prev!.extras?.map((e: any) => 
              e._id === itemId ? { ...e, entregado: true } : e
            ),
            platillos: prev!.platillos?.map(p => ({
              ...p,
              extras: p.extras?.map((e: any) => 
                e._id === itemId ? { ...e, entregado: true } : e
              )
            }))
          }));
        }

        setSuccess('Item marcado como entregado');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error marcando item como entregado');
      }
    } catch (error) {
      setError('Error marcando item como entregado');
    }
  };

  const handleCompleteDispatch = async () => {
    if (!selectedOrden) return;

    setDispatching(true);
    try {
      const response = await apiService.updateOrdenStatus(selectedOrden._id!, 'Entregada');
      
      if (response.success) {
        setSuccess('Orden despachada exitosamente');
        setSelectedOrden(null);
        await loadData(); // This will refresh both orders and grouping
      } else {
        setError('Error al completar el despacho');
      }
    } catch (error) {
      setError('Error al completar el despacho');
    } finally {
      setDispatching(false);
    }
  };

  const getMesaInfo = (mesaId: string) => {
    return mesas.find(mesa => mesa._id === mesaId);
  };

  const getDeliveryButtonInfo = (orden: OrdenConDetalles) => {
    const isMobile = window.innerWidth < 640;
    if (orden.estatus === 'Recepcion') {
      // Permitir entregar si hay productos no entregados o platillos listos no entregados
      const hasDeliverableProducts = orden.productos && orden.productos.length > 0 && 
        orden.productos.some(p => p.entregado !== true);
      const hasDeliverableReadyDishes = orden.platillos && orden.platillos.length > 0 &&
        orden.platillos.some(p => p.listo === true && p.entregado !== true);
      if (hasDeliverableProducts || hasDeliverableReadyDishes) {
        const text = isMobile
          ? 'Entregar Todo'.split(' ').map(w => w.slice(0, 3)).join(' ')
          : 'Entregar Todo';
        return { text, disabled: false, className: 'bg-green-600 hover:bg-green-700' };
      } else {
        const text = isMobile
          ? 'Todo Entregado'.split(' ').map(w => w.slice(0, 3)).join(' ')
          : 'Nada por entregar';
        return { text, disabled: true, className: 'bg-gray-400 cursor-not-allowed' };
      }
    } else {
      // Para órdenes surtidas consideramos productos, platillos y extras
      const hasDeliverableProducts = orden.productos && orden.productos.length > 0 && 
        orden.productos.some(p => p.entregado !== true);
      const hasDeliverableDishes = orden.platillos && orden.platillos.length > 0 && 
        orden.platillos.some(p => p.entregado !== true);
      const hasDeliverableGeneralExtras = orden.extras && orden.extras.length > 0 &&
        orden.extras.some((e: any) => e.entregado !== true);
      const hasDeliverablePlatilloExtras = orden.platillos && orden.platillos.length > 0 &&
        orden.platillos.some(p => p.extras && p.extras.length > 0 && 
          p.extras.some((e: any) => e.entregado !== true));
      if (hasDeliverableProducts || hasDeliverableDishes || hasDeliverableGeneralExtras || hasDeliverablePlatilloExtras) {
        const text = isMobile
          ? 'Entregar Todo'.split(' ').map(w => w.slice(0, 3)).join(' ')
          : 'Entregar Todo';
        return { text, disabled: false, className: 'bg-green-600 hover:bg-green-700' };
      } else {
        const text = isMobile
          ? 'Todo Entregado'.split(' ').map(w => w.slice(0, 3)).join(' ')
          : 'Todo Entregado';
        return { text, disabled: true, className: 'bg-gray-400 cursor-not-allowed' };
      }
    }
  };

  const hasMesaDeliverableItems = (mesa: MesaAgrupada) => {
    return mesa.ordenes.some(orden => {
      if (orden.estatus === 'Recepcion') {
        // Permitir entregar si hay productos no entregados o platillos listos no entregados
        const hasDeliverableProducts = orden.productos && orden.productos.length > 0 && 
          orden.productos.some(p => p.entregado !== true);
        const hasDeliverableReadyDishes = orden.platillos && orden.platillos.length > 0 &&
          orden.platillos.some(p => p.listo === true && p.entregado !== true);
        return hasDeliverableProducts || hasDeliverableReadyDishes;
      } else {
        const hasDeliverableProducts = orden.productos && orden.productos.length > 0 && 
          orden.productos.some(p => p.entregado !== true);
        const hasDeliverableDishes = orden.platillos && orden.platillos.length > 0 && 
          orden.platillos.some(p => p.entregado !== true);
        const hasDeliverableGeneralExtras = orden.extras && orden.extras.length > 0 &&
          orden.extras.some((e: any) => e.entregado !== true);
        const hasDeliverablePlatilloExtras = orden.platillos && orden.platillos.length > 0 &&
          orden.platillos.some(p => p.extras && p.extras.length > 0 && 
            p.extras.some((e: any) => e.entregado !== true));
        return hasDeliverableProducts || hasDeliverableDishes || hasDeliverableGeneralExtras || hasDeliverablePlatilloExtras;
      }
    });
  };

  const isOrderReadyForDispatch = (orden: OrdenConDetalles) => {
    const allProductsDelivered = orden.productos?.every(p => p.entregado) ?? true;
    const allDishesDelivered = orden.platillos?.every(p => p.entregado) ?? true;
    
    // Check if all extras are delivered (both general extras and extras within platillos)
    const allGeneralExtrasDelivered = orden.extras?.every((e: any) => e.entregado) ?? true;
    const allPlatilloExtrasDelivered = orden.platillos?.every(p => 
      p.extras?.every((e: any) => e.entregado) ?? true
    ) ?? true;
    
    return allProductsDelivered && allDishesDelivered && allGeneralExtrasDelivered && allPlatilloExtrasDelivered;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 px-2 sm:px-6 lg:px-8 relative">
      {/* Overlay de carga al entregar mesa */}
      {mesaEntregando !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-orange-600 mb-6"></div>
            <span className="text-white text-titulo font-bold">Entregando todas las órdenes de la mesa...</span>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-pantalla font-bold text-gray-900">Despachar Órdenes</h1>
          <p className="text-gray-600 mt-1">Gestiona la entrega de órdenes surtidas y productos de órdenes en recepción</p>
        </div>
        <div className="bg-white rounded-lg px-3 sm:px-4 py-2 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 sm:w-5 h-4 sm:h-5 text-orange-600" />
            <span className="text-meta font-medium text-gray-700">
              {ordenes.length} órdenes para despacho
            </span>
          </div>
        </div>
      </div>

      <Aviso error={error} exito={success} />

      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Tables with Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
          <div className="flex items-center space-x-2 mb-3 sm:mb-6">
            <Package className="w-5 h-5 text-orange-600" />
            <h2 className="text-titulo font-semibold text-gray-900">Mesas para Despacho</h2>
          </div>

          <div className="space-y-4">
            {mesasAgrupadas.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay órdenes disponibles para despacho</p>
              </div>
            ) : (
              mesasAgrupadas.map((mesa) => (
                <div key={mesa.idMesa} className="border border-gray-200 rounded-lg">
                  {/* Mesa Header - Clickable to expand/collapse */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleMesaExpansion(mesa.idMesa)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 truncate whitespace-nowrap overflow-hidden min-w-[60px] text-left">
                            {mesa.nombreMesa || `Mesa ${mesa.idMesa}`}
                          </h3>
                          <p className="text-cuerpo text-gray-600 truncate">
                            {mesa.totalOrdenes} {mesa.totalOrdenes === 1 ? 'orden' : 'órdenes'} surtida{mesa.totalOrdenes === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="text-left sm:text-right">
                          <p className="text-cuerpo font-medium text-green-600">
                            ${mesa.totalMonto.toFixed(2)}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {mesa.ordenes.some(o => o.estatus === 'Recepcion') && (
                              <span className="px-2 py-1 text-meta font-medium rounded-full bg-blue-100 text-blue-800">
                                En Recepción
                              </span>
                            )}
                            {mesa.ordenes.some(o => o.estatus === 'Surtida') && (
                              <span className="px-2 py-1 text-meta font-medium rounded-full bg-green-100 text-green-800">
                                Surtida
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          {/* Solo mostrar botón "Entregar Todo Mesa" si hay elementos pendientes */}
                          {hasMesaDeliverableItems(mesa) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAllMesaAsDelivered(mesa);
                              }}
                              className="btn flex-shrink-0 btn-avanzar"
                              title="Entregar todas las órdenes de esta mesa"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Entregar Mesa</span>
                              <span className="sm:hidden">Entregar</span>
                            </button>
                          )}
                          {expandedMesas.has(mesa.idMesa) ? (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Orders grouped by client - Expanded view */}
                  {expandedMesas.has(mesa.idMesa) && (
                    <div className="border-t border-gray-100 p-4">
                      <div className="space-y-4">
                        {Object.entries(mesa.clientes).map(([cliente, ordenesCliente]) => (
                          <div key={cliente} className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-3 truncate">
                              Cliente: {cliente} ({ordenesCliente.length} {ordenesCliente.length === 1 ? 'orden' : 'órdenes'})
                            </h4>
                            <div className="space-y-3">
                              {ordenesCliente.map((orden) => (
                                <div
                                  key={orden._id}
                                  onClick={() => loadOrdenDetails(orden)}
                                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                    selectedOrden?._id === orden._id
                                      ? 'border-orange-500 bg-orange-50'
                                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                                  }`}
                                >
                                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <h5 className="font-medium text-gray-900 truncate">
                                        Orden #{orden.folio || orden._id?.slice(-6)}
                                      </h5>
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                                        <p className="text-cuerpo text-gray-600">
                                          {new Date(orden.fechaHora ?? orden.fecha ?? '').toLocaleTimeString('es-ES', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                        <span className={`px-2 py-1 text-meta font-medium rounded-full self-start ${
                                          orden.estatus === 'Recepcion' 
                                            ? 'bg-blue-100 text-blue-800' 
                                            : 'bg-green-100 text-green-800'
                                        }`}>
                                          {orden.estatus}
                                        </span>
                                      </div>
                                      {orden.notas && (
                                        <div className="mt-1 p-2 bg-blue-50 rounded text-meta text-blue-700 max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-line' }}>
                                          <strong>Notas:</strong> <span className="break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-line' }}>{orden.notas}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                      <div className="text-left sm:text-right">
                                        <p className="text-cuerpo font-medium text-green-600">
                                          ${orden.total.toFixed(2)}
                                        </p>
                                      </div>
                                      <div className="flex justify-start sm:justify-end">
                                        {(() => {
                                          const buttonInfo = getDeliveryButtonInfo(orden);
                                          return (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (!buttonInfo.disabled) {
                                                  handleMarkAllAsDelivered(orden);
                                                }
                                              }}
                                              disabled={buttonInfo.disabled}
                                              className={`px-2 py-1 text-white text-meta rounded transition-colors flex items-center flex-shrink-0 ${buttonInfo.className}`}
                                            >
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                              <span className="truncate">{buttonInfo.text}</span>
                                            </button>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Order Details */}
        <div ref={orderDetailsRef} className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 sm:p-6">
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:mb-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-titulo font-semibold text-gray-900 break-words">
                {selectedOrden ? (
                  <>
                    <span className="block sm:inline">
                      Detalles -  {selectedOrden.nombreMesa || getMesaInfo(selectedOrden.mesa)?.nombre || getMesaInfo(selectedOrden.mesa)?.numero || selectedOrden.mesa}
                    </span>
                    {selectedOrden.nombreCliente && (
                      <span className="block sm:inline text-cuerpo text-gray-600 mt-1 sm:mt-0"> 
                        <span className="hidden sm:inline"> • </span>{selectedOrden.nombreCliente}
                      </span>
                    )}
                  </>
                ) : (
                  'Selecciona una orden'
                )}
              </h2>
            </div>
            {selectedOrden &&
              isOrderReadyForDispatch(selectedOrden) &&
              !(typeof selectedOrden.nombreMesa === 'string' && selectedOrden.nombreMesa.trim().toLowerCase().startsWith('pedido')) && (
                <button
                  onClick={handleCompleteDispatch}
                  disabled={dispatching}
                  className="btn w-full sm:w-auto flex-shrink-0 btn-neutro"
                >
                  {dispatching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <span className="hidden sm:inline">Despachando...</span>
                      <span className="sm:hidden">Despachando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Completar Despacho</span>
                      <span className="sm:hidden">Completar</span>
                    </>
                  )}
                </button>
              )}
          </div>

          {!selectedOrden ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Selecciona una orden para ver los detalles</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2 text-cuerpo">Resumen de la Orden</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 text-meta">
                  <div className="flex justify-between sm:block">
                    <span className="text-gray-600">Mesa:</span>
                    <span className="ml-2 font-medium break-words">{getMesaInfo(selectedOrden.mesa)?.numero}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-2 font-medium text-green-600">${selectedOrden.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-gray-600">Hora:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedOrden.fechaHora ?? selectedOrden.fecha ?? '').toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-gray-600">Estado:</span>
                    <span className="ml-2 font-medium break-words">{selectedOrden.estatus}</span>
                  </div>
                </div>
              </div>

              {/* Products */}
              {selectedOrden.productos && selectedOrden.productos.length > 0 ? (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 text-cuerpo">Productos</h3>
                  <div className="space-y-2">
                    {selectedOrden.productos.map((producto, index) => (
                      <div
                        key={index}
                        className={`flex flex-col gap-2 p-2 sm:p-3 rounded-lg sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
                          producto.entregado ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-cuerpo break-words">{producto.producto || producto.nombreProducto || `Producto ${index + 1}`}</p>
                          <p className="text-meta text-gray-600">Cantidad: {producto.cantidad}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 sm:justify-end">
                          <span className="text-cuerpo font-medium text-green-600 flex-shrink-0">
                            ${producto.subtotal?.toFixed(2) ?? producto.importe?.toFixed(2) ?? '0.00'}
                          </span>
                          {producto.entregado ? (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                              <span className="text-meta text-green-600 font-medium sm:hidden">Entregado</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleMarkAsDelivered(producto._id!, 'producto')}
                              className="btn flex-shrink-0 btn-avanzar"
                            >
                              Entregar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 text-cuerpo">Productos</h3>
                  <div className="text-meta text-gray-500">No hay productos en esta orden.</div>
                </div>
              )}

              {/* Dishes */}
              {selectedOrden.platillos && selectedOrden.platillos.length > 0 ? (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 text-cuerpo">Platillos</h3>
                  <div className="space-y-2">
                    {selectedOrden.platillos.map((platillo, index) => {
                      // Permitir entregar si listo=true y entregado=false
                      const puedeEntregar = platillo.listo === true && platillo.entregado !== true;
                      const bloqueadoPorRecepcion = selectedOrden.estatus === 'Recepcion' && (!platillo.listo || platillo.entregado);
                      // Determinar fondo para platillo y extras
                      let platilloBg = '';
                      if (platillo.entregado) {
                        platilloBg = 'bg-green-50 border border-green-200';
                      } else if (selectedOrden.estatus === 'Recepcion' && !platillo.listo) {
                        platilloBg = 'bg-yellow-50 border border-yellow-200';
                      } else {
                        platilloBg = 'bg-gray-50';
                      }
                      return (
                        <div key={index} className="space-y-2">
                          <div className={`flex flex-col gap-2 p-2 sm:p-3 rounded-lg sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${platilloBg}`}>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 text-cuerpo break-words">{platillo.platillo || platillo.nombrePlatillo || `Platillo ${index + 1}`}</p>
                              {platillo.notas && (
                                <p className="text-meta text-blue-600 italic mt-1 break-words">
                                  Notas: {platillo.notas}
                                </p>
                              )}
                              <p className="text-meta text-gray-600 break-words">Guiso: {platillo.guiso || platillo.nombreGuiso}</p>
                              <p className="text-meta text-gray-600">Cantidad: {platillo.cantidad}</p>
                              {selectedOrden.estatus === 'Recepcion' && !platillo.listo && !platillo.entregado && (
                                <p className="text-meta text-yellow-700 font-medium">Preparando...</p>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 sm:justify-end">
                              <span className="text-cuerpo font-medium text-gray-900 flex-shrink-0">
                                ${platillo.subtotal !== undefined ? platillo.subtotal.toFixed(2) : '0.00'}
                              </span>
                              {platillo.entregado ? (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                  <span className="text-meta text-green-600 font-medium sm:hidden">Entregado</span>
                                </div>
                              ) : puedeEntregar ? (
                                <button
                                  onClick={() => handleMarkAsDelivered(platillo._id!, 'platillo')}
                                  className="btn flex-shrink-0 btn-avanzar"
                                >
                                  Entregar
                                </button>
                              ) : (
                                <div className="px-2 sm:px-3 py-1 bg-yellow-100 text-yellow-800 text-meta rounded font-medium flex-shrink-0">
                                  <span className="hidden sm:inline">Preparando</span>
                                  <span className="sm:hidden">Prep.</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Extras for this platillo, con mismo fondo que el platillo */}
                          {platillo.extras && platillo.extras.length > 0 && (
                            <div className="ml-2 sm:ml-4 space-y-1">
                              {platillo.extras.map((extra: any) => (
                                <div
                                  key={extra._id}
                                  className={`flex flex-col gap-1 p-1.5 rounded text-meta sm:flex-row sm:items-center sm:justify-between sm:gap-2 ${platilloBg}`}
                                >
                                  <div className="flex items-center space-x-1 min-w-0 flex-1">
                                    <span className="text-purple-900 font-medium break-words">
                                      {extra.nombreExtra} (x{extra.cantidad})
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-1 flex-shrink-0 sm:justify-end">
                                    <span className="text-purple-900 font-medium text-meta">
                                      ${(extra.importe ?? 0).toFixed(2)}
                                    </span>
                                    {puedeEntregar ? (
                                      <button
                                        onClick={() => handleMarkAsDelivered(extra._id, 'extra')}
                                        className="btn bg-purple-100 text-purple-700 hover:bg-purple-200"
                                      >
                                        Entregar
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 text-cuerpo">Platillos</h3>
                  <div className="text-meta text-gray-500">No hay platillos en esta orden.</div>
                </div>
              )}

              {/* Delivery Status */}
              <div className={`p-3 sm:p-4 rounded-lg ${
                selectedOrden.estatus === 'Recepcion' 
                  ? 'bg-blue-50 border border-blue-200' 
                  : 'bg-blue-50'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900 text-cuerpo">Estado de Entrega</h3>
                </div>
                <p className="text-meta text-blue-700 break-words">
                  {selectedOrden.estatus === 'Recepcion' 
                    ? 'Esta orden está en recepción. Puedes entregar productos, pero los platillos y sus extras están en preparación.'
                    : isOrderReadyForDispatch(selectedOrden)
                      ? 'Todos los items (productos, platillos y extras) han sido entregados. La orden está lista para completar el despacho.'
                      : 'Marca todos los items (productos, platillos y extras) como entregados para completar el despacho.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Despachar;