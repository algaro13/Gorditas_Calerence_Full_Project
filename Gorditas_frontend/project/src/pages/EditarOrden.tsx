  // Estado y función para eliminar orden

import React, { useState, useEffect, useRef } from 'react';
import { 
  Edit3, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  AlertCircle,
  RefreshCw,
  StickyNote,
  ChevronDown,
  ChevronRight,
  Users,
  X,
  Check
} from 'lucide-react';
import { apiService } from '../services/api';
import { precioVenta } from '../utils/precios';
import { Orden, Suborden, OrdenDetallePlatillo, OrdenDetalleProducto, Platillo, Guiso, Producto, MesaAgrupada, Extra, TipoExtra } from '../types';

const EditarOrden: React.FC = () => {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [mesasAgrupadas, setMesasAgrupadas] = useState<MesaAgrupada[]>([]);
  const [expandedMesas, setExpandedMesas] = useState<Set<number>>(new Set());
  const [selectedOrden, setSelectedOrden] = useState<Orden | null>(null);
  const [subordenes, setSubordenes] = useState<Suborden[]>([]);
  const [platillosDetalle, setPlatillosDetalle] = useState<OrdenDetallePlatillo[]>([]);
  const [productosDetalle, setProductosDetalle] = useState<OrdenDetalleProducto[]>([]);
  
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [guisos, setGuisos] = useState<Guiso[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // Estados para los modales de selección (igual que NuevaOrden)
  const [modalPlatilloOpen, setModalPlatilloOpen] = useState(false);
  const [modalProductoOpen, setModalProductoOpen] = useState(false);
  const [modalGuisoOpen, setModalGuisoOpen] = useState(false);
  const [modalExtrasOpen, setModalExtrasOpen] = useState(false);
  const [modalNotasOpen, setModalNotasOpen] = useState(false);
  const [modalVariantesOpen, setModalVariantesOpen] = useState(false);
  const [productoConVariantes, setProductoConVariantes] = useState<any>(null);
  
  // Estado para rastrear el flujo de selección de platillo
  const [platilloEnConstruccion, setPlatilloEnConstruccion] = useState<{
    platillo: Platillo | null;
    guiso: Guiso | null;
    cantidad: number;
    extras: any[];
    notas: string;
  }>({
    platillo: null,
    guiso: null,
    cantidad: 1,
    extras: [],
    notas: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para extras
  const [extras, setExtras] = useState<Extra[]>([]);
  const [tiposExtras, setTiposExtras] = useState<TipoExtra[]>([]);
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [selectedPlatilloForExtras, setSelectedPlatilloForExtras] = useState<string | null>(null);

  // Confirmación para eliminar platillo/producto
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'platillo' | 'producto'; id: string } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Estados para editar notas de platillos
  const [editingNota, setEditingNota] = useState<string | null>(null);
  const [tempNota, setTempNota] = useState('');
  const [savingNota, setSavingNota] = useState(false);

  // Estados para eliminar mesa completa
  const [deletingMesa, setDeletingMesa] = useState(false);
  const [showDeleteMesaModal, setShowDeleteMesaModal] = useState(false);
  const [selectedMesaToDelete, setSelectedMesaToDelete] = useState<MesaAgrupada | null>(null);

  // Estado para almacenar detalles de órdenes en las tarjetas móviles
  const [ordenesDetalles, setOrdenesDetalles] = useState<{ [key: string]: { platillos: any[], productos: any[] } }>({});
  // Estado para controlar qué resúmenes están expandidos (por ID de orden)
  const [resumenesExpandidos, setResumenesExpandidos] = useState<Set<string>>(new Set());

  // Ref for order details section
  const orderDetailsRef = useRef<HTMLDivElement>(null);

  // Removed duplicate loadData and useEffect block
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);

  // Función para detectar si una orden está marcada como pagada
  const esOrdenPagada = (nombreCliente: string | undefined): boolean => {
    if (!nombreCliente) return false;
    return nombreCliente.trim().endsWith('- Pagada');
  };

  // Función para verificar si TODAS las órdenes de una mesa están pagadas
  const todasLasOrdenesDeMesaPagadas = (mesa: MesaAgrupada): boolean => {
    return mesa.ordenes.length > 0 && mesa.ordenes.every(orden => esOrdenPagada(orden.nombreCliente));
  };

  // Función para alternar expansión del resumen de una orden
  const toggleResumenExpansion = (ordenId: string) => {
    setResumenesExpandidos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ordenId)) {
        newSet.delete(ordenId);
      } else {
        newSet.add(ordenId);
      }
      return newSet;
    });
  };

  const handleDeleteOrder = (orden: Orden) => {
    console.log('Abriendo modal de eliminar orden para:', orden._id);
    setSelectedOrden(orden);
    setShowDeleteOrderModal(true);
  };

  const handleDeleteMesa = (mesa: MesaAgrupada) => {
    console.log('Abriendo modal de eliminar mesa para:', mesa.idMesa);
    setSelectedMesaToDelete(mesa);
    setShowDeleteMesaModal(true);
  };

  const confirmDeleteMesa = async () => {
    if (!selectedMesaToDelete) return;
    console.log('Intentando eliminar todas las órdenes de la mesa:', selectedMesaToDelete.idMesa);
    setDeletingMesa(true);
    setError('');
    try {
      // Eliminar todas las órdenes de la mesa
      const deletePromises = selectedMesaToDelete.ordenes.map(orden => 
        apiService.deleteOrden(orden._id!)
      );
      
      const responses = await Promise.all(deletePromises);
      const allSuccessful = responses.every(response => response.success);
      
      if (allSuccessful) {
        // Si todas las órdenes se eliminaron exitosamente, intentar eliminar la mesa si es temporal
        try {
          const mesasResponse = await apiService.getCatalog<any>('mesa');
          const todasLasMesas = Array.isArray(mesasResponse.data?.items) ? mesasResponse.data.items : Array.isArray(mesasResponse.data) ? mesasResponse.data : [];
          
          // Buscar la mesa
          const mesaDeOrden = todasLasMesas.find((mesa: any) => mesa._id === selectedMesaToDelete.idMesa);
          
          // Si el nombre de la mesa comienza con "Pedido" (temporal), eliminarla
          if (mesaDeOrden && mesaDeOrden.nombre && mesaDeOrden.nombre.trim().toLowerCase().startsWith('pedido')) {
            await apiService.deleteCatalogItem('mesa', mesaDeOrden._id.toString());
            console.log(`Mesa temporal ${mesaDeOrden.nombre} eliminada`);
          }
        } catch (error) {
          console.error('Error al eliminar mesa temporal:', error);
          // No fallar la operación si hay error con la mesa temporal
        }

        setSuccess(`Mesa ${selectedMesaToDelete.nombreMesa} eliminada exitosamente`);
        setSelectedOrden(null); // Limpiar orden seleccionada si pertenecía a esta mesa
        await loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error eliminando algunas órdenes de la mesa');
      }
    } catch (error) {
      setError('Error eliminando la mesa');
      console.error('Error en confirmDeleteMesa:', error);
    } finally {
      setDeletingMesa(false);
      setShowDeleteMesaModal(false);
      setSelectedMesaToDelete(null);
    }
  };
  const confirmDeleteOrder = async () => {
    if (!selectedOrden) return;
    console.log('Intentando eliminar orden:', selectedOrden._id);
    setDeletingOrder(true);
    setError('');
    try {
      const response = await apiService.deleteOrden(selectedOrden._id!);
      console.log('Respuesta deleteOrden:', response);
      if (response.success) {
        // Verificar si la mesa es temporal (nombre comienza con "Pedido") y si es la última orden activa
        try {
          const mesasResponse = await apiService.getCatalog<any>('mesa');
          const todasLasMesas = Array.isArray(mesasResponse.data?.items) ? mesasResponse.data.items : Array.isArray(mesasResponse.data) ? mesasResponse.data : [];
          
          // Buscar la mesa de esta orden
          const mesaDeOrden = todasLasMesas.find((mesa: any) => mesa._id === selectedOrden.idMesa);
          
          // Si el nombre de la mesa comienza con "Pedido" (temporal), verificar si quedan más órdenes activas
          if (mesaDeOrden && mesaDeOrden.nombre && mesaDeOrden.nombre.trim().toLowerCase().startsWith('pedido')) {
            // Obtener todas las órdenes activas
            const ordenesRes = await apiService.getOrdenesActivas();
            let todasLasOrdenes: any[] = [];
            if (Array.isArray(ordenesRes.data?.ordenes)) {
              todasLasOrdenes = ordenesRes.data.ordenes;
            } else if (Array.isArray(ordenesRes.data)) {
              todasLasOrdenes = ordenesRes.data;
            }
            
            // Filtrar órdenes de esta mesa que NO sean Pagada ni Cancelado (excluyendo la que acabamos de eliminar)
            const ordenesActivasEnMesa = todasLasOrdenes.filter(
              (ord: any) => 
                ord.idMesa === selectedOrden.idMesa && 
                ord._id !== selectedOrden._id &&
                ord.estatus !== 'Pagada' && 
                ord.estatus !== 'Cancelado'
            );
            
            // Si no quedan más órdenes activas en esta mesa, eliminarla
            if (ordenesActivasEnMesa.length === 0) {
              await apiService.deleteCatalogItem('mesa', mesaDeOrden._id.toString());
              console.log(`Mesa temporal ${mesaDeOrden.nombre} eliminada - era la última orden activa`);
            } else {
              console.log(`Mesa temporal ${mesaDeOrden.nombre} conservada - aún hay ${ordenesActivasEnMesa.length} orden(es) activa(s)`);
            }
          }
        } catch (error) {
          console.error('Error al verificar/eliminar mesa temporal:', error);
          // No fallar la eliminación de la orden si hay error con la mesa temporal
        }

        setSuccess('Orden eliminada exitosamente');
        setSelectedOrden(null);
        await loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error eliminando la orden');
      }
    } catch (error) {
      setError('Error eliminando la orden');
      console.error('Error en confirmDeleteOrder:', error);
    } finally {
      setDeletingOrder(false);
      setShowDeleteOrderModal(false);
    }
  };

  // Function to group orders by table
  const groupOrdersByTable = (ordenes: Orden[]): MesaAgrupada[] => {
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
  };

  // Función para mostrar el nombre de mesa de una orden individual
  const getMostrarNombreMesaOrden = (orden: Orden): string => {
    if (!orden.nombreMesa) return 'Sin mesa';
    
    // Mostrar el nombre de la mesa tal como está (sin modificar)
    return orden.nombreMesa;
  };

  const toggleMesaExpansion = async (idMesa: number) => {
    const newExpanded = new Set(expandedMesas);
    if (newExpanded.has(idMesa)) {
      newExpanded.delete(idMesa);
    } else {
      newExpanded.add(idMesa);
      // Cargar detalles de todas las órdenes de esta mesa para vista móvil
      const mesa = mesasAgrupadas.find(m => m.idMesa === idMesa);
      if (mesa) {
        await loadOrdenesDetallesMesa(mesa);
        
        // Auto-expandir resúmenes en móvil/tablet (no en desktop)
        if (window.innerWidth < 1280) { // xl breakpoint
          setResumenesExpandidos(prev => {
            const newSet = new Set(prev);
            mesa.ordenes.forEach(orden => {
              if (orden._id) newSet.add(orden._id);
            });
            return newSet;
          });
        }
      }
    }
    setExpandedMesas(newExpanded);
  };

  // Función para cargar detalles de todas las órdenes de una mesa
  const loadOrdenesDetallesMesa = async (mesa: MesaAgrupada) => {
    try {
      const detallesPromises = mesa.ordenes.map(async (orden) => {
        try {
          const response = await apiService.getOrdenDetails(orden._id!);
          if (response.success) {
            return {
              ordenId: orden._id!,
              platillos: response.data.platillos || [],
              productos: response.data.productos || []
            };
          }
          return { ordenId: orden._id!, platillos: [], productos: [] };
        } catch {
          return { ordenId: orden._id!, platillos: [], productos: [] };
        }
      });

      const detalles = await Promise.all(detallesPromises);
      const detallesMap: { [key: string]: { platillos: any[], productos: any[] } } = {};
      detalles.forEach(detalle => {
        detallesMap[detalle.ordenId] = {
          platillos: detalle.platillos,
          productos: detalle.productos
        };
      });

      setOrdenesDetalles(prev => ({ ...prev, ...detallesMap }));
    } catch (error) {
      console.error('Error cargando detalles de órdenes:', error);
    }
  };

  useEffect(() => {
    loadData();
    // Set up polling for real-time updates
    const interval = setInterval(loadData, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
  try {
    const [ordenesRes, platillosRes, guisosRes, productosRes, extrasRes, tiposExtrasRes] = await Promise.all([
  apiService.getOrdenesActivas(),
      apiService.getCatalog<Platillo>('platillo'),
      apiService.getCatalog<Guiso>('guiso'),
      apiService.getCatalog<Producto>('producto'),
      apiService.getCatalog<Extra>('extra'),
      apiService.getCatalog<TipoExtra>('tipoextra')
    ]);

    // Filtrar órdenes editables
    if (ordenesRes.success) {
      const ordenesArray = Array.isArray(ordenesRes.data?.ordenes)
        ? ordenesRes.data.ordenes
        : Array.isArray(ordenesRes.data)
        ? ordenesRes.data
        : [];
      const ordenesEditables = ordenesArray.filter((orden: Orden) =>
        ['Recepcion', 'Preparacion', 'Pendiente', 'Surtida', 'Entregada'].includes(orden.estatus)
      );
      
      // Detectar nuevas órdenes editables
      const currentOrderIds = ordenes.map(o => o._id);
      const newOrderIds = ordenesEditables.map((o: any) => o._id);
      const hasNewData = newOrderIds.some((id: any) => !currentOrderIds.includes(id));
      
      if (hasNewData && ordenes.length > 0) {
        setSuccess('Nuevas órdenes editables detectadas');
        setTimeout(() => {
          setSuccess('');
        }, 5000);
      }
      
      setOrdenes(ordenesEditables);
      
      // Group orders by table
      const grouped = groupOrdersByTable(ordenesEditables);
      setMesasAgrupadas(grouped);
    }

    // Filtrar y adaptar catálogos
    if (platillosRes.success) {
      const platillosData = platillosRes.data?.items || platillosRes.data || [];
      setPlatillos(platillosData.filter((p: Platillo) => p.activo));
    }

    if (guisosRes.success) {
      const guisosData = guisosRes.data?.items || guisosRes.data || [];
      setGuisos(guisosData.filter((g: Guiso) => g.activo));
    }

    if (productosRes.success) {
      const productosData = productosRes.data?.items || productosRes.data || [];
      setProductos(productosData.filter((p: Producto) => p.activo));
    }

    if (extrasRes.success) {
      const extrasData = extrasRes.data?.items || extrasRes.data || [];
      const extrasActivos = extrasData.filter((e: Extra) => e.activo);
      setExtras(extrasActivos);
    }

    if (tiposExtrasRes.success) {
      const tiposExtrasData = tiposExtrasRes.data?.items || tiposExtrasRes.data || [];
      const tiposExtrasActivos = tiposExtrasData.filter((te: TipoExtra) => te.activo);
      setTiposExtras(tiposExtrasActivos);
    }
  } catch (error) {
    setError('Error cargando datos');
  } finally {
    setLoading(false);
  }
};

  const loadOrdenDetails = async (orden: Orden, shouldScroll: boolean = true) => {
    try {
      setSelectedOrden(orden);
      const response = await apiService.getOrdenDetails(orden._id!);
      
      if (response.success) {
        setSubordenes(response.data.subordenes || []);
        setPlatillosDetalle(response.data.platillos || []);
        setProductosDetalle(response.data.productos || []);

        // Scroll to order details on mobile
        if (shouldScroll) {
          setTimeout(() => {
            if (orderDetailsRef.current && window.innerWidth < 1280) { // xl breakpoint
              orderDetailsRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            }
          }, 100);
        }
      } else {
        setError('Error cargando detalles de la orden');
        setSubordenes([]);
        setPlatillosDetalle([]);
        setProductosDetalle([]);
      }
    } catch (error) {
      setError('Error cargando detalles de la orden');
      setSubordenes([]);
      setPlatillosDetalle([]);
      setProductosDetalle([]);
    }
  };

  useEffect(() => {
    // Removed debug logs for cleaner code
  }, [platillos, guisos]);

  const handleRefresh = async () => {
    await loadData();
    if (selectedOrden) {
      await loadOrdenDetails(selectedOrden);
    }
  };

  // Funciones para el flujo modal de platillos (igual que NuevaOrden)
  const iniciarSeleccionPlatillo = () => {
    setPlatilloEnConstruccion({
      platillo: null,
      guiso: null,
      cantidad: 1,
      extras: [],
      notas: ''
    });
    setModalPlatilloOpen(true);
  };

  const seleccionarPlatillo = (platillo: Platillo) => {
    setPlatilloEnConstruccion(prev => ({ ...prev, platillo }));
    setModalPlatilloOpen(false);
    setModalGuisoOpen(true);
  };

  const seleccionarGuiso = (guiso: Guiso) => {
    setPlatilloEnConstruccion(prev => ({ ...prev, guiso }));
    setModalGuisoOpen(false);
    setModalExtrasOpen(true);
  };

  const toggleExtraEnConstruccion = (extra: Extra) => {
    setPlatilloEnConstruccion(prev => {
      const existeIndex = prev.extras.findIndex(e => e.idExtra === extra._id);
      if (existeIndex >= 0) {
        // Si ya existe, aumentar cantidad en 1 (sin exceder la cantidad del platillo)
        const extraActual = prev.extras[existeIndex];
        if (extraActual.cantidad >= prev.cantidad) {
          // No permitir agregar más extras que la cantidad del platillo
          return prev;
        }
        return {
          ...prev,
          extras: prev.extras.map((e, i) => 
            i === existeIndex ? { ...e, cantidad: e.cantidad + 1 } : e
          )
        };
      } else {
        // Si no existe, lo agregamos con cantidad 1 y avanzamos automáticamente
        const nuevosExtras = [...prev.extras, {
          idExtra: extra._id,
          nombreExtra: extra.nombre,
          costoExtra: extra.costo,
          idTipoExtra: extra.idTipoExtra,
          cantidad: 1
        }];
        
        // Avanzar automáticamente después de agregar el primer extra
        setTimeout(() => {
          setModalExtrasOpen(false);
          setModalNotasOpen(true);
        }, 300);
        
        return {
          ...prev,
          extras: nuevosExtras
        };
      }
    });
  };

  const actualizarCantidadExtraEnConstruccion = (idExtra: string, cantidad: number) => {
    setPlatilloEnConstruccion(prev => ({
      ...prev,
      extras: prev.extras.map(e => 
        e.idExtra === idExtra 
          ? { ...e, cantidad: Math.max(1, Math.min(prev.cantidad, cantidad)) }
          : e
      )
    }));
  };

  const eliminarExtraEnConstruccion = (idExtra: string) => {
    setPlatilloEnConstruccion(prev => ({
      ...prev,
      extras: prev.extras.filter(e => e.idExtra !== idExtra)
    }));
  };

  const saltarExtras = () => {
    setModalExtrasOpen(false);
    setModalNotasOpen(true);
  };

  const finalizarPlatillo = async () => {
    if (!platilloEnConstruccion.platillo || !platilloEnConstruccion.guiso || !selectedOrden) {
      setError('Error al agregar platillo');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let subordenId = '';
      if (subordenes.length === 0) {
        const subordenData = { nombre: 'Suborden 1' };
        const subordenResponse = await apiService.addSuborden(selectedOrden._id!, subordenData);
        if (subordenResponse.success) {
          subordenId = subordenResponse.data._id;
          setSubordenes([subordenResponse.data]);
        } else {
          setError('Error creando suborden');
          setSaving(false);
          return;
        }
      } else {
        subordenId = subordenes[0]._id!;
      }

      const platilloData = {
        idPlatillo: Number(platilloEnConstruccion.platillo._id),
        nombrePlatillo: platilloEnConstruccion.platillo.nombre,
        idGuiso: Number(platilloEnConstruccion.guiso._id),
        nombreGuiso: platilloEnConstruccion.guiso.nombre,
        costoPlatillo: precioVenta(platilloEnConstruccion.platillo),
        cantidad: platilloEnConstruccion.cantidad,
        notas: platilloEnConstruccion.notas
      };

      const response = await apiService.addPlatillo(subordenId, platilloData);

      if (response.success) {
        // Agregar extras si existen
        if (platilloEnConstruccion.extras.length > 0) {
          const platilloId = response.data._id;
          for (const extra of platilloEnConstruccion.extras) {
            const extraData = {
              idOrdenDetallePlatillo: platilloId,
              idExtra: extra.idExtra,
              nombreExtra: extra.nombreExtra,
              costoExtra: extra.costoExtra,
              cantidad: extra.cantidad
            };
            await apiService.addDetalleExtra(extraData);
          }
        }

        // Actualizar el estatus de la orden si no está en Recepcion
        if (selectedOrden.estatus !== 'Recepcion') {
          const statusResponse = await apiService.updateOrdenStatus(selectedOrden._id!, 'Recepcion');
          if (statusResponse.success) {
            // Actualizar el objeto selectedOrden con el nuevo estatus
            setSelectedOrden({ ...selectedOrden, estatus: 'Recepcion' });
          }
        }

        // Actualizar la fecha y hora de la orden a la hora actual
        try {
          await apiService.updateOrdenFechaHora(selectedOrden._id!);
        } catch (error) {
          console.warn('Error actualizando fecha y hora de la orden:', error);
        }

        setSuccess('Platillo agregado exitosamente');
        // Refrescar solo el resumen de la orden expandida, sin hacer scroll
        await loadOrdenDetails(selectedOrden, false);
        // Actualizar el estado ordenesDetalles para el resumen móvil (usar siempre el ID de la orden)
        if (selectedOrden && selectedOrden._id) {
          const detallesResponse = await apiService.getOrdenDetails(selectedOrden._id);
          if (detallesResponse.success) {
            setOrdenesDetalles(prev => ({
              ...prev,
              [selectedOrden._id]: {
                platillos: detallesResponse.data.platillos || [],
                productos: detallesResponse.data.productos || []
              }
            }));
          }
        }
        await loadData(); // Refrescar la lista de órdenes para mostrar el nuevo estatus
        setModalNotasOpen(false);
        // Limpiar el estado de construcción
        setPlatilloEnConstruccion({
          platillo: null,
          guiso: null,
          cantidad: 1,
          extras: [],
          notas: ''
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error agregando platillo');
      }
    } catch (error) {
      setError('Error agregando platillo');
    } finally {
      setSaving(false);
    }
  };

  const cancelarSeleccionPlatillo = () => {
    setModalPlatilloOpen(false);
    setModalGuisoOpen(false);
    setModalExtrasOpen(false);
    setModalNotasOpen(false);
    setPlatilloEnConstruccion({
      platillo: null,
      guiso: null,
      cantidad: 1,
      extras: [],
      notas: ''
    });
  };

  // Función para seleccionar producto directamente
  const seleccionarProducto = async (producto: any) => {
    if (!selectedOrden) {
      setError('No hay orden seleccionada');
      return;
    }

    if (producto.cantidad < 1) {
      setError('Stock insuficiente para el producto seleccionado');
      return;
    }

    // Si el producto tiene variantes, abrir modal de variantes
    if (producto.variantes && producto.variantes.length > 0) {
      setProductoConVariantes(producto);
      setModalProductoOpen(false);
      setModalVariantesOpen(true);
      return;
    }

    // Si no tiene variantes, agregar directamente
    agregarProductoDirecto(producto.nombre);
  };

  const agregarProductoDirecto = async (nombreProducto: string) => {
    if (!selectedOrden) return;

    const producto = productoConVariantes || productos.find(p => p.nombre === nombreProducto);
    if (!producto) return;

    setSaving(true);
    setError('');

    try {
      const productoData = {
        idOrden: selectedOrden._id!,
        idProducto: Number(producto._id),
        nombreProducto: nombreProducto,
        costoProducto: producto.costo,
        cantidad: 1
      };

      const response = await apiService.addProducto(selectedOrden._id!, productoData);

      if (response.success) {
        // NO cambiar el estatus cuando se agregan productos
        // El estatus solo cambia cuando se agregan platillos

        setSuccess('Producto agregado exitosamente');
        // Refrescar solo el resumen de la orden expandida, sin hacer scroll
        await loadOrdenDetails(selectedOrden, false);
        // Actualizar el estado ordenesDetalles para el resumen móvil (usar siempre el ID de la orden)
        if (selectedOrden && selectedOrden._id) {
          const detallesResponse = await apiService.getOrdenDetails(selectedOrden._id);
          if (detallesResponse.success) {
            setOrdenesDetalles(prev => ({
              ...prev,
              [selectedOrden._id]: {
                platillos: detallesResponse.data.platillos || [],
                productos: detallesResponse.data.productos || []
              }
            }));
          }
        }
        await loadData(); // Refrescar la lista de órdenes
        setModalProductoOpen(false);
        setModalVariantesOpen(false);
        setProductoConVariantes(null);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error agregando producto');
      }
    } catch (error) {
      setError('Error agregando producto');
    } finally {
      setSaving(false);
    }
  };

  const seleccionarVariante = (variante: string) => {
    if (!productoConVariantes) return;

    const nombreConVariante = `${productoConVariantes.nombre} - ${variante}`;
    agregarProductoDirecto(nombreConVariante);
  };

  const handleRemovePlatillo = async (id: string, skipModal: boolean = false) => {
    if (skipModal) {
      // Eliminación directa sin modal
      setSaving(true);
      setError('');
      try {
        const response = await apiService.removePlatillo(id);
        if (response.success) {
          setSuccess('Platillo eliminado exitosamente');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError('Error eliminando platillo');
        }
      } catch (error) {
        setError('Error eliminando platillo');
      } finally {
        setSaving(false);
      }
    } else {
      setConfirmDelete({ type: 'platillo', id });
    }
  };

  const handleRemoveProducto = async (id: string, skipModal: boolean = false) => {
    if (skipModal) {
      // Eliminación directa sin modal
      setSaving(true);
      setError('');
      try {
        const response = await apiService.removeProducto(id);
        if (response.success) {
          setSuccess('Producto eliminado exitosamente');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError('Error eliminando producto');
        }
      } catch (error) {
        setError('Error eliminando producto');
      } finally {
        setSaving(false);
      }
    } else {
      setConfirmDelete({ type: 'producto', id });
    }
  };

  const confirmDeleteAction = async () => {
    if (!selectedOrden || !confirmDelete) return;
    setSaving(true);
    setError('');
    try {
      let response;
      if (confirmDelete.type === 'platillo') {
        response = await apiService.removePlatillo(confirmDelete.id);
      } else {
        response = await apiService.removeProducto(confirmDelete.id);
      }
      if (response.success) {
        setSuccess(
          confirmDelete.type === 'platillo'
            ? 'Platillo eliminado exitosamente'
            : 'Producto eliminado exitosamente'
        );
        await loadOrdenDetails(selectedOrden);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(
          confirmDelete.type === 'platillo'
            ? 'Error eliminando platillo'
            : 'Error eliminando producto'
        );
      }
    } catch (error) {
      setError(
        confirmDelete.type === 'platillo'
          ? 'Error eliminando platillo'
          : 'Error eliminando producto'
      );
    } finally {
      setSaving(false);
      setConfirmDelete(null);
    }
  };

  // Funciones para manejar la edición de notas
  const handleEditNota = (platilloId: string, currentNota: string) => {
    setEditingNota(platilloId);
    setTempNota(currentNota || '');
  };

  const handleSaveNota = async (platilloId: string) => {
    if (!selectedOrden) return;
    
    setSavingNota(true);
    setError('');
    
    try {
      const response = await apiService.updatePlatilloNota(platilloId, tempNota);
      
      if (response.success) {
        setSuccess('Nota actualizada exitosamente');
        await loadOrdenDetails(selectedOrden);
        setEditingNota(null);
        setTempNota('');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error actualizando la nota');
      }
    } catch (error) {
      setError('Error actualizando la nota');
    } finally {
      setSavingNota(false);
    }
  };

  const handleCancelEditNota = () => {
    setEditingNota(null);
    setTempNota('');
  };

  const handleUpdateStatus = async (ordenId: string, newStatus: string) => {
    setUpdatingStatus(ordenId);
    setError('');
    try {
      const response = await apiService.updateOrdenStatus(ordenId, newStatus);
      if (response.success) {
        setSuccess(`Orden actualizada a ${newStatus} exitosamente`);
        await loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error actualizando el estatus de la orden');
      }
    } catch (error) {
      setError('Error actualizando el estatus de la orden');
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6 py-2 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Editar Orden</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Selecciona una orden para ver detalles y modificar</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex-shrink-0 p-2 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center disabled:opacity-50"
          title="Actualizar"
        >
          <RefreshCw className={`w-5 h-5 sm:w-4 sm:h-4 sm:mr-2 flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline truncate">Actualizar</span>
        </button>
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

      <div className="grid gap-3 sm:gap-6 grid-cols-1 xl:grid-cols-2">
        {/* Orders List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 sm:p-6 min-w-0">
          <div className="flex items-center space-x-2 mb-2 sm:mb-6">
            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 break-words">Órdenes Editables</h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {mesasAgrupadas.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 text-sm sm:text-base">No hay órdenes disponibles para editar</p>
              </div>
            ) : (
              mesasAgrupadas.map((mesa) => (
                <div key={mesa.idMesa} className="bg-white rounded-xl shadow-sm border border-gray-200">
                  {/* Mesa Header - Clickable to expand/collapse */}
                  <div 
                    className="p-3 sm:p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleMesaExpansion(mesa.idMesa)}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xs sm:text-base lg:text-lg font-semibold text-gray-900 break-words">
                              {mesa.nombreMesa}
                            </h3>
                            {/* Leyenda de Mesa/Pedido Pagado */}
                            {todasLasOrdenesDeMesaPagadas(mesa) && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-green-100 text-green-800 whitespace-nowrap">
                                {mesa.nombreMesa.toLowerCase().startsWith('pedido') ? 'Pedido Pagado' : 'Mesa Pagada'}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-sm text-gray-600">
                            {mesa.totalOrdenes} {mesa.totalOrdenes === 1 ? 'orden' : 'órdenes'}
                          </p>
                          {/* Lista de clientes de las órdenes en la mesa */}
                          {Object.keys(mesa.clientes).length > 0 && (
                            <ul className="mt-1 text-xs text-gray-700 flex flex-wrap gap-1">
                              {Object.keys(mesa.clientes).map((cliente, idx) => (
                                <li key={cliente + idx} className="bg-gray-100 rounded px-2 py-0.5 whitespace-nowrap">
                                  {cliente}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3 flex-shrink-0">
                        <div className="text-left sm:text-right">
                          <p className="text-sm sm:text-base font-semibold text-green-600">
                            ${mesa.totalMonto.toFixed(2)}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-600">Total</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          {/* Botón para eliminar mesa completa */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Evitar que se expanda/contraiga la mesa
                              handleDeleteMesa(mesa);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            title="Eliminar mesa completa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {/* Icono de expandir/contraer */}
                          {expandedMesas.has(mesa.idMesa) ? (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Botones de acción rápida a nivel de mesa */}
                    <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Obtener la primera orden de la primera lista de clientes
                          const primeraOrden = Object.values(mesa.clientes)[0]?.[0];
                          if (primeraOrden) {
                            setSelectedOrden(primeraOrden);
                            loadOrdenDetails(primeraOrden, false); // No hacer scroll
                            iniciarSeleccionPlatillo();
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] sm:text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                        title="Agregar platillo a la primera orden"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Platillo</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Obtener la primera orden de la primera lista de clientes
                          const primeraOrden = Object.values(mesa.clientes)[0]?.[0];
                          if (primeraOrden) {
                            setSelectedOrden(primeraOrden);
                            loadOrdenDetails(primeraOrden, false); // No hacer scroll
                            setModalProductoOpen(true);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] sm:text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        title="Agregar producto a la primera orden"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Producto</span>
                      </button>
                    </div>
                  </div>

                  {/* Orders grouped by client - Expanded view */}
                  {expandedMesas.has(mesa.idMesa) && (
                    <div className="p-3 sm:p-4">
                      <div className="space-y-3 sm:space-y-4">
                        {Object.entries(mesa.clientes).map(([cliente, ordenesCliente]) => (
                          <div key={cliente} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 text-xs sm:text-base break-words">
                              Cliente: {cliente} ({ordenesCliente.length} {ordenesCliente.length === 1 ? 'orden' : 'órdenes'})
                            </h4>
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                              {ordenesCliente.map((orden) => (
                                <div
                                  key={orden._id}
                                  className={`bg-white rounded-lg border p-2 sm:p-3 transition-colors relative ${
                                    selectedOrden?._id === orden._id
                                      ? 'border-orange-500 bg-orange-50'
                                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                                  }`}
                                >
                                  {/* Diseño de dos columnas compacto */}
                                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                    {/* Columna izquierda - Información principal */}
                                    <div 
                                      onClick={() => loadOrdenDetails(orden)}
                                      className="cursor-pointer min-w-0"
                                    >
                                      <h5 className="font-medium text-gray-900 text-[11px] sm:text-sm break-words">
                                        Orden #{orden._id?.toString().slice(-6)}
                                      </h5>
                                      <p className="text-[9px] sm:text-xs text-gray-600 mt-0.5">
                                        {new Date(orden.fechaHora ?? orden.fecha ?? '').toLocaleTimeString('es-ES', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                      <p className="text-[10px] sm:text-xs font-medium text-green-600 mt-0.5">
                                        Total: ${orden.total.toFixed(2)}
                                      </p>
                                    </div>
                                    
                                    {/* Columna derecha - Estatus y acciones */}
                                    <div className="flex flex-col items-end justify-between gap-1">
                                      <div className="flex flex-col items-end gap-1 w-full">
                                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-xs font-medium rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">
                                          {orden.estatus}
                                        </span>
                                        {orden.estatus === 'Pendiente' && (
                                          <button
                                            onClick={() => handleUpdateStatus(orden._id!, 'Recepcion')}
                                            disabled={updatingStatus === orden._id}
                                            className="flex items-center justify-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                                            title="Confirmar orden"
                                          >
                                            {updatingStatus === orden._id ? (
                                              <div className="animate-spin rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 border-b-2 border-white"></div>
                                            ) : (
                                              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                      
                                      {/* Botón eliminar orden en columna derecha */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteOrder(orden);
                                        }}
                                        className="p-0.5 sm:p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                        title="Eliminar orden"
                                      >
                                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Notas de la orden - Debajo del grid, si existen */}
                                  {orden.notas && (
                                    <div className="flex items-start space-x-1 mt-1.5 pt-1.5 border-t border-gray-200">
                                      <StickyNote className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                      <p className="text-[9px] sm:text-xs text-gray-700 italic line-clamp-2 break-words">
                                        {orden.notas}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Botones de acción rápida - más compactos */}
                                  <div className="flex items-center justify-end gap-1 mt-1.5 pt-1.5 border-t border-gray-200">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrden(orden);
                                        loadOrdenDetails(orden, false); // No hacer scroll
                                        iniciarSeleccionPlatillo();
                                      }}
                                      className="flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                                      title="Agregar platillo"
                                    >
                                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                      <span>Platillo</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrden(orden);
                                        loadOrdenDetails(orden, false); // No hacer scroll
                                        setModalProductoOpen(true);
                                      }}
                                      className="flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                      title="Agregar producto"
                                    >
                                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                      <span>Producto</span>
                                    </button>
                                  </div>

                                  {/* Resumen de platillos y productos - Visible en móvil y tablet, oculto en desktop (xl) */}
                                  {ordenesDetalles[orden._id!] && (
                                    <div className="block xl:hidden mt-2 pt-2 border-t border-gray-200">
                                      {/* Header del resumen - Clickeable para expandir/colapsar */}
                                      <div 
                                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleResumenExpansion(orden._id!);
                                        }}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <h6 className="text-[10px] font-semibold text-gray-700">Resumen</h6>
                                          <span className="text-[9px] text-gray-500">
                                            ({ordenesDetalles[orden._id!].platillos.reduce((total: number, p: any) => total + (p.cantidad || 1), 0)} platillos)
                                          </span>
                                        </div>
                                        {resumenesExpandidos.has(orden._id!) ? (
                                          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                                        )}
                                      </div>

                                      {/* Contenido del resumen - Solo se muestra si está expandido */}
                                      {resumenesExpandidos.has(orden._id!) && (
                                        <div className="mt-1.5">
                                          {/* Platillos */}
                                          {ordenesDetalles[orden._id!].platillos.length > 0 && (
                                            <div className="mb-2">
                                              <p className="text-[9px] font-medium text-orange-600 mb-1">Platillos:</p>
                                              <div className="space-y-1">
                                                {ordenesDetalles[orden._id!].platillos.map((platillo: any, idx: number) => (
                                              <div key={idx} className="flex items-center justify-between text-[10px] bg-orange-50 rounded px-1.5 py-1">
                                                <span className="text-gray-700 flex-1 truncate">
                                                  <span className="flex flex-wrap items-center gap-1">
                                                    <span>{platillo.cantidad}x {platillo.nombrePlatillo}</span>
                                                    {platillo.nombreGuiso && (
                                                      <span className="text-gray-500 italic">| Guiso: {platillo.nombreGuiso}</span>
                                                    )}
                                                    {platillo.extras && platillo.extras.length > 0 && (
                                                      <span className="text-purple-600 text-[9px]">
                                                        +{platillo.extras.length} extra{platillo.extras.length > 1 ? 's' : ''}
                                                      </span>
                                                    )}
                                                  </span>
                                                </span>
                                                <button
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('¿Eliminar este platillo?')) {
                                                      await handleRemovePlatillo(platillo._id, true);
                                                      // Recargar detalles de esta orden
                                                      const response = await apiService.getOrdenDetails(orden._id!);
                                                      if (response.success) {
                                                        setOrdenesDetalles(prev => ({
                                                          ...prev,
                                                          [orden._id!]: {
                                                            platillos: response.data.platillos || [],
                                                            productos: response.data.productos || []
                                                          }
                                                        }));
                                                      }
                                                      // Si la orden seleccionada es esta, actualizar también
                                                      if (selectedOrden?._id === orden._id) {
                                                        await loadOrdenDetails(orden, false);
                                                      }
                                                      await loadData();
                                                    }
                                                  }}
                                                  className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                                                  title="Eliminar platillo"
                                                >
                                                  <Minus className="w-3 h-3" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Productos */}
                                      {ordenesDetalles[orden._id!].productos.length > 0 && (
                                        <div>
                                          <p className="text-[9px] font-medium text-blue-600 mb-1">Productos:</p>
                                          <div className="space-y-1">
                                            {ordenesDetalles[orden._id!].productos.map((producto: any, idx: number) => (
                                              <div key={idx} className="flex items-center justify-between text-[10px] bg-blue-50 rounded px-1.5 py-1">
                                                <span className="text-gray-700 truncate flex-1">
                                                  {producto.cantidad}x {producto.nombreProducto}
                                                </span>
                                                <button
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('¿Eliminar este producto?')) {
                                                      await handleRemoveProducto(producto._id, true);
                                                      // Recargar detalles de esta orden
                                                      const response = await apiService.getOrdenDetails(orden._id!);
                                                      if (response.success) {
                                                        setOrdenesDetalles(prev => ({
                                                          ...prev,
                                                          [orden._id!]: {
                                                            platillos: response.data.platillos || [],
                                                            productos: response.data.productos || []
                                                          }
                                                        }));
                                                      }
                                                      // Si la orden seleccionada es esta, actualizar también
                                                      if (selectedOrden?._id === orden._id) {
                                                        await loadOrdenDetails(orden, false);
                                                      }
                                                      await loadData();
                                                    }
                                                  }}
                                                  className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                                                  title="Eliminar producto"
                                                >
                                                  <Minus className="w-3 h-3" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                          {/* Mensaje si no hay items */}
                                          {ordenesDetalles[orden._id!].platillos.length === 0 && 
                                           ordenesDetalles[orden._id!].productos.length === 0 && (
                                            <p className="text-[9px] text-gray-500 italic">Sin items</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
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
        <div ref={orderDetailsRef} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 min-w-0">
          <div className="flex flex-col space-y-3 sm:space-y-4">
            {/* Header con información de la orden */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
                  {selectedOrden
                    ? `${getMostrarNombreMesaOrden(selectedOrden)} | Folio: ${selectedOrden.folio}`
                    : 'Selecciona una orden'}
                </h2>
                {selectedOrden && selectedOrden.nombreCliente && (
                  <p className="text-sm sm:text-base text-gray-600 mt-1 break-words">
                    Cliente: <span className="font-medium">{selectedOrden.nombreCliente}</span>
                  </p>
                )}
                {selectedOrden && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedOrden.estatus === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      selectedOrden.estatus === 'Preparacion' ? 'bg-blue-100 text-blue-800' :
                      selectedOrden.estatus === 'Surtida' ? 'bg-green-100 text-green-800' :
                      selectedOrden.estatus === 'Entregada' ? 'bg-gray-100 text-gray-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {selectedOrden.estatus}
                    </span>
                    <span className="text-sm text-gray-500">
                      Total: <span className="font-semibold text-green-600">${selectedOrden.total.toFixed(2)}</span>
                    </span>
                  </div>
                )}
              </div>
              
              {/* Botón de eliminar arriba a la derecha */}
              {selectedOrden && (
                <button
                  onClick={() => handleDeleteOrder(selectedOrden)}
                  className="w-24 sm:w-auto px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center justify-center flex-shrink-0"
                  title="Eliminar orden"
                >
                  <Trash2 className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>Eliminar</span>
                </button>
              )}
            </div>

            {/* Botones de acción para agregar */}
            {selectedOrden && (
              <div className="flex flex-row space-x-2">
                <button
                  onClick={iniciarSeleccionPlatillo}
                  className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>Platillo</span>
                </button>
                <button
                  onClick={() => setModalProductoOpen(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>Producto</span>
                </button>
              </div>
            )}
          </div>

          {!selectedOrden ? (
            <div className="text-center py-8 sm:py-12">
              <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">Selecciona una orden para ver los detalles</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Platillos */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Platillos</h3>
                  <span className="text-sm text-gray-500">{platillosDetalle.length} items</span>
                </div>
                <div className="space-y-3">
                    {platillosDetalle.length === 0 ? (
                      <p className="text-gray-500 text-xs sm:text-sm">No hay platillos agregados</p>
                    ) : (
                      platillosDetalle.map((detalle, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{detalle.nombrePlatillo || detalle.platillo || `Platillo ${index + 1}`}</p>
                            
                            {/* Sección de notas - editable */}
                            {editingNota === detalle._id ? (
                              <div className="flex items-center space-x-2 mt-2">
                                <input
                                  type="text"
                                  value={tempNota}
                                  onChange={(e) => setTempNota(e.target.value)}
                                  className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Escribe una nota..."
                                  disabled={savingNota}
                                />
                                <button
                                  onClick={() => handleSaveNota(detalle._id!)}
                                  disabled={savingNota}
                                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  {savingNota ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                  onClick={handleCancelEditNota}
                                  disabled={savingNota}
                                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="mt-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-start space-x-1 flex-1">
                                    <StickyNote className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      {detalle.notas ? (
                                        <p className="text-xs text-blue-600 italic break-words">
                                          Notas: {detalle.notas}
                                        </p>
                                      ) : (
                                        <p className="text-xs text-gray-400 italic">
                                          Sin notas
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleEditNota(detalle._id!, detalle.notas || '')}
                                    className="ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                                    title={detalle.notas ? "Editar nota" : "Agregar nota"}
                                  >
                                    {detalle.notas ? "Edit." : "+"} nota
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            <p className="text-xs sm:text-sm text-gray-600 truncate">Guiso: {detalle.nombreGuiso || detalle.guiso}</p>
                            <p className="text-xs sm:text-sm text-gray-600">Cantidad: {detalle.cantidad}</p>
                            
                            {/* Mostrar extras del platillo */}
                            {detalle.extras && detalle.extras.length > 0 && (
                              <div className="mt-1 sm:mt-2 p-1 sm:p-2 bg-purple-50 rounded-md border border-purple-200">
                                <p className="text-xs font-medium text-purple-800 mb-0.5 sm:mb-1">Extras:</p>
                                <div className="space-y-0.5 sm:space-y-1">
                                  {detalle.extras.map((extra, extraIndex) => (
                                    <div key={extraIndex} className="flex justify-between items-center text-xs">
                                      <span className="text-purple-700">
                                        {extra.nombreExtra} (x{extra.cantidad})
                                      </span>
                                      <span className="font-medium text-purple-600">
                                        ${(extra.costoExtra * extra.cantidad).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Status indicators for dispatched items */}
                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                              {detalle.listo && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full whitespace-nowrap">
                                  Listo
                                </span>
                              )}
                              {detalle.entregado && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full whitespace-nowrap">
                                  Entregado
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-end flex-shrink-0 space-x-2">
                            <button
                              onClick={() => {
                                setSelectedPlatilloForExtras(detalle._id!);
                                setShowExtrasModal(true);
                              }}
                              disabled={detalle.entregado}
                              className={`p-2 rounded-lg transition-colors ${
                                detalle.entregado 
                                  ? 'text-gray-400 cursor-not-allowed bg-gray-100' 
                                  : 'text-purple-600 hover:bg-purple-50'
                              }`}
                              title={detalle.entregado ? "No se pueden agregar extras a platillos entregados" : (detalle.extras && detalle.extras.length > 0 ? "Editar extras" : "Agregar extras")}
                            >
                              {detalle.extras && detalle.extras.length > 0 ? (
                                <Edit3 className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleRemovePlatillo(detalle._id!)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar platillo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                </div>
              </div>

              {/* Productos */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Productos</h3>
                  <span className="text-sm text-gray-500">{productosDetalle.length} items</span>
                </div>
                <div className="space-y-3">
                    {productosDetalle.length === 0 ? (
                      <p className="text-gray-500 text-xs sm:text-sm">No hay productos agregados</p>
                    ) : (
                      productosDetalle.map((detalle, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{detalle.nombreProducto || detalle.producto || `Producto ${index + 1}`}</p>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">Tipo: {detalle.idProducto ? detalle.idProducto : 'N/A'}</p>
                            <p className="text-xs sm:text-sm text-gray-600">Cantidad: {detalle.cantidad}</p>
                            {/* Status indicators for dispatched items */}
                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                              {detalle.listo && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full whitespace-nowrap">
                                  Listo
                                </span>
                              )}
                              {detalle.entregado && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full whitespace-nowrap">
                                  Entregado
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-end flex-shrink-0">
                            <button
                              onClick={() => handleRemoveProducto(detalle._id!)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Selección de Platillo */}
      {modalPlatilloOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Selecciona un Platillo</h3>
              <button onClick={cancelarSeleccionPlatillo} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {platillos.filter(p => p.activo).map(platillo => (
                <button
                  key={platillo._id}
                  onClick={() => seleccionarPlatillo(platillo)}
                  className="p-3 bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 rounded-lg transition-colors text-left"
                >
                  <p className="font-medium text-gray-900 text-sm">{platillo.nombre}</p>
                  <p className="text-orange-600 font-bold text-xs">${precioVenta(platillo).toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selección de Guiso */}
      {modalGuisoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Selecciona un Guiso</h3>
                {platilloEnConstruccion.platillo && (
                  <p className="text-sm text-gray-600">Para: {platilloEnConstruccion.platillo.nombre}</p>
                )}
              </div>
              <button onClick={cancelarSeleccionPlatillo} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {guisos.filter(g => g.activo).map(guiso => (
                <button
                  key={guiso._id}
                  onClick={() => seleccionarGuiso(guiso)}
                  className="p-3 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg transition-colors"
                >
                  <p className="font-medium text-gray-900 text-sm">{guiso.nombre}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selección de Extras */}
      {modalExtrasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Selección de Extras</h3>
                <p className="text-sm text-gray-600">Haz clic en un extra para agregarlo. Se avanzará automáticamente.</p>
              </div>
              <button onClick={cancelarSeleccionPlatillo} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {tiposExtras.filter(t => t.activo).map(tipo => {
                const extrasDelTipo = extras.filter(e => e.activo && e.idTipoExtra === tipo._id);
                if (extrasDelTipo.length === 0) return null;

                return (
                  <div key={tipo._id}>
                    <h4 className="font-semibold text-purple-600 mb-2">{tipo.nombre}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {extrasDelTipo.map(extra => {
                        const extraSeleccionado = platilloEnConstruccion.extras.find(e => e.idExtra === extra._id);
                        const cantidad = extraSeleccionado?.cantidad || 0;

                        return (
                          <button
                            key={extra._id}
                            onClick={() => toggleExtraEnConstruccion(extra)}
                            className={`p-3 border-2 rounded-lg transition-colors text-left ${
                              cantidad > 0
                                ? 'bg-purple-100 border-purple-500'
                                : 'bg-purple-50 hover:bg-purple-100 border-purple-200'
                            }`}
                          >
                            <p className="font-medium text-gray-900 text-sm">{extra.nombre}</p>
                            <p className="text-purple-600 font-bold text-xs">+${extra.costo}</p>
                            {cantidad > 0 && (
                              <p className="text-xs text-purple-700 font-bold mt-1">Cantidad: {cantidad}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={() => {
                  setModalExtrasOpen(false);
                  setModalGuisoOpen(true);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Volver a Guisos
              </button>
              <button
                onClick={saltarExtras}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                {platilloEnConstruccion.extras.length > 0 ? 'Siguiente' : 'Sin Extras'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notas y Cantidad del Platillo */}
      {modalNotasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-2 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Cantidad y Notas</h3>
              <button onClick={cancelarSeleccionPlatillo} className="text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Selector de cantidad */}
            <div className="mb-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => {
                    const nuevaCantidad = Math.max(1, platilloEnConstruccion.cantidad - 1);
                    setPlatilloEnConstruccion(prev => ({
                      ...prev,
                      cantidad: nuevaCantidad,
                      extras: prev.extras.map(e => ({
                        ...e,
                        cantidad: Math.min(e.cantidad, nuevaCantidad)
                      }))
                    }));
                  }}
                  className="p-1 sm:p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <span className="text-lg sm:text-xl font-bold w-12 sm:w-14 text-center">{platilloEnConstruccion.cantidad}</span>
                <button
                  onClick={() => setPlatilloEnConstruccion(prev => ({ ...prev, cantidad: prev.cantidad + 1 }))}
                  className="p-1 sm:p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Campo de notas */}
            <div className="mb-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Notas (Opcional)
              </label>
              <textarea
                value={platilloEnConstruccion.notas}
                onChange={(e) => setPlatilloEnConstruccion(prev => ({ ...prev, notas: e.target.value }))}
                maxLength={200}
                rows={2}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-xs sm:text-sm"
                placeholder="Ej: Sin cebolla, extra salsa"
              />
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                {platilloEnConstruccion.notas.length}/200
              </p>
            </div>

            {/* Extras Seleccionados */}
            {platilloEnConstruccion.extras.length > 0 && (
              <div className="mb-2 p-1.5 sm:p-2 bg-purple-50 rounded-lg border border-purple-200 max-h-32 sm:max-h-36 overflow-y-auto">
                <h4 className="font-semibold text-purple-700 mb-1 text-[10px] sm:text-xs">Extras</h4>
                <div className="space-y-0.5">
                  {platilloEnConstruccion.extras.map(extra => {
                    const alcanzoLimite = extra.cantidad >= platilloEnConstruccion.cantidad;
                    return (
                      <div key={extra.idExtra} className="flex items-center justify-between bg-white p-1 rounded text-[10px] sm:text-xs">
                        <span className="font-medium text-gray-900 truncate flex-1 mr-1">{extra.nombreExtra}</span>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <span className="text-[10px] sm:text-xs font-semibold text-purple-600">+${extra.costoExtra}</span>
                          <button
                            onClick={() => {
                              if (extra.cantidad === 1) {
                                eliminarExtraEnConstruccion(extra.idExtra);
                              } else {
                                actualizarCantidadExtraEnConstruccion(extra.idExtra, extra.cantidad - 1);
                              }
                            }}
                            className="p-1.5 sm:p-2 bg-gray-200 hover:bg-gray-300 rounded active:scale-95 transition-transform"
                          >
                            <Minus className="w-5 h-5 sm:w-6 sm:h-6" />
                          </button>
                          <span className="w-8 sm:w-10 text-center text-sm sm:text-base font-bold">{extra.cantidad}</span>
                          <button
                            onClick={() => actualizarCantidadExtraEnConstruccion(extra.idExtra, extra.cantidad + 1)}
                            disabled={alcanzoLimite}
                            className={`p-1.5 sm:p-2 rounded active:scale-95 transition-transform ${
                              alcanzoLimite
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                          >
                            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9px] sm:text-[10px] text-purple-600 mt-0.5">
                  Máx. {platilloEnConstruccion.cantidad} por tipo
                </p>
              </div>
            )}

            {/* Resumen */}
            <div className="mb-2 p-1.5 sm:p-2 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-0.5 text-[10px] sm:text-xs">Resumen</h4>
              <p className="text-[10px] sm:text-xs text-gray-600">
                <span className="font-medium">{platilloEnConstruccion.platillo?.nombre}</span> con{' '}
                <span className="font-medium">{platilloEnConstruccion.guiso?.nombre}</span>
              </p>
              <p className="text-[10px] sm:text-xs text-gray-600">Cantidad: {platilloEnConstruccion.cantidad}</p>
              {(() => {
                const totalExtras = platilloEnConstruccion.extras.reduce((sum, e) => sum + e.cantidad, 0);
                return (
                  <p className="text-[10px] sm:text-xs text-gray-600">
                    {totalExtras} extra{totalExtras > 1 ? 's' : ''} agregado{totalExtras > 1 ? 's' : ''}
                  </p>
                );
              })()}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setModalNotasOpen(false);
                  setModalExtrasOpen(true);
                }}
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs sm:text-sm"
              >
                Volver a Extras
              </button>
              <button
                onClick={cancelarSeleccionPlatillo}
                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs sm:text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={finalizarPlatillo}
                disabled={saving}
                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-xs sm:text-sm"
              >
                {saving ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selección de Producto */}
      {modalProductoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Selecciona un Producto</h3>
              <button onClick={() => setModalProductoOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {productos.filter(p => p.activo).map(producto => (
                <button
                  key={producto._id}
                  onClick={() => seleccionarProducto(producto)}
                  disabled={producto.cantidad < 1}
                  className={`p-3 border-2 rounded-lg transition-colors text-left ${
                    producto.cantidad < 1
                      ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                      : 'bg-blue-50 hover:bg-blue-100 border-blue-200'
                  }`}
                >
                  <p className="font-medium text-gray-900 text-sm">{producto.nombre}</p>
                  <p className="text-blue-600 font-bold text-xs">${producto.costo}</p>
                  {producto.cantidad < 1 && (
                    <p className="text-xs text-red-600 mt-1">Sin stock</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selección de Variantes */}
      {modalVariantesOpen && productoConVariantes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Seleccionar Variante</h3>
                <p className="text-sm text-gray-600 mt-1">{productoConVariantes.nombre}</p>
              </div>
              <button
                onClick={() => {
                  setModalVariantesOpen(false);
                  setProductoConVariantes(null);
                  setModalProductoOpen(true);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {productoConVariantes.variantes.map((variante: string, index: number) => (
                <button
                  key={index}
                  onClick={() => seleccionarVariante(variante)}
                  disabled={saving}
                  className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-center disabled:opacity-50"
                >
                  <div className="text-base font-semibold text-gray-900">{variante}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {productoConVariantes.nombre} - {variante}
                  </div>
                  <div className="text-sm text-green-600 font-medium mt-2">
                    ${productoConVariantes.costo}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setModalVariantesOpen(false);
                  setProductoConVariantes(null);
                  setModalProductoOpen(true);
                }}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Volver a Productos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar platillo/producto */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl p-3 sm:p-6 w-full max-w-sm">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              ¿Estás seguro que deseas eliminar este {confirmDelete.type === 'platillo' ? 'platillo' : 'producto'}?
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteAction}
                disabled={saving}
                className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm sm:text-base"
              >
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

  {/* Modal de Extras */}
  {showExtrasModal && selectedPlatilloForExtras && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg p-3 sm:p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-purple-700">
                Gestionar Extras - {platillosDetalle.find(p => p._id === selectedPlatilloForExtras)?.nombrePlatillo}
              </h3>
              <button
                onClick={() => {
                  setShowExtrasModal(false);
                  setSelectedPlatilloForExtras(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {tiposExtras.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">No hay tipos de extras disponibles</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tipos de extras: {tiposExtras.length}, Extras: {extras.length}
                  </p>
                </div>
              ) : (
                tiposExtras.map(tipo => {
                  const extrasDelTipo = extras.filter(e => e.idTipoExtra === tipo._id);
                  if (extrasDelTipo.length === 0) return null;

                  return (
                    <div key={tipo._id} className="border-b pb-3">
                      <h4 className="font-semibold text-purple-600 mb-2">{tipo.nombre}</h4>
                      <div className="grid gap-2">
                        {extrasDelTipo.map(extra => {
                          const platilloDetalle = platillosDetalle.find((d: any) => d._id === selectedPlatilloForExtras);
                          return (
                            <ExtraCantidadControl
                              key={extra._id}
                              extra={extra}
                              platilloDetalle={platilloDetalle}
                              selectedPlatilloForExtras={selectedPlatilloForExtras}
                              setError={setError}
                              setSuccess={setSuccess}
                              selectedOrden={selectedOrden}
                              loadOrdenDetails={loadOrdenDetails}
                              apiService={apiService}
                              setShowExtrasModal={setShowExtrasModal}
                              setSelectedPlatilloForExtras={setSelectedPlatilloForExtras}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ...eliminado el botón 'Cerrar' de la parte inferior... */}
          </div>
        </div>
      )}
    </div>
    {/* Modal de confirmación para eliminar mesa completa */}
    {showDeleteMesaModal && selectedMesaToDelete && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl p-3 sm:p-6 w-full max-w-sm">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            ¿Eliminar mesa/pedido completa?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Se eliminarán todas las {selectedMesaToDelete.totalOrdenes} órdenes de "{selectedMesaToDelete.nombreMesa}". Esta acción no se puede deshacer.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              onClick={() => {
                setShowDeleteMesaModal(false);
                setSelectedMesaToDelete(null);
              }}
              disabled={deletingMesa}
              className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDeleteMesa}
              disabled={deletingMesa}
              className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm sm:text-base"
            >
              {deletingMesa ? 'Eliminando...' : 'Eliminar Mesa'}
            </button>
          </div>
        </div>
      </div>
    )}
    {/* Modal de confirmación para eliminar orden (dentro del fragmento raíz) */}
    {showDeleteOrderModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl p-3 sm:p-6 w-full max-w-sm">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            ¿Estás seguro que deseas eliminar esta orden? Esta acción no se puede deshacer.
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              onClick={() => setShowDeleteOrderModal(false)}
              disabled={deletingOrder}
              className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              onClick={() => { console.log('Click en botón Eliminar del modal'); confirmDeleteOrder(); }}
              disabled={deletingOrder}
              className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm sm:text-base"
            >
              {deletingOrder ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
};

// Componente para controlar la cantidad de un extra (fuera del componente principal)
type ExtraCantidadControlProps = {
  extra: Extra;
  platilloDetalle: any;
  selectedPlatilloForExtras: string;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
  selectedOrden: Orden | null;
  loadOrdenDetails: (orden: Orden) => Promise<void>;
  apiService: typeof apiService;
  setShowExtrasModal: (show: boolean) => void;
  setSelectedPlatilloForExtras: (id: string | null) => void;
};

function ExtraCantidadControl(props: ExtraCantidadControlProps) {
  const {
    extra,
    platilloDetalle,
    selectedPlatilloForExtras,
    setError,
    setSuccess,
    selectedOrden,
    loadOrdenDetails,
    apiService,
    setShowExtrasModal,
    setSelectedPlatilloForExtras
  } = props;
  const extraDetalle = platilloDetalle?.extras?.find(function(e: any) { return e.idExtra === extra._id; });
  const cantidadExtra = extraDetalle?.cantidad || 0;
  const [inputCantidad, setInputCantidad] = React.useState(cantidadExtra);

  // El botón Guardar solo se habilita si la cantidad cambió respecto al guardado
  const cantidadCambiada = Number(inputCantidad) !== cantidadExtra;

  React.useEffect(function() {
    setInputCantidad(cantidadExtra);
  }, [cantidadExtra]);

  function handleCantidadChange(val: number) {
    if (platilloDetalle?.entregado) {
      setError('No se pueden modificar extras de platillos entregados');
      return;
    }
    if (val < 0) return;
    setInputCantidad(val);
  }

  async function guardarCantidad() {
    if (platilloDetalle?.entregado) {
      setError('No se pueden modificar extras de platillos entregados');
      return;
    }
    var nuevaCantidad = Number(inputCantidad);
    if (isNaN(nuevaCantidad) || nuevaCantidad < 0) return;
    if (nuevaCantidad === cantidadExtra) return;
    if (nuevaCantidad === 0 && extraDetalle && extraDetalle._id) {
      // Eliminar extra
      var response = await apiService.removeDetalleExtra(extraDetalle._id);
      if (response.success) {
        setSuccess('Extra removido exitosamente');
        if (selectedOrden) await loadOrdenDetails(selectedOrden);
        setTimeout(function() { setSuccess(''); }, 3000);
        setShowExtrasModal(false);
        setSelectedPlatilloForExtras(null);
      } else {
        setError('Error removiendo extra: ' + (response.error || 'Error desconocido'));
      }
    } else if (nuevaCantidad > 0) {
      // Si ya existe, elimina y agrega con la nueva cantidad
      if (extraDetalle && extraDetalle._id) {
        await apiService.removeDetalleExtra(extraDetalle._id);
      }
      var response2 = await apiService.addDetalleExtra({
        idOrdenDetallePlatillo: selectedPlatilloForExtras,
        idExtra: String(extra._id),
        nombreExtra: extra.nombre,
        costoExtra: extra.costo,
        cantidad: nuevaCantidad
      });
      if (response2.success) {
        setSuccess('Cantidad actualizada');
        if (selectedOrden) await loadOrdenDetails(selectedOrden);
        setTimeout(function() { setSuccess(''); }, 3000);
        setShowExtrasModal(false);
        setSelectedPlatilloForExtras(null);
      } else {
        setError('Error actualizando cantidad: ' + (response2.error || 'Error desconocido'));
      }
    }
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center space-x-2">
        <span className="text-sm">{extra.nombre}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-purple-600">
          +${extra.costo}
        </span>
        <button
          className="p-1 bg-gray-200 rounded"
          onClick={function() { handleCantidadChange(Number(inputCantidad) - 1); }}
          disabled={platilloDetalle?.entregado || Number(inputCantidad) <= 0}
        >
          <Minus className="w-3 h-3" />
        </button>
        <input
          type="number"
          min={0}
          value={inputCantidad}
          onChange={function(e) { handleCantidadChange(Number(e.target.value)); }}
          className="w-12 text-center border border-purple-300 rounded px-1 py-0.5 text-xs"
          disabled={platilloDetalle?.entregado}
        />
        <button
          className="p-1 bg-gray-200 rounded"
          onClick={function() { handleCantidadChange(Number(inputCantidad) + 1); }}
          disabled={platilloDetalle?.entregado}
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          className="ml-2 px-2 py-1 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700"
          onClick={guardarCantidad}
          disabled={platilloDetalle?.entregado || !cantidadCambiada}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

export default EditarOrden;