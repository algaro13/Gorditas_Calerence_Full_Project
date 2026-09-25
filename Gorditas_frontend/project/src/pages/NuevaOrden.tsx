import React, { useState, useEffect } from 'react';
import { Aviso } from '../components/Aviso';
import {
  Plus,
  Minus,
  Check,
  ArrowLeft,
  ArrowRight,
  ChefHat,
  RotateCcw
} from 'lucide-react';
import { apiService } from '../services/api';
import { precioVenta } from '../utils/precios';
import { Mesa, Platillo, Guiso, OrderStep, ApiResponse, Extra, TipoExtra } from '../types';

interface PlatilloSeleccionado {
  platillo: Platillo;
  guiso: Guiso;
  cantidad: number;
  extras: any[];
  notas: string; // Notas específicas del platillo
}

interface OrdenEnProceso {
  nombreCliente: string;
  notas: string;
  platillos: PlatilloSeleccionado[];
  productos: any[];
  total: number;
}

const NuevaOrden: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [nombreSuborden, setNombreSuborden] = useState('');
  const [platillosSeleccionados, setPlatillosSeleccionados] = useState<PlatilloSeleccionado[]>([]);
  // Agrega estado para productos seleccionados
  const [productosSeleccionados, setProductosSeleccionados] = useState<any[]>([]);
  // Estado para acumular múltiples órdenes de la misma mesa
  const [ordenesEnProceso, setOrdenesEnProceso] = useState<OrdenEnProceso[]>([]);
  
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesasOcupadas, setMesasOcupadas] = useState<Set<string>>(new Set());
  const [ordenesActivas, setOrdenesActivas] = useState<any[]>([]);
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [tiposExtras, setTiposExtras] = useState<TipoExtra[]>([]);
  const [guisos, setGuisos] = useState<Guiso[]>([]);
  
  // Estados para los modales de selección
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
  
  const [loading, setLoading] = useState(false);
  // Doble verificación para evitar doble creación
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOrderComplete, setIsOrderComplete] = useState(true); // For order validation
  const [notas, setNotas] = useState(''); // Field for order notes
  const [ordenPagada, setOrdenPagada] = useState(false); // Estado para orden pagada
  const [showReiniciarModal, setShowReiniciarModal] = useState(false);
  const [showSalirModal, setShowSalirModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const steps: OrderStep[] = [
    { step: 1, title: 'Seleccionar Mesa', completed: !!selectedMesa },
    { step: 2, title: 'Crear Suborden', completed: !!nombreSuborden },
    { step: 3, title: 'Agregar Items y Confirmar', completed: platillosSeleccionados.length > 0 || productosSeleccionados.length > 0 },
  ];

  // Función para guardar la orden actual en el array de órdenes en proceso
  const guardarOrdenActual = () => {
    if (!nombreSuborden || (platillosSeleccionados.length === 0 && productosSeleccionados.length === 0)) {
      setError('Complete todos los campos antes de agregar otra orden');
      return false;
    }

    const totalOrden = getTotalOrden();
    const nuevaOrden: OrdenEnProceso = {
      nombreCliente: nombreSuborden,
      notas: notas,
      platillos: [...platillosSeleccionados],
      productos: [...productosSeleccionados],
      total: totalOrden
    };

    setOrdenesEnProceso(prev => [...prev, nuevaOrden]);
    return true;
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Advertencia al intentar salir con órdenes en proceso
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hayOrdenesEnProceso = ordenesEnProceso.length > 0;
      const hayItemsSeleccionados = platillosSeleccionados.length > 0 || productosSeleccionados.length > 0;
      
      if (hayOrdenesEnProceso || hayItemsSeleccionados || nombreSuborden) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [ordenesEnProceso, platillosSeleccionados, productosSeleccionados, nombreSuborden]);

  // Verificar si hay datos sin guardar
  const tieneDatosSinGuardar = (): boolean => {
    const hayOrdenesEnProceso = ordenesEnProceso.length > 0;
    const hayItemsSeleccionados = platillosSeleccionados.length > 0 || productosSeleccionados.length > 0;
    return hayOrdenesEnProceso || hayItemsSeleccionados || !!nombreSuborden || !!selectedMesa;
  };

  // Bloquear navegación con modal personalizado
  useEffect(() => {
    // Interceptar clics en enlaces de navegación del sidebar
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && tieneDatosSinGuardar() && !orderSubmitting) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && href !== '#') {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigation(href);
          setShowSalirModal(true);
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [ordenesEnProceso, platillosSeleccionados, productosSeleccionados, nombreSuborden, selectedMesa, orderSubmitting]);

  // Función para confirmar salida
  const confirmarSalida = () => {
    if (pendingNavigation) {
      window.location.href = pendingNavigation;
    }
  };

  // Función para cancelar salida
  const cancelarSalida = () => {
    setShowSalirModal(false);
    setPendingNavigation(null);
  };

  const loadInitialData = async () => {
    try {
      const [mesasResponse, platillosResponse, guisosResponse, productosResponse, extrasResponse, tiposExtrasResponse, ordenesResponse] = await Promise.all([
        apiService.getCatalog<ApiResponse<Mesa>>('mesa'),
        apiService.getCatalog<ApiResponse<Platillo>>('platillo'),
        apiService.getCatalog<ApiResponse<Guiso>>('guiso'),
        apiService.getCatalog<ApiResponse<any>>('producto'),
        apiService.getCatalog<ApiResponse<Extra>>('extra'),
        apiService.getCatalog<ApiResponse<TipoExtra>>('tipoextra'),
        apiService.getOrdenesActivas(),
      ]);

      setMesas(Array.isArray(mesasResponse.data?.items) ? mesasResponse.data.items : Array.isArray(mesasResponse.data) ? mesasResponse.data : []);
      setPlatillos(Array.isArray(platillosResponse.data?.items) ? platillosResponse.data.items : Array.isArray(platillosResponse.data) ? platillosResponse.data : []);
      setGuisos(Array.isArray(guisosResponse.data?.items) ? guisosResponse.data.items : Array.isArray(guisosResponse.data) ? guisosResponse.data : []);
      setProductos(Array.isArray(productosResponse.data?.items) ? productosResponse.data.items : Array.isArray(productosResponse.data) ? productosResponse.data : []);
      setExtras(Array.isArray(extrasResponse.data?.items) ? extrasResponse.data.items : Array.isArray(extrasResponse.data) ? extrasResponse.data : []);
      setTiposExtras(Array.isArray(tiposExtrasResponse.data?.items) ? tiposExtrasResponse.data.items : Array.isArray(tiposExtrasResponse.data) ? tiposExtrasResponse.data : []);
      
      // Procesar órdenes activas para identificar mesas ocupadas
      if (ordenesResponse.success && ordenesResponse.data) {
        const ordenes = Array.isArray(ordenesResponse.data.ordenes) ? ordenesResponse.data.ordenes : [];
        
        // Filtrar órdenes que no están pagadas ni canceladas
        const ordenesActivas = ordenes.filter((orden: any) => 
          orden.estatus !== 'Pagada' && orden.estatus !== 'Cancelado'
        );
        
        // Identificar mesas ocupadas
        const mesasConOrdenes = new Set<string>();
        ordenesActivas.forEach((orden: any) => {
          if (orden.idMesa) {
            mesasConOrdenes.add(String(orden.idMesa));
          }
        });
        
        setOrdenesActivas(ordenesActivas);
        setMesasOcupadas(mesasConOrdenes);
      }
    } catch (error) {
      setError('Error cargando datos iniciales');
      setMesas([]);
      setPlatillos([]);
      setGuisos([]);
      setOrdenesActivas([]);
      setMesasOcupadas(new Set());
    }
  };

  const getMesaInfo = (mesaId: string | undefined) => {
    if (!mesaId) {
      return {
        isOcupada: false,
        totalOrdenes: 0,
        ordenes: [],
        estatusOrdenes: []
      };
    }
    
    const ordenesMesa = ordenesActivas.filter((orden: any) => String(orden.idMesa) === String(mesaId));
    const isOcupada = mesasOcupadas.has(String(mesaId));
    
    return {
      isOcupada,
      totalOrdenes: ordenesMesa.length,
      ordenes: ordenesMesa,
      estatusOrdenes: ordenesMesa.map((orden: any) => orden.estatus)
    };
  };

  // Función para determinar si es un pedido o mesa
  const esPedido = (mesa: Mesa | null): boolean => {
    if (!mesa?.nombre) return false;
    const nombreLower = mesa.nombre.trim().toLowerCase();
    return nombreLower.startsWith('pedido') || nombreLower.startsWith('nuevo pedido');
  };

  const getTipoMesaLabel = (): string => {
    return esPedido(selectedMesa) ? 'Pedido' : 'Mesa';
  };

  // Función para mostrar el nombre de mesa, especialmente para pedidos temporales
  const getMostrarNombreMesa = (mesa: Mesa, ordenesMesa?: any[]): string => {
    if (!mesa?.nombre) return 'Mesa sin nombre';
    
    // Si es una mesa temporal (nombre empieza con "pedido"), mostrar con nombres de clientes
    if (mesa.nombre.trim().toLowerCase().startsWith('pedido')) {
      if (ordenesMesa && ordenesMesa.length > 0) {
        const clientesUnicos = [...new Set(ordenesMesa.map(orden => orden.nombreCliente).filter(cliente => cliente && cliente !== 'Sin nombre'))];
        if (clientesUnicos.length > 0) {
          return `Pedido: ${clientesUnicos.join(', ')}`;
        }
      }
      // Fallback si no hay información de clientes
      return mesa.nombre;
    }
    
    // Para mesas normales, mostrar el nombre tal como está
    return mesa.nombre;
  };

  // Funciones para el flujo modal de platillos
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
          ? { ...e, cantidad: Math.max(1, Math.min(prev.cantidad, cantidad)) } // No exceder cantidad del platillo
          : e
      )
    }));
  };

  const saltarExtras = () => {
    setModalExtrasOpen(false);
    setModalNotasOpen(true);
  };

  const finalizarPlatillo = () => {
    if (!platilloEnConstruccion.platillo || !platilloEnConstruccion.guiso) {
      setError('Error al agregar platillo');
      return;
    }

    const nuevo: PlatilloSeleccionado = {
      platillo: platilloEnConstruccion.platillo,
      guiso: platilloEnConstruccion.guiso,
      cantidad: platilloEnConstruccion.cantidad,
      extras: [...platilloEnConstruccion.extras],
      notas: platilloEnConstruccion.notas,
    };

    setPlatillosSeleccionados(prev => [...prev, nuevo]);
    setModalNotasOpen(false);
    
    // Limpiar el estado de construcción
    setPlatilloEnConstruccion({
      platillo: null,
      guiso: null,
      cantidad: 1,
      extras: [],
      notas: ''
    });
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

  // Funciones para productos
  const seleccionarProducto = (producto: any) => {
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
    const nuevo = {
      idProducto: producto._id,
      nombreProducto: producto.nombre,
      costoProducto: producto.costo,
      cantidad: 1
    };
    setProductosSeleccionados(prev => [...prev, nuevo]);
    setModalProductoOpen(false);
    setError('');
  };

  const seleccionarVariante = (variante: string) => {
    if (!productoConVariantes) return;

    const nuevo = {
      idProducto: productoConVariantes._id,
      nombreProducto: `${productoConVariantes.nombre} - ${variante}`,
      costoProducto: productoConVariantes.costo,
      cantidad: 1
    };
    setProductosSeleccionados(prev => [...prev, nuevo]);
    setModalVariantesOpen(false);
    setProductoConVariantes(null);
    setError('');
  };



  const handleRemovePlatillo = (index: number) => {
    setPlatillosSeleccionados(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * El botón de restar cambia de significado al llegar a 1: deja de reducir y borra la línea.
   * En un teléfono, con prisa, un toque de más se lleva el platillo sin que nadie lo pida, así
   * que el paso de 1 a 0 pide confirmación. Los demás toques siguen siendo inmediatos: pedirla
   * siempre estorbaría al ritmo del servicio, que es lo que esto intenta proteger.
   */
  const confirmarQuitar = (nombre: string) =>
    window.confirm(`¿Quitar ${nombre} de la orden?`);

  const handleSubmitOrder = async () => {
    if (orderSubmitting || loading) {
      // Doble verificación: si ya está en proceso, no continuar
      return;
    }
    setOrderSubmitting(true);
    if (!selectedMesa || !nombreSuborden) {
      setError('Completa todos los campos');
      setOrderSubmitting(false);
      return;
    }

    // Guardar la orden actual antes de procesarlas
    const ordenActualGuardada = guardarOrdenActual();
    if (!ordenActualGuardada) {
      setOrderSubmitting(false);
      return;
    }

    // Combinar la orden actual con las órdenes en proceso
    const todasLasOrdenes = [
      ...ordenesEnProceso,
      {
        nombreCliente: nombreSuborden,
        notas: notas,
        platillos: [...platillosSeleccionados],
        productos: [...productosSeleccionados],
        total: getTotalOrden()
      }
    ];

    setLoading(true);
    setError('');
    setSuccess('');

    // Si la mesa seleccionada es "Nuevo pedido", crear una mesa temporal incremental
    let mesaParaOrden = selectedMesa;
    if (selectedMesa.nombre && (selectedMesa.nombre.trim().toLowerCase() === 'nuevo pedido' || selectedMesa.nombre.trim().toLowerCase() === 'pedidos')) {
      try {
        // Obtener el siguiente número de pedido del día desde el backend
        // El backend mantiene un contador que se reinicia automáticamente cada día a las 12 AM
        const pedidoNumberResponse = await apiService.getNextPedidoNumber();
        
        if (!pedidoNumberResponse.success || !pedidoNumberResponse.data) {
          setError('Error obteniendo número de pedido');
          setLoading(false);
          setOrderSubmitting(false);
          return;
        }
        
        const siguienteNumero = pedidoNumberResponse.data.nextNumber;
        
        // Crear mesa temporal con el número incremental del contador
        const mesaTemporal = {
          nombre: `Pedido ${siguienteNumero}`,
          temporal: true, // Marcador para identificar mesas temporales
          activo: true
        };
        
        const mesaResponse = await apiService.createCatalogItem('mesa', mesaTemporal);
        if (mesaResponse.success && mesaResponse.data) {
          // Actualizar mesaParaOrden para usar la mesa temporal
          mesaParaOrden = mesaResponse.data as Mesa;
        } else {
          setError('Error creando mesa temporal para pedido');
          setLoading(false);
          setOrderSubmitting(false);
          return;
        }
      } catch (error) {
        console.error('Error al crear mesa temporal:', error);
        setError('Error creando mesa temporal');
        setLoading(false);
        setOrderSubmitting(false);
        return;
      }
    }


    try {
      // Procesar cada orden principal en paralelo, pero los pasos internos de cada orden siguen siendo secuenciales
      await Promise.all(todasLasOrdenes.map(async (ordenData) => {
        // Determinar el estado basado en si la orden está completa y su contenido
        let estatus: string;
        const mesaEsPedido = selectedMesa && typeof selectedMesa.nombre === 'string' && selectedMesa.nombre.trim().toLowerCase().startsWith('pedido');
        if (!isOrderComplete) {
          estatus = 'Pendiente';
        } else if (ordenData.platillos.length === 0 && ordenData.productos.length > 0) {
          // Si solo tiene productos
          if (mesaEsPedido) {
            estatus = 'Entregada'; // Para pedidos solo productos, va directo a cobrar
          } else {
            estatus = 'Surtida';
          }
        } else {
          // Si tiene platillos, va a Recepcion para preparación
          estatus = 'Recepcion';
        }

        // Agregar " - Pagada" al nombre del cliente si la orden está marcada como pagada
        const nombreClienteFinal = ordenPagada 
          ? `${ordenData.nombreCliente} - Pagada` 
          : ordenData.nombreCliente;

        const nuevaOrdenData = {
          idMesa: mesaParaOrden?._id || selectedMesa._id,
          nombreMesa: mesaParaOrden?.nombre || selectedMesa.nombre,
          // Sin idTipoOrden a propósito: los ids de catálogo se generan por restaurante, así
          // que mandar uno fijo solo acertaba en el primero dado de alta y rompía el resto.
          // El backend resuelve el tipo por omisión del restaurante.
          nombreTipoOrden: 'Mesa',
          nombreCliente: nombreClienteFinal,
          total: ordenData.total,
          estatus,
          notas: ordenData.notas || undefined
        };

        // Doble verificación antes de crear la orden
        function normalizePlatillos(platillos: any[]) {
          return platillos.map((p) => ({
            idPlatillo: p.idPlatillo || p.platillo?._id || p.platillo,
            idGuiso: p.idGuiso || p.guiso?._id || p.guiso,
            cantidad: p.cantidad,
            notas: p.notas || '',
            extras: (p.extras || []).map((e: any) => ({
              idExtra: e.idExtra || e._id || e.extra,
              cantidad: e.cantidad,
              nombreExtra: e.nombreExtra || '',
              costoExtra: e.costoExtra || 0
            })).sort((a: any, b: any) => String(a.idExtra).localeCompare(String(b.idExtra)))
          })).sort((a, b) => String(a.idPlatillo).localeCompare(String(b.idPlatillo)));
        }
        function normalizeProductos(productos: any[]) {
          return productos.map((p) => ({
            idProducto: p.idProducto || p._id || p.producto,
            cantidad: p.cantidad,
            nombreProducto: p.nombreProducto || '',
            costoProducto: p.costoProducto || 0
          })).sort((a, b) => String(a.idProducto).localeCompare(String(b.idProducto)));
        }
        const ordenDuplicada = ordenesActivas.some((orden: any) => {
          if (String(orden.idMesa) !== String(mesaParaOrden?._id || selectedMesa._id)) return false;
          if (orden.nombreCliente !== ordenData.nombreCliente) return false;
          if (Math.abs(Number(orden.total) - Number(ordenData.total)) >= 0.01) return false;
          // Normalizar platillos y productos para comparar
          const platillosA = normalizePlatillos(orden.platillos || []);
          const platillosB = normalizePlatillos(ordenData.platillos || []);
          const productosA = normalizeProductos(orden.productos || []);
          const productosB = normalizeProductos(ordenData.productos || []);
          // Comparar arrays como JSON
          const platillosIguales = JSON.stringify(platillosA) === JSON.stringify(platillosB);
          const productosIguales = JSON.stringify(productosA) === JSON.stringify(productosB);
          const notasIguales = (orden.notas || '') === (ordenData.notas || '');
          return platillosIguales && productosIguales && notasIguales && (!orden.estatus || orden.estatus !== 'Pagada');
        });
        if (ordenDuplicada) {
          setError(`Ya existe una orden activa para el cliente \"${ordenData.nombreCliente}\" en esta mesa/pedido con los mismos platillos, productos, extras y notas. Verifica antes de continuar.`);
          setLoading(false);
          setOrderSubmitting(false);
          return;
        }

        const ordenResponse = await apiService.createOrden(nuevaOrdenData);
        const ordenDataWithId = ordenResponse.data as { _id: string } | undefined;
        if (!ordenResponse.success || !ordenDataWithId?._id) {
          setError(`Error creando orden para ${ordenData.nombreCliente}`);
          setLoading(false);
          setOrderSubmitting(false);
          return;
        }
        const ordenId = ordenDataWithId._id;

        // Crear la suborden
        const subordenData = { nombre: ordenData.nombreCliente };
        const subordenResponse = await apiService.addSuborden(ordenId, subordenData);
        if (!subordenResponse.success || !(subordenResponse.data && (subordenResponse.data as { _id?: string })._id)) {
          setError(`Error creando suborden para ${ordenData.nombreCliente}`);
          setLoading(false);
          setOrderSubmitting(false);
          return;
        }

        const subordenId = (subordenResponse.data as { _id: string })._id;

        // Agregar platillos
        for (const item of ordenData.platillos) {
          const platilloData = {
            idPlatillo: Number(item.platillo._id),
            nombrePlatillo: item.platillo.nombre,
            idGuiso: Number(item.guiso._id),
            nombreGuiso: item.guiso.nombre,
            costoPlatillo: precioVenta(item.platillo),
            cantidad: item.cantidad,
            notas: item.notas // Incluir las notas del platillo
          };

          const platilloResponse = await apiService.addPlatillo(subordenId, platilloData);
          if (!platilloResponse.success) {
            setError(`Error agregando platillo: ${item.platillo.nombre} para ${ordenData.nombreCliente}`);
            setLoading(false);
            setOrderSubmitting(false);
            return;
          }

          // Agregar extras del platillo si existen
          if (item.extras && item.extras.length > 0) {
            const platilloId = (platilloResponse.data as { _id: string })._id;
            for (const extra of item.extras) {
              const extraData = {
                idExtra: Number(extra.idExtra),
                nombreExtra: extra.nombreExtra,
                costoExtra: extra.costoExtra,
                cantidad: extra.cantidad
              };

              const extraResponse = await apiService.addExtra(platilloId, extraData);
              if (!extraResponse.success) {
                setError(`Error agregando extra: ${extra.nombreExtra} para ${ordenData.nombreCliente}`);
                setLoading(false);
                setOrderSubmitting(false);
                return;
              }
            }
          }
        }

        // Agregar productos
        for (const producto of ordenData.productos) {
          const productoData = {
            ...producto,
            idOrden: ordenId
          };
          const productoResponse = await apiService.addProducto(ordenId, productoData);
          if (!productoResponse.success) {
            setError(`Error agregando producto: ${producto.nombreProducto || producto.nombre} para ${ordenData.nombreCliente}, stock insuficiente`);
            setOrdenesEnProceso(prev => prev.filter(o => o.nombreCliente !== ordenData.nombreCliente));
            setLoading(false);
            setOrderSubmitting(false);
            return;
          }
        }

        // Ensure the order is not added to resumen if stock is insuficiente
        if (error.includes('stock insuficiente')) {
          setOrdenesEnProceso(prev => prev.filter(o => o.nombreCliente !== ordenData.nombreCliente));
          return;
        }
      }));

      const totalTodasLasOrdenes = todasLasOrdenes.reduce((sum, orden) => sum + orden.total, 0);
      setSuccess(`${todasLasOrdenes.length} orden${todasLasOrdenes.length > 1 ? 'es' : ''} creada${todasLasOrdenes.length > 1 ? 's' : ''} exitosamente. Total: $${totalTodasLasOrdenes.toFixed(2)}`);
      
      setTimeout(() => {
        setCurrentStep(1);
        setSelectedMesa(null);
        setNombreSuborden('');
        setNotas('');
        setPlatillosSeleccionados([]);
        setProductosSeleccionados([]);
        setOrdenesEnProceso([]); // Limpiar órdenes en proceso
        setPlatilloEnConstruccion({
          platillo: null,
          guiso: null,
          cantidad: 1,
          extras: [],
          notas: ''
        });
        setIsOrderComplete(true);
        setOrdenPagada(false); // Resetear estado de orden pagada
        setSuccess('');
        setError('');
        setOrderSubmitting(false);
        loadInitialData();
      }, 3000);

    } catch (error) {
      console.error('Error al crear las órdenes:', error);
      setError('Error creando las órdenes');
      setOrderSubmitting(false);
    } finally {
      setLoading(false);
    }
  };


  const canProceedToNext = () => {
    switch (currentStep) {
      case 1: return !!selectedMesa;
      case 2: return !!nombreSuborden;
      case 3: return platillosSeleccionados.length > 0 || productosSeleccionados.length > 0;
      default: return false;
    }
  };

  const getTotalOrden = () => {
    return (
      platillosSeleccionados.reduce(
        (sum, item) => sum + (
          precioVenta(item.platillo) * item.cantidad +
          item.extras.reduce((extraSum, extra) => extraSum + (extra.costoExtra * extra.cantidad), 0)
        ),
        0
      ) +
      productosSeleccionados.reduce(
        (sum, item) => sum + (item.costoProducto * item.cantidad),
        0
      )
    );
  };

  const getTotalTodasLasOrdenes = () => {
    const totalOrdenesEnProceso = ordenesEnProceso.reduce((sum, orden) => sum + orden.total, 0);
    const totalOrdenActual = getTotalOrden();
    return totalOrdenesEnProceso + totalOrdenActual;
  };

  // Función para reiniciar todo el componente
  const reiniciarComponente = () => {
    // Verificar si hay órdenes en proceso o items seleccionados
    const hayOrdenesEnProceso = ordenesEnProceso.length > 0;
    const hayItemsSeleccionados = platillosSeleccionados.length > 0 || productosSeleccionados.length > 0;
    const hayDatos = hayOrdenesEnProceso || hayItemsSeleccionados || nombreSuborden || selectedMesa;

    if (hayDatos) {
      setShowReiniciarModal(true);
      return;
    }

    ejecutarReinicio();
  };

  const ejecutarReinicio = () => {
    setCurrentStep(1);
    setSelectedMesa(null);
    setNombreSuborden('');
    setNotas('');
    setPlatillosSeleccionados([]);
    setProductosSeleccionados([]);
    setOrdenesEnProceso([]);
    setPlatilloEnConstruccion({
      platillo: null,
      guiso: null,
      cantidad: 1,
      extras: [],
      notas: ''
    });
    setIsOrderComplete(true);
    setOrdenPagada(false); // Resetear estado de orden pagada
    setError('');
    setSuccess('');
    setOrderSubmitting(false);
    setModalPlatilloOpen(false);
    setModalProductoOpen(false);
    setModalGuisoOpen(false);
    setModalExtrasOpen(false);
    setModalNotasOpen(false);
    setShowReiniciarModal(false);
    loadInitialData();
  };

  if (success) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-titulo font-semibold text-gray-900 mb-2">¡Orden Creada!</h2>
          <p className="text-gray-600">{success}</p>
        </div>
      </div>
    );
  }

  // Overlay de carga mientras se generan las órdenes
  const loadingOverlay = loading && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-orange-600 mb-6"></div>
        <span className="text-white text-titulo font-bold">Generando órdenes...</span>
      </div>
    </div>
  );


  return (
    <div className="max-w-4xl mx-auto px-1 sm:px-4 lg:px-6 relative">
      {loadingOverlay}
      <div className="mb-4 sm:mb-6 flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-pantalla font-bold text-gray-900 mb-2">Nueva Orden</h1>
          <p className="text-cuerpo text-gray-600">Crea una nueva orden paso a paso</p>
        </div>
        {currentStep === 2 && (
          <button
            onClick={reiniciarComponente}
            className="btn flex-shrink-0 gap-2 bg-red-600 text-white hover:bg-red-700"
            title="Reiniciar formulario"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="mb-3 sm:mb-6 px-2 sm:px-0.5">
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div key={step.step} className="flex items-center min-w-0 flex-shrink-0">
              <div
                className={`flex items-center justify-center w-5 h-5 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 ${
                  step.step === currentStep
                    ? 'bg-orange-600 border-orange-600 text-white'
                    : step.completed
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                {step.completed && step.step !== currentStep ? (
                  <Check className="w-2.5 h-2.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                ) : (
                  <span className="text-meta sm:text-cuerpo lg:text-cuerpo">{step.step}</span>
                )}
              </div>
              <span
                className={`ml-1 sm:ml-2 text-meta sm:text-meta lg:text-cuerpo font-medium truncate max-w-[50px] sm:max-w-[80px] lg:max-w-none ${
                  step.step === currentStep
                    ? 'text-orange-600'
                    : step.completed
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-300 mx-1 sm:mx-2 lg:mx-4 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      <Aviso error={error} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-3 sm:p-4 lg:p-6">
        {/* Step 1: Select Table */}
        {currentStep === 1 && (
          <div className="px-2 sm:px-0">
            <h2 className="text-titulo lg:text-titulo font-semibold text-gray-900 mb-3 sm:mb-4">Seleccionar Mesa</h2>
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center space-x-3 sm:space-x-4 text-meta">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
                  <span className="text-gray-600">Disponible</span>
                </div>
                <div className="hidden sm:flex items-center">
                  <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded mr-2"></div>
                  <span className="text-gray-600">Con órdenes activas</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
              {mesas.filter(mesa => mesa.activo !== false).map((mesa) => {
                const mesaInfo = getMesaInfo(mesa._id);
                const isSelected = selectedMesa?._id === mesa._id;
                
                // Lógica de color para la mesa 'Pedidos'
                let mesaColor = '';
                if (mesa.nombre && mesa.nombre.trim().toLowerCase() === 'pedidos') {
                  if (mesaInfo.totalOrdenes > 11) {
                    mesaColor = 'bg-red-50 border-red-200 text-red-700';
                  } else if (mesaInfo.totalOrdenes > 5) {
                    mesaColor = 'bg-orange-50 border-orange-200 text-orange-700';
                  } else {
                    mesaColor = 'bg-green-50 border-green-200 text-green-700';
                  }
                } else if (mesaInfo.isOcupada) {
                  mesaColor = 'bg-orange-50 border-orange-200 text-orange-700';
                } else {
                  mesaColor = 'bg-green-50 border-green-200 text-green-700';
                }
                
                return (
                  <button
                    key={mesa._id}
                    onClick={() => setSelectedMesa(mesa)}
                    className={`relative p-2 sm:p-3 lg:p-4 rounded-lg border-2 text-center transition-colors min-w-0 ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : mesaColor
                    }`}
                  >
                    {mesaInfo.isOcupada && (
                      <div className="absolute top-1 right-1">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      </div>
                    )}
                    <div className="text-cuerpo lg:text-titulo font-semibold">{getMostrarNombreMesa(mesa, mesaInfo.ordenes)}</div>
                    <div className={`text-meta sm:text-meta lg:text-cuerpo ${
                      mesaInfo.isOcupada ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {mesaInfo.isOcupada 
                      ? `${mesaInfo.totalOrdenes} orden${mesaInfo.totalOrdenes !== 1 ? 'es' : ''}`
                      : (
                        <span>
                          <span className="sm:hidden">Disp</span>
                          <span className="hidden sm:inline">Disponible</span>
                        </span>
                        )
                      }
                    </div>
                  </button>
                );
              })}
            </div>
            
            {selectedMesa && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2 text-cuerpo">{getTipoMesaLabel()} seleccionado: {getMostrarNombreMesa(selectedMesa, getMesaInfo(selectedMesa._id).ordenes)}</h3>
                {(() => {
                  const mesaInfo = getMesaInfo(selectedMesa._id);
                  // Avanzar automáticamente al paso 2
                  setTimeout(() => setCurrentStep(2), 300);
                  
                  return mesaInfo.isOcupada ? (
                    <div className="space-y-2">
                      <p className="text-meta text-blue-800">
                        Este {getTipoMesaLabel().toLowerCase()} tiene {mesaInfo.totalOrdenes} orden{mesaInfo.totalOrdenes !== 1 ? 'es' : ''} activa{mesaInfo.totalOrdenes !== 1 ? 's' : ''}:
                      </p>
                      <div className="space-y-1">
                        {mesaInfo.ordenes.map((orden: any, index: number) => (
                          <div key={index} className="text-meta sm:text-meta text-blue-700 bg-blue-100 px-2 py-1 rounded break-words">
                            <span className="block truncate">Folio #{orden.folio || 'N/A'} - Cliente: {orden.nombreCliente || 'Sin nombre'}</span>
                            <span className="block truncate">Estado: {orden.estatus} - Total: ${orden.total?.toFixed(2) || '0.00'}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-meta text-blue-800 font-medium">
                        Puedes agregar una nueva orden a este {getTipoMesaLabel().toLowerCase()}.
                      </p>
                    </div>
                  ) : (
                    <p className="text-meta text-blue-800">{getTipoMesaLabel()} disponible - No hay órdenes activas.</p>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Create Suborden */}
        {currentStep === 2 && (
          <div className="px-2 sm:px-0">
            <h2 className="text-titulo lg:text-titulo font-semibold text-gray-900 mb-2 sm:mb-4">Crear Suborden</h2>
            <div className="mb-2 sm:mb-4">
              <p className="text-cuerpo text-gray-600">
                {!esPedido(selectedMesa) && `${getTipoMesaLabel()} seleccionado:`}
                {' '}<span className="font-medium">{selectedMesa?.nombre}</span>
              </p>
            </div>
            <div>
              <label htmlFor="nombreSuborden" className="block text-meta font-medium text-gray-700 mb-1 sm:mb-2">
                Nombre del cliente
              </label>
              <input
                id="nombreSuborden"
                type="text"
                value={nombreSuborden}
                onChange={(e) => setNombreSuborden(e.target.value)}
                className="campo"
                placeholder="Nombre del cliente"
              />
            </div>
          </div>
        )}

        {/* Step 3: Add Dishes */}
        {currentStep === 3 && (
          <div className="px-2 sm:px-0">
            <h2 className="text-titulo lg:text-titulo font-semibold text-gray-900 mb-1 sm:mb-2">Agregar Platillos y Productos</h2>
            
            {/* Checkbox de Orden Pagada */}
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ordenPagada}
                  onChange={(e) => setOrdenPagada(e.target.checked)}
                  className="campo w-5 h-5 text-blue-600 rounded cursor-pointer"
                />
                <span className="ml-3 text-cuerpo font-medium text-gray-900">
                  {selectedMesa
                    ? (esPedido(selectedMesa) ? 'Pedido pagado' : 'Mesa pagada')
                    : 'Orden pagada'}
                </span>
                <span className="ml-2 text-meta text-gray-500">
                  (las órdenes se marcarán como "pagadas")
                </span>
              </label>
            </div>
            
            {/* Botones de acción - agrupados en la parte superior */}
            <div className="mb-4">
              <div className={`grid gap-0.5 ${(platillosSeleccionados.length > 0 || productosSeleccionados.length > 0) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <button
                  onClick={iniciarSeleccionPlatillo}
                  className="btn btn-lg w-full bg-orange-600 text-white hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Agregar Platillo</span><span className="sm:hidden">Platillo</span>
                </button>

                {/* Botones de confirmación solo cuando hay items seleccionados */}
                {(platillosSeleccionados.length > 0 || productosSeleccionados.length > 0) ? (
                  <button
                    onClick={() => {
                      // Guardar la orden actual antes de limpiar
                      const guardada = guardarOrdenActual();
                      if (guardada) {
                        // Reset form but keep the selected table and saved orders
                        setCurrentStep(2);
                        setNombreSuborden('');
                        setNotas('');
                        setPlatillosSeleccionados([]);
                        setProductosSeleccionados([]);
                        setPlatilloEnConstruccion({
                          platillo: null,
                          guiso: null,
                          cantidad: 1,
                          extras: [],
                          notas: ''
                        });
                        setIsOrderComplete(true);
                        setError('');
                        setSuccess('');
                      }
                    }}
                    disabled={loading || !nombreSuborden || (platillosSeleccionados.length === 0 && productosSeleccionados.length === 0)}
                    className="btn btn-lg w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Agregar Cliente</span><span className="sm:hidden">Cliente</span>
                  </button>
                ) : null}

                <button
                  onClick={() => setModalProductoOpen(true)}
                  className="btn btn-lg w-full bg-green-600 text-white hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Agregar Producto</span><span className="sm:hidden">Producto</span>
                </button>

                {/* Botón de crear orden solo cuando hay items seleccionados */}
                {(platillosSeleccionados.length > 0 || productosSeleccionados.length > 0) && (
                  <button
                    onClick={handleSubmitOrder}
                    disabled={loading || !selectedMesa || !nombreSuborden || (platillosSeleccionados.length === 0 && productosSeleccionados.length === 0)}
                    className="btn btn-lg w-full bg-purple-600 text-white hover:bg-purple-700"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                    ) : (
                      <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    )}
                    <span className="truncate">
                      {loading
                        ? 'Creando...'
                        : ordenesEnProceso.length > 0
                          ? 'Crear Ordenes'
                          : 'Crear Orden'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Selected Items List */}
            {(platillosSeleccionados.length > 0 || productosSeleccionados.length > 0) && (
              <div>
                <h3 className="text-cuerpo lg:text-titulo font-medium text-gray-900 mb-2 sm:mb-4">
                  Platillos Seleccionados ({platillosSeleccionados.reduce((total, p) => total + p.cantidad, 0)})
                </h3>
                <div className="space-y-1.5 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                  {platillosSeleccionados.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-2 sm:p-4 bg-gray-50 rounded-lg gap-2 sm:gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-cuerpo font-medium text-gray-900">{item.platillo.nombre}</h4>
                        <p className="text-meta sm:text-cuerpo text-gray-600">
                          {item.guiso.nombre} • Cantidad: {item.cantidad}
                        </p>
                        {item.extras.length > 0 && (
                          <div className="mt-0.5 sm:mt-1">
                            <p className="text-meta sm:text-meta text-purple-600 font-medium">Extras:</p>
                            {item.extras.map((extra, extraIndex) => (
                              <p key={extraIndex} className="text-meta sm:text-meta text-purple-500">
                                • {extra.nombreExtra} (x{extra.cantidad}) - ${(extra.costoExtra * extra.cantidad).toFixed(2)}
                              </p>
                            ))}
                          </div>
                        )}
                        {item.notas && (
                          <div className="mt-0.5 sm:mt-1">
                            <p className="text-meta sm:text-meta text-blue-600 font-medium">Notas:</p>
                            <p className="text-meta sm:text-meta text-blue-500 italic">
                              "{item.notas}"
                            </p>
                          </div>
                        )}
                        <div className="text-meta sm:text-cuerpo font-medium text-green-600">
                          {item.extras.length > 0 ? (
                            <div>
                              <div className="text-meta sm:text-meta text-gray-500">
                                Platillo: ${(precioVenta(item.platillo) * item.cantidad).toFixed(2)} + 
                                Extras: ${item.extras.reduce((sum, extra) => sum + (extra.costoExtra * extra.cantidad), 0).toFixed(2)}
                              </div>
                              <div className="font-bold">
                                Total: ${(
                                  precioVenta(item.platillo) * item.cantidad + 
                                  item.extras.reduce((sum, extra) => sum + (extra.costoExtra * extra.cantidad), 0)
                                ).toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              ${(precioVenta(item.platillo) * item.cantidad).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (item.cantidad > 1) {
                              setPlatillosSeleccionados(prev => prev.map((p, i) => {
                                if (i === index) {
                                  const nuevaCantidad = p.cantidad - 1;
                                  // Ajustar extras si alguno tiene la misma cantidad que el platillo
                                  const extrasAjustados = p.extras.map(extra => {
                                    if (extra.cantidad === p.cantidad) {
                                      return { ...extra, cantidad: Math.max(1, extra.cantidad - 1) };
                                    }
                                    return { ...extra, cantidad: Math.min(extra.cantidad, nuevaCantidad) };
                                  });
                                  return { ...p, cantidad: nuevaCantidad, extras: extrasAjustados };
                                }
                                return p;
                              }));
                            } else if (confirmarQuitar(item.platillo.nombre)) {
                              handleRemovePlatillo(index);
                            }
                          }}
                          className="btn text-red-600 hover:bg-red-50"
                          title={item.cantidad > 1 ? "Reducir cantidad" : "Quitar platillo de la orden"}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <h3 className="text-cuerpo lg:text-titulo font-medium text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">
                  Productos Seleccionados ({productosSeleccionados.length})
                </h3>
                <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                  {productosSeleccionados.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">{item.nombreProducto}</h4>
                        <p className="text-cuerpo text-gray-600">
                          Cantidad: {item.cantidad}
                        </p>
                        <p className="text-cuerpo font-medium text-green-600">
                          ${(item.costoProducto * item.cantidad).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setProductosSeleccionados(prev => prev.map((p, i) => 
                              i === index ? { ...p, cantidad: p.cantidad + 1 } : p
                            ));
                          }}
                          className="btn text-green-600 hover:bg-green-50"
                          title="Aumentar cantidad"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (item.cantidad > 1) {
                              setProductosSeleccionados(prev => prev.map((p, i) => 
                                i === index ? { ...p, cantidad: p.cantidad - 1 } : p
                              ));
                            } else if (confirmarQuitar(item.nombreProducto)) {
                              setProductosSeleccionados(prev => prev.filter((_, i) => i !== index));
                            }
                          }}
                          className="btn text-red-600 hover:bg-red-50"
                          title={item.cantidad > 1 ? "Reducir cantidad" : "Quitar producto de la orden"}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {(platillosSeleccionados.length > 0 || productosSeleccionados.length > 0) && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-orange-50 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <span className="text-titulo font-semibold text-gray-900">Total:</span>
                      <span className="text-titulo font-medium text-orange-600">${getTotalOrden().toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Order Validation and Confirmation Section */}
            {(platillosSeleccionados.length > 0 || productosSeleccionados.length > 0) && (
              <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-6 px-2 sm:px-0">
                {/* Order Validation Section */}
                <div className="space-y-2 sm:space-y-3">
                  <div className={`p-2 sm:p-3 rounded-md ${isOrderComplete ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                    <p className="text-meta break-words">
                      {isOrderComplete 
                        ? (platillosSeleccionados.length === 0 && productosSeleccionados.length > 0
                            ? '✓ La orden solo contiene productos y será enviada directamente a despacho (Estado: Surtida)'
                            : '✓ La orden será enviada directamente a preparación (Estado: Recepción)'
                          )
                        : '⚠ La orden será marcada como pendiente para revisión (Estado: Pendiente)'
                      }
                    </p>
                  </div>
                </div>

                {/* Notes field */}
                <div className="bg-gray-50 p-2 sm:p-4 lg:p-6 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2 sm:mb-4 text-cuerpo">Notas de la Orden</h3>
                  <div>
                    <label htmlFor="notas" className="block text-meta font-medium text-gray-700 mb-1 sm:mb-2">
                      Comentarios generales (opcional)
                    </label>
                    <textarea
                      id="notas"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="campo resize-none"
                      placeholder="Comentarios especiales, instrucciones de cocina, alergias, etc."
                    />
                    <p className="text-meta sm:text-cuerpo text-gray-500 mt-0.5 sm:mt-1">{notas.length}/500 caracteres</p>
                  </div>
                </div>

                {/* Resumen */}
                <div className="bg-gray-50 p-2 sm:p-6 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3 sm:mb-4 text-cuerpo">Resumen de las Órdenes</h3>
                  
                  {/* Órdenes ya guardadas en proceso */}
                  {ordenesEnProceso.map((orden, index) => (
                    <div key={index} className="mb-3 sm:mb-4 p-3 sm:p-4 bg-white rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-700 mb-2 sm:mb-3 text-meta">Orden #{index + 1} - {orden.nombreCliente}</h4>
                      
                      {/* Detalles de platillos */}
                      {orden.platillos.length > 0 && (
                        <div className="mb-2 sm:mb-3">
                          <p className="text-meta sm:text-meta font-semibold text-gray-700 mb-1">Platillos:</p>
                          <div className="space-y-1">
                            {orden.platillos.map((item, idx) => (
                              <div key={idx} className="flex items-start justify-between text-meta sm:text-meta bg-green-50 px-2 py-1 rounded">
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium">{item.cantidad}x {item.platillo.nombre}</span>
                                  <span className="text-gray-600"> - {item.guiso.nombre}</span>
                                  {item.extras.length > 0 && (
                                    <div className="text-meta sm:text-meta text-gray-500 mt-0.5">
                                      Extras: {item.extras.map((e: any) => `${e.cantidad}x ${e.nombreExtra}`).join(', ')}
                                    </div>
                                  )}
                                  {item.notas && (
                                    <div className="text-meta sm:text-meta text-blue-600 italic mt-0.5">
                                      Nota: {item.notas}
                                    </div>
                                  )}
                                </div>
                                <span className="flex-shrink-0 ml-2 font-semibold text-green-600">
                                  ${((precioVenta(item.platillo) * item.cantidad) + item.extras.reduce((sum: number, e: any) => sum + (e.costoExtra * e.cantidad), 0)).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Detalles de productos */}
                      {orden.productos.length > 0 && (
                        <div className="mb-2 sm:mb-3">
                          <p className="text-meta sm:text-meta font-semibold text-gray-700 mb-1">Productos:</p>
                          <div className="space-y-1">
                            {orden.productos.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-meta sm:text-meta bg-green-50 px-2 py-1 rounded">
                                <span className="font-medium">{item.cantidad}x {item.nombreProducto}</span>
                                <span className="font-semibold text-green-600">${(item.costoProducto * item.cantidad).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notas y total */}
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between items-center text-meta mb-1">
                          <span className="text-gray-600">Notas:</span>
                          <span className="text-meta sm:text-meta text-gray-700">{orden.notas || 'Sin notas'}</span>
                        </div>
                        <div className="flex justify-between items-center text-meta font-semibold">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-green-600">${orden.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Orden actual */}
                  <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-white rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-700 mb-2 sm:mb-3 text-meta">Orden Actual - {nombreSuborden}</h4>
                    
                    {/* Información de mesa y cliente */}
                    <div className="grid grid-cols-2 gap-2 text-meta sm:text-meta mb-2">
                      <div>
                        <span className="text-gray-600">{getTipoMesaLabel()}:</span>
                        <span className="ml-1 font-medium">{selectedMesa?.nombre}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Cliente:</span>
                        <span className="ml-1 font-medium">{nombreSuborden}</span>
                      </div>
                    </div>

                    {/* Detalles de platillos */}
                    {platillosSeleccionados.length > 0 && (
                      <div className="mb-2 sm:mb-3">
                        <p className="text-meta sm:text-meta font-semibold text-gray-700 mb-1">Platillos:</p>
                        <div className="space-y-1">
                          {platillosSeleccionados.map((item, idx) => (
                            <div key={idx} className="flex items-start justify-between text-meta sm:text-meta bg-orange-50 px-2 py-1 rounded">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{item.cantidad}x {item.platillo.nombre}</span>
                                <span className="text-gray-600"> - {item.guiso.nombre}</span>
                                {item.extras.length > 0 && (
                                  <div className="text-meta sm:text-meta text-gray-500 mt-0.5">
                                    Extras: {item.extras.map((e: any) => `${e.cantidad}x ${e.nombreExtra}`).join(', ')}
                                  </div>
                                )}
                                {item.notas && (
                                  <div className="text-meta sm:text-meta text-blue-600 italic mt-0.5">
                                    Nota: {item.notas}
                                  </div>
                                )}
                              </div>
                              <span className="flex-shrink-0 ml-2 font-semibold text-orange-600">
                                ${((precioVenta(item.platillo) * item.cantidad) + item.extras.reduce((sum, e) => sum + (e.costoExtra * e.cantidad), 0)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detalles de productos */}
                    {productosSeleccionados.length > 0 && (
                      <div className="mb-2 sm:mb-3">
                        <p className="text-meta sm:text-meta font-semibold text-gray-700 mb-1">Productos:</p>
                        <div className="space-y-1">
                          {productosSeleccionados.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-meta sm:text-meta bg-orange-50 px-2 py-1 rounded">
                              <span className="font-medium">{item.cantidad}x {item.nombreProducto}</span>
                              <span className="font-semibold text-orange-600">${(item.costoProducto * item.cantidad).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Estado y notas */}
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between items-center text-meta mb-1">
                        <span className="text-gray-600">Estado:</span>
                        <span className={`font-medium ${
                          !isOrderComplete 
                            ? 'text-orange-600' 
                            : (platillosSeleccionados.length === 0 && productosSeleccionados.length > 0)
                              ? 'text-green-600'
                              : 'text-blue-600'
                        }`}>
                          {!isOrderComplete 
                            ? 'Pendiente' 
                            : (platillosSeleccionados.length === 0 && productosSeleccionados.length > 0)
                              ? 'Surtida'
                              : 'Recepción'
                          }
                        </span>
                      </div>
                      {notas && (
                        <div className="mb-1">
                          <span className="text-gray-600 text-meta">Notas:</span>
                          <p className="text-meta sm:text-meta text-gray-700 mt-0.5 bg-orange-50 p-1 rounded">{notas}</p>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-meta font-semibold">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-orange-600">${getTotalOrden().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Total general */}
                  {(ordenesEnProceso.length > 0 || platillosSeleccionados.length > 0 || productosSeleccionados.length > 0) && (
                    <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <span className="text-cuerpo lg:text-titulo font-semibold text-blue-900">
                            Total General ({ordenesEnProceso.length + (platillosSeleccionados.length > 0 || productosSeleccionados.length > 0 ? 1 : 0)} orden{ordenesEnProceso.length + (platillosSeleccionados.length > 0 || productosSeleccionados.length > 0 ? 1 : 0) > 1 ? 'es' : ''}):
                          </span>
                          <span className="text-titulo lg:text-titulo font-bold text-blue-600">
                            ${getTotalTodasLasOrdenes().toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-2 border-t border-blue-200">
                          <span className="text-meta font-medium text-blue-800">
                            Número de platillos totales:
                          </span>
                          <span className="text-cuerpo font-bold text-blue-700">
                            {(() => {
                              // Sumar gorditas de órdenes en proceso
                              const gorditasEnProceso = ordenesEnProceso.reduce((total, orden) => {
                                return total + orden.platillos.reduce((sum, platillo) => sum + platillo.cantidad, 0);
                              }, 0);
                              // Sumar gorditas de orden actual
                              const gorditasActuales = platillosSeleccionados.reduce((sum, platillo) => sum + platillo.cantidad, 0);
                              return gorditasEnProceso + gorditasActuales;
                            })()} gorditas
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}



        {/* Navigation Buttons */}
        <div className={`flex mt-4 sm:mt-8 pt-3 sm:pt-6 border-t border-gray-200 px-2 sm:px-0 ${currentStep === 3 ? 'justify-start' : 'justify-end'}`}>
          {/* Botón Anterior: solo se muestra en paso 3 */}
          {currentStep === 3 && (
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              className="btn text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="block sm:hidden">Ant</span>
              <span className="hidden sm:block">Anterior</span>
            </button>
          )}

          {/* Botón Siguiente: solo en paso 2 */}
          {currentStep === 2 && (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceedToNext()}
              className="btn bg-orange-600 text-white hover:bg-orange-700"
            >
              <span className="block sm:hidden">Sig</span>
              <span className="hidden sm:block">Siguiente</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
            </button>
          )}
        </div>
      </div>

      {/* Modal: Selección de Platillo */}
      {modalPlatilloOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-1 sm:p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-2 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h2 className="text-titulo font-bold text-gray-900">Seleccionar Platillo</h2>
              <button
                onClick={cancelarSeleccionPlatillo}
                className="text-gray-400 hover:text-gray-600 text-pantalla"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-3">
              {platillos.filter(p => p.activo).map((platillo) => (
                <button
                  key={platillo._id}
                  onClick={() => seleccionarPlatillo(platillo)}
                  className="btn border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 text-center"
                >
                  <div className="text-cuerpo font-semibold text-gray-900">{platillo.nombre}</div>
                  <div className="text-meta text-green-600 font-medium mt-1">${precioVenta(platillo).toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selección de Guiso */}
      {modalGuisoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-1 sm:p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-2 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h2 className="text-titulo font-bold text-gray-900">
                Seleccionar Guiso para {platilloEnConstruccion.platillo?.nombre}
              </h2>
              <button
                onClick={cancelarSeleccionPlatillo}
                className="text-gray-400 hover:text-gray-600 text-pantalla"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-3">
              {guisos.filter(g => g.activo).map((guiso) => (
                <button
                  key={guiso._id}
                  onClick={() => seleccionarGuiso(guiso)}
                  className="btn border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 text-center"
                >
                  <div className="text-cuerpo font-semibold text-gray-900">{guiso.nombre}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selección de Extras */}
      {modalExtrasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-1 sm:p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-2 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h2 className="text-titulo font-bold text-gray-900">Seleccionar Extras (Opcional)</h2>
              <button
                onClick={cancelarSeleccionPlatillo}
                className="text-gray-400 hover:text-gray-600 text-pantalla"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2 sm:space-y-4">
              {tiposExtras.map(tipo => {
                const extrasDelTipo = extras.filter(e => e.idTipoExtra === tipo._id && e.activo);
                if (extrasDelTipo.length === 0) return null;
                
                return (
                  <div key={tipo._id} className="border-b pb-4 last:border-b-0">
                    <h3 className="font-semibold text-purple-700 mb-3 text-cuerpo">{tipo.nombre}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                      {extrasDelTipo.map(extra => {
                        const extraSeleccionado = platilloEnConstruccion.extras.find(e => e.idExtra === extra._id);
                        
                        return (
                          <div key={extra._id} className="relative">
                            <button
                              onClick={() => toggleExtraEnConstruccion(extra)}
                              className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                                extraSeleccionado
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                              }`}
                            >
                              <div className="text-cuerpo font-semibold text-gray-900">{extra.nombre}</div>
                              <div className="text-meta text-purple-600 font-medium mt-1">+${extra.costo}</div>
                            </button>
                            
                            {extraSeleccionado && extra._id && (
                              <div className="mt-2 flex items-center justify-center gap-2 bg-purple-100 rounded-lg p-2">
                                <button
                                  onClick={() => actualizarCantidadExtraEnConstruccion(extra._id!, extraSeleccionado.cantidad - 1)}
                                  className="btn bg-white hover:bg-gray-100"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-cuerpo font-medium min-w-[20px] text-center">{extraSeleccionado.cantidad}</span>
                                <button
                                  onClick={() => actualizarCantidadExtraEnConstruccion(extra._id!, extraSeleccionado.cantidad + 1)}
                                  className="btn bg-white hover:bg-gray-100"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
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
                className="btn bg-gray-600 text-white hover:bg-gray-700"
              >
                Volver a Guisos
              </button>
              <button
                onClick={saltarExtras}
                className="btn bg-orange-600 text-white hover:bg-orange-700"
              >
                {platilloEnConstruccion.extras.length > 0 ? 'Siguiente' : 'Sin Extras'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notas del Platillo */}
      {modalNotasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-2 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-cuerpo font-bold text-gray-900">Cantidad y Notas</h2>
              <button
                onClick={cancelarSeleccionPlatillo}
                className="text-gray-400 hover:text-gray-600 text-pantalla"
              >
                ×
              </button>
            </div>

            {/* Selector de cantidad */}
            <div className="mb-2">
              <label className="block text-meta font-medium text-gray-700 mb-1">Cantidad</label>
              <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => setPlatilloEnConstruccion(prev => {
                    const nuevaCantidad = Math.max(1, prev.cantidad - 1);
                    // Ajustar cantidades de extras si exceden el nuevo límite
                    return {
                      ...prev,
                      cantidad: nuevaCantidad,
                      extras: prev.extras.map(e => ({
                        ...e,
                        cantidad: Math.min(e.cantidad, nuevaCantidad)
                      }))
                    };
                  })}
                  className="btn bg-gray-100 hover:bg-gray-200"
                >
                  <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <span className="text-titulo font-semibold w-12 sm:w-14 text-center">{platilloEnConstruccion.cantidad}</span>
                <button
                  onClick={() => setPlatilloEnConstruccion(prev => ({ ...prev, cantidad: prev.cantidad + 1 }))}
                  className="btn bg-gray-100 hover:bg-gray-200"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Notas */}
            <div className="mb-2">
              <label className="block text-meta sm:text-meta font-medium text-gray-700 mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={platilloEnConstruccion.notas}
                onChange={(e) => setPlatilloEnConstruccion(prev => ({ ...prev, notas: e.target.value }))}
                maxLength={200}
                rows={1}
                className="campo resize-none sm:text-meta"
                placeholder="Ej: Sin cebolla, extra salsa"
              />
              <p className="text-meta sm:text-meta text-gray-500 mt-0.5">{platilloEnConstruccion.notas.length}/200</p>
            </div>

            {/* Extras con controles de cantidad */}
            {platilloEnConstruccion.extras.length > 0 && (
              <div className="mb-2 max-h-32 sm:max-h-40 overflow-y-auto">
                <div className="space-y-0.5 sm:space-y-1">
                  {platilloEnConstruccion.extras.map((extra, index) => {
                    const alcanzoLimite = extra.cantidad >= platilloEnConstruccion.cantidad;
                    return (
                      <div key={index} className="flex items-center justify-between p-1 sm:p-1.5 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex-1 min-w-0 mr-1 sm:mr-2">
                          <p className="text-meta sm:text-meta font-medium text-gray-900 truncate">{extra.nombreExtra}</p>
                          <p className="text-meta sm:text-meta text-purple-600">+${extra.costoExtra} c/u</p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-lg p-1 border border-purple-300">
                            <button
                              onClick={() => {
                                if (extra.cantidad === 1) {
                                  // Si es el último, eliminar el extra
                                  setPlatilloEnConstruccion(prev => ({
                                    ...prev,
                                    extras: prev.extras.filter((_, i) => i !== index)
                                  }));
                                } else {
                                  actualizarCantidadExtraEnConstruccion(extra.idExtra, extra.cantidad - 1);
                                }
                              }}
                              className="btn hover:bg-purple-100 active:scale-95"
                            >
                              <Minus className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                            </button>
                            <span className="text-cuerpo font-semibold w-8 sm:w-10 text-center">{extra.cantidad}</span>
                            <button
                              onClick={() => actualizarCantidadExtraEnConstruccion(extra.idExtra, extra.cantidad + 1)}
                              disabled={alcanzoLimite}
                              className={`p-1.5 sm:p-2 rounded transition-colors active:scale-95 ${
                                alcanzoLimite 
                                  ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                                  : 'hover:bg-purple-100'
                              }`}
                            >
                              <Plus className={`w-5 h-5 sm:w-6 sm:h-6 ${alcanzoLimite ? 'text-gray-400' : 'text-purple-600'}`} />
                            </button>
                          </div>
                          <span className="text-meta sm:text-meta font-medium text-purple-700 min-w-[40px] sm:min-w-[50px] text-right">
                            ${(extra.costoExtra * extra.cantidad).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resumen */}
            <div className="mb-2 p-1.5 sm:p-2 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-1 text-meta sm:text-meta">Resumen:</h3>
              <div className="text-meta sm:text-meta text-gray-600 space-y-0.5">
                <p><span className="font-medium">Platillo:</span> {platilloEnConstruccion.platillo?.nombre}</p>
                <p><span className="font-medium">Guiso:</span> {platilloEnConstruccion.guiso?.nombre}</p>
                <p><span className="font-medium">Cantidad:</span> {platilloEnConstruccion.cantidad}</p>
                {platilloEnConstruccion.extras.length > 0 && (() => {
                  const totalExtras = platilloEnConstruccion.extras.reduce((sum, e) => sum + e.cantidad, 0);
                  return (
                    <p className="font-medium text-purple-600">
                      {totalExtras} extra{totalExtras > 1 ? 's' : ''} agregado{totalExtras > 1 ? 's' : ''}
                    </p>
                  );
                })()}
                {platilloEnConstruccion.notas && (
                  <p className="text-meta sm:text-meta text-blue-600 italic">Notas: {platilloEnConstruccion.notas}</p>
                )}
              </div>
              <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-gray-200">
                <p className="text-meta font-semibold text-green-600">
                  Total: ${(
                    precioVenta(platilloEnConstruccion.platillo) * platilloEnConstruccion.cantidad +
                    platilloEnConstruccion.extras.reduce((sum, e) => sum + (e.costoExtra * e.cantidad), 0)
                  ).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setModalNotasOpen(false);
                  setModalExtrasOpen(true);
                }}
                className="btn bg-gray-500 text-white hover:bg-gray-600"
              >
                Volver a Extras
              </button>
              <button
                onClick={cancelarSeleccionPlatillo}
                className="btn flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={finalizarPlatillo}
                className="btn flex-1 bg-green-600 text-white hover:bg-green-700"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selección de Producto */}
      {modalProductoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-1 sm:p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-2 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-titulo font-bold text-gray-900">Seleccionar Producto</h2>
              <button
                onClick={() => setModalProductoOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-pantalla"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {productos.filter(p => p.activo).map((producto) => (
                <button
                  key={producto._id}
                  onClick={() => seleccionarProducto(producto)}
                  disabled={producto.cantidad < 1}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-colors text-center ${
                    producto.cantidad < 1
                      ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                  }`}
                >
                  <div className="text-cuerpo font-semibold text-gray-900">{producto.nombre}</div>
                  <div className="text-meta text-green-600 font-medium mt-1">${producto.costo}</div>
                  <div className={`text-meta sm:text-meta mt-1 ${producto.cantidad < 1 ? 'text-red-600' : 'text-gray-500'}`}>
                    {producto.cantidad < 1 ? 'Sin stock' : `Stock: ${producto.cantidad}`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selección de Variantes */}
      {modalVariantesOpen && productoConVariantes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-1 sm:p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-2 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-titulo font-bold text-gray-900">Seleccionar Variante</h2>
                <p className="text-cuerpo text-gray-600 mt-1">{productoConVariantes.nombre}</p>
              </div>
              <button
                onClick={() => {
                  setModalVariantesOpen(false);
                  setProductoConVariantes(null);
                  setModalProductoOpen(true);
                }}
                className="text-gray-400 hover:text-gray-600 text-pantalla"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {productoConVariantes.variantes.map((variante: string, index: number) => (
                <button
                  key={index}
                  onClick={() => seleccionarVariante(variante)}
                  className="btn border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-center"
                >
                  <div className="text-cuerpo font-semibold text-gray-900">{variante}</div>
                  <div className="text-cuerpo text-gray-600 mt-1">
                    {productoConVariantes.nombre} - {variante}
                  </div>
                  <div className="text-cuerpo text-green-600 font-medium mt-2">
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
                className="btn w-full text-gray-700 bg-gray-100 hover:bg-gray-200"
              >
                Volver a Productos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Salida */}
      {showSalirModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-fade-in">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-5">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-3 bg-white rounded-full shadow-lg">
                <svg className="w-12 h-12 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-pantalla font-bold text-white text-center">
                🚪 ¿Abandonar página?
              </h3>
            </div>

            {/* Contenido */}
            <div className="p-6">
              <h4 className="text-titulo font-semibold text-gray-900 text-center mb-4">
                Tienes datos sin guardar
              </h4>
              
              <div className="mb-6 space-y-3">
                {/* Advertencia principal */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-cuerpo font-medium text-yellow-800">
                        Advertencia de pérdida de datos
                      </p>
                      <p className="text-meta text-yellow-700 mt-1">
                        Si abandonas esta página ahora, se perderán todos los datos que hayas ingresado
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información de órdenes en proceso */}
                {ordenesEnProceso.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-cuerpo font-medium text-red-800">
                          <span className="font-bold">{ordenesEnProceso.length}</span> {ordenesEnProceso.length === 1 ? 'orden' : 'órdenes'} sin confirmar
                        </p>
                        <div className="mt-2 max-h-24 overflow-y-auto">
                          <ul className="space-y-1">
                            {ordenesEnProceso.map((orden, index) => (
                              <li key={index} className="flex items-center justify-between text-meta text-red-700 bg-red-100 px-2 py-1 rounded">
                                <span>{orden.nombreCliente}</span>
                                <span className="font-semibold">${orden.total.toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Información de orden actual */}
                {(platillosSeleccionados.length > 0 || productosSeleccionados.length > 0) && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-cuerpo font-medium text-blue-800">
                          Orden actual sin guardar
                        </p>
                        <p className="text-meta text-blue-700 mt-1">
                          {platillosSeleccionados.length} platillos • {productosSeleccionados.length} productos
                          {nombreSuborden && ` • Cliente: ${nombreSuborden}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mesa seleccionada */}
                {selectedMesa && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-meta text-gray-700">
                      <span className="font-semibold">Mesa seleccionada:</span> {selectedMesa.nombre}
                    </p>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={cancelarSalida}
                  className="btn flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  ⬅️ Quedarse
                </button>
                <button
                  onClick={confirmarSalida}
                  className="btn flex-1 bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 border-2 border-gray-300 hover:border-gray-400"
                >
                  🚪 Salir de todas formas
                </button>
              </div>

              <p className="text-center text-meta text-gray-500 mt-3">
                💡 Te recomendamos guardar tus cambios antes de salir
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Reinicio */}
      {showReiniciarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-fade-in">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-5">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-3 bg-white rounded-full shadow-lg">
                <RotateCcw className="w-10 h-10 text-red-600 animate-pulse" />
              </div>
              <h3 className="text-pantalla font-bold text-white text-center">
                ⚠️ ¡Atención!
              </h3>
            </div>

            {/* Contenido */}
            <div className="p-6">
              <h4 className="text-titulo font-semibold text-gray-900 text-center mb-4">
                ¿Deseas reiniciar el formulario?
              </h4>
              
              <div className="mb-6 space-y-3">
                {ordenesEnProceso.length > 0 ? (
                  <>
                    <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-cuerpo font-medium text-red-800">
                            Tienes <span className="font-bold">{ordenesEnProceso.length} {ordenesEnProceso.length === 1 ? 'orden' : 'órdenes'}</span> en proceso
                          </p>
                          <p className="text-meta text-red-700 mt-1">
                            Se perderán todos los datos no confirmados
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Lista de órdenes en proceso */}
                    <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <p className="text-meta font-semibold text-gray-700 mb-2">Órdenes que se perderán:</p>
                      <ul className="space-y-1">
                        {ordenesEnProceso.map((orden, index) => (
                          <li key={index} className="flex items-center justify-between text-meta text-gray-600 bg-white px-2 py-1 rounded">
                            <span className="font-medium">{orden.nombreCliente}</span>
                            <span className="text-green-600 font-semibold">${orden.total.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-cuerpo font-medium text-yellow-800">
                          Datos sin guardar
                        </p>
                        <p className="text-meta text-yellow-700 mt-1">
                          Si tienes órdenes en fila sin confirmar, se perderán todos los datos ingresados
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Información adicional si hay items en la orden actual */}
                {(platillosSeleccionados.length > 0 || productosSeleccionados.length > 0) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-meta text-blue-800">
                      <span className="font-semibold">Orden actual:</span> {platillosSeleccionados.length} platillos, {productosSeleccionados.length} productos
                    </p>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReiniciarModal(false)}
                  className="btn flex-1 bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 border-2 border-gray-300 hover:border-gray-400"
                >
                  ✕ Cancelar
                </button>
                <button
                  onClick={ejecutarReinicio}
                  className="btn flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  🔄 Sí, Reiniciar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NuevaOrden;