import React, { useState, useEffect } from 'react';
import { Aviso } from '../components/Aviso';
import { 
  Receipt, 
  Printer, 
  Clock,
  CheckCircle,
  StickyNote,
  ChevronDown,
  ChevronRight,
  Users
} from 'lucide-react';
import { apiService } from '../services/api';
import { Orden, OrdenCompleta, MesaAgrupada } from '../types';

const Cobrar: React.FC = () => {
  // Eliminamos mesas y selectedMesa
  const [ordenesActivas, setOrdenesActivas] = useState<OrdenCompleta[]>([]);
  const [mesasAgrupadas, setMesasAgrupadas] = useState<MesaAgrupada[]>([]);
  const [todasLasOrdenesActivas, setTodasLasOrdenesActivas] = useState<Orden[]>([]); // Todas las órdenes sin filtrar
  const [expandedMesas, setExpandedMesas] = useState<Set<number>>(new Set());
  const [expandedOrdenes, setExpandedOrdenes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasNewOrders, setHasNewOrders] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Función para detectar si una orden está marcada como pagada
  const esOrdenPagada = (nombreCliente: string | undefined): boolean => {
    if (!nombreCliente) return false;
    return nombreCliente.trim().endsWith('- Pagada');
  };

  // Función para verificar si TODAS las órdenes de una mesa están pagadas
  const todasLasOrdenesDeMesaPagadas = (mesa: MesaAgrupada): boolean => {
    return mesa.ordenes.length > 0 && mesa.ordenes.every(orden => esOrdenPagada(orden.nombreCliente));
  };

  useEffect(() => {
    loadOrdenesActivas();
    // Set up polling for real-time updates
    const interval = setInterval(loadOrdenesActivas, 12000); // Refresh every 12 seconds
    return () => clearInterval(interval);
  }, []);

  // Function to group orders by table
  const groupOrdersByTable = (ordenes: OrdenCompleta[]): MesaAgrupada[] => {
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
      grouped[idMesa].totalMonto += orden.total || 0;
      
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

  const toggleMesaExpansion = (idMesa: number) => {
    const newExpanded = new Set(expandedMesas);
    if (newExpanded.has(idMesa)) {
      newExpanded.delete(idMesa);
    } else {
      newExpanded.add(idMesa);
    }
    setExpandedMesas(newExpanded);
  };

  const toggleOrdenExpansion = (ordenId: string) => {
    const newExpanded = new Set(expandedOrdenes);
    if (newExpanded.has(ordenId)) {
      newExpanded.delete(ordenId);
    } else {
      newExpanded.add(ordenId);
    }
    setExpandedOrdenes(newExpanded);
  };

  // Función para verificar si TODAS las órdenes de una mesa están listas para cobrar
  const todasLasOrdenesDeMesaListasParaCobrar = (idMesa: number): boolean => {
    // Obtener TODAS las órdenes de esta mesa (incluyendo las que no están en Surtida/Entregada)
    const ordenesDelaMesa = todasLasOrdenesActivas.filter(orden => orden.idMesa === idMesa);
    
    // Verificar que todas estén en estatus Surtida o Entregada
    return ordenesDelaMesa.length > 0 && 
           ordenesDelaMesa.every(orden => orden.estatus === 'Surtida' || orden.estatus === 'Entregada');
  };

  const loadOrdenesActivas = async () => {
    try {
  const response = await apiService.getOrdenesActivas();
      if (response.success) {
        let ordenesArray: Orden[] = [];
        if (Array.isArray(response.data.ordenes)) {
          ordenesArray = response.data.ordenes;
        } else if (Array.isArray(response.data)) {
          ordenesArray = response.data;
        }
        
        // Guardar TODAS las órdenes activas sin filtrar (para verificar disponibilidad del botón)
        setTodasLasOrdenesActivas(ordenesArray);
        
        // Filtrar órdenes con estatus Surtida o Entregada para mostrar en la vista
        const ordenesFiltradas = ordenesArray.filter(
          (orden: Orden) => orden.estatus === 'Surtida' || orden.estatus === 'Entregada'
        );
        
        // Detectar nuevas órdenes para cobrar
        const currentOrderIds = ordenesActivas.map(o => o._id);
        const newOrderIds = ordenesFiltradas.map(o => o._id);
        const hasNewData = newOrderIds.some(id => !currentOrderIds.includes(id));
        
        if (hasNewData && ordenesActivas.length > 0) {
          setHasNewOrders(true);
          setSuccess('Nuevas órdenes para cobrar detectadas');
          setTimeout(() => {
            setHasNewOrders(false);
            setSuccess('');
          }, 5000);
        }
        
        // Cargar detalles para cada orden en paralelo
        const ordenesConDetalles: OrdenCompleta[] = await Promise.all(
          ordenesFiltradas.map(async (orden) => {
            try {
              const detailsResponse = await apiService.getOrdenDetails(orden._id!);
              if (detailsResponse.success) {
                const data = detailsResponse.data;
                // Map platillos to include extras
                const platillosConExtras = (data.platillos || []).map((p: any) => ({
                  ...p,
                  extras: p.extras || []
                }));
                return {
                  ...data,
                  platillos: platillosConExtras,
                  extras: data.extras || []
                };
              } else {
                return {
                  ...orden,
                  productos: [],
                  platillos: [],
                  extras: []
                };
              }
            } catch {
              return {
                ...orden,
                productos: [],
                platillos: [],
                extras: []
              };
            }
          })
        );
        setOrdenesActivas(ordenesConDetalles);
        setLastUpdateTime(new Date());
        // Group orders by table
        const grouped = groupOrdersByTable(ordenesConDetalles);
        setMesasAgrupadas(grouped);
      } else {
        setOrdenesActivas([]);
      }
    } catch (err) {
      setError('Error cargando órdenes');
      setOrdenesActivas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTicket = (orden: OrdenCompleta) => {
    const ticketContent = generateTicketContent(orden);
    const blob = new Blob([ticketContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${orden._id?.toString().slice(-6)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintTicket = (orden: OrdenCompleta) => {
    const ticketContent = generateTicketContent(orden);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket - Orden ${orden._id?.toString().slice(-6)}</title>
            <style>
              body { font-family: monospace; font-size: 12px; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .line { border-bottom: 1px dashed #000; margin: 10px 0; }
              .total { font-weight: bold; font-size: 14px; }
            </style>
          </head>
          <body>${ticketContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleGenerateMesaTicket = (mesa: MesaAgrupada) => {
    const ticketContent = generateMesaTicketContent(mesa);
    const blob = new Blob([ticketContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-mesa-${mesa.nombreMesa.replace(/\s/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintMesaTicket = (mesa: MesaAgrupada) => {
    const ticketContent = generateMesaTicketContent(mesa);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket - ${mesa.nombreMesa}</title>
            <style>
              body { font-family: monospace; font-size: 12px; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .line { border-bottom: 1px dashed #000; margin: 10px 0; }
              .total { font-weight: bold; font-size: 14px; }
              h3 { margin-top: 15px; margin-bottom: 5px; }
              h4 { margin-top: 10px; margin-bottom: 3px; }
            </style>
          </head>
          <body>${ticketContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  /**
   * Cobrar es la acción menos reversible del sistema: deshacerla no es un botón, hay que
   * cambiar el estado a mano y explicárselo al cliente. Por eso se confirma.
   *
   * El importe va en la pregunta a propósito. Un «¿seguro?» sin datos se contesta que sí por
   * reflejo; «¿Cobrar $340.00 de la Mesa 4?» obliga a mirar, que es de lo que se trata.
   */
  const confirmarCobro = (que: string, monto: number) =>
    window.confirm(`¿Cobrar $${monto.toFixed(2)} de ${que}? No se puede deshacer.`);

  const handleCobrarTodaLaMesa = async (mesa: MesaAgrupada) => {
    // Si ya está pagada, este botón dice «Entregar» y no hay nada irreversible que confirmar.
    if (!todasLasOrdenesDeMesaPagadas(mesa) && !confirmarCobro(mesa.nombreMesa, mesa.totalMonto)) return;

    setProcessing(true);
    try {
      // Cobrar todas las órdenes de la mesa en paralelo
      await Promise.all(mesa.ordenes.map(orden => handleFinalizarOrden(orden, true)));
      
      // Si el nombre de la mesa comienza con "Pedido" (temporal), eliminarla después de cobrar todas las órdenes
      // No necesitamos consultar órdenes activas porque acabamos de cobrar TODAS las órdenes de esta mesa
      if (mesa.nombreMesa && mesa.nombreMesa.trim().toLowerCase().startsWith('pedido')) {
        try {
          await apiService.deleteCatalogItem('mesa', mesa.idMesa.toString());
          console.log(`Mesa temporal ${mesa.nombreMesa} eliminada después de cobrar toda la mesa`);
        } catch (error) {
          console.error('Error al eliminar mesa temporal:', error);
          // No fallar el cobro si hay error con la mesa temporal
        }
      }
      
      setSuccess('Todas las órdenes de la mesa cobradas exitosamente');
      await loadOrdenesActivas();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al cobrar todas las órdenes de la mesa');
    } finally {
      setProcessing(false);
    }
  };

  // El parámetro skipProcessing evita que se sobreescriba el estado global cuando se cobra en lote
  const handleFinalizarOrden = async (orden: OrdenCompleta, skipProcessing = false) => {
    // `skipProcessing` marca la llamada en lote desde «Cobrar toda la mesa», que ya preguntó
    // una vez por el total. Preguntar otra vez por cada orden convertiría el aviso en ruido,
    // y un aviso que se contesta en piloto automático no protege de nada.
    if (!skipProcessing && !esOrdenPagada(orden.nombreCliente)) {
      const que = orden.nombreCliente?.trim() || orden.nombreMesa || 'esta orden';
      if (!confirmarCobro(que, Number(orden.total) || 0)) return;
    }

    if (!skipProcessing) setProcessing(true);
    try {
      const response = await apiService.updateOrdenStatus(orden._id?.toString() || '', 'Pagada');
      if (response.success) {
        // Solo verificar/eliminar mesa temporal si NO viene del botón "Cobrar toda la mesa"
        // (cuando skipProcessing=true, la eliminación la maneja handleCobrarTodaLaMesa)
        if (!skipProcessing) {
          // Verificar si la mesa es temporal (nombre comienza con "Pedido") y si es la última orden activa
          try {
            const mesasResponse = await apiService.getCatalog<any>('mesa');
            const todasLasMesas = Array.isArray(mesasResponse.data?.items) ? mesasResponse.data.items : Array.isArray(mesasResponse.data) ? mesasResponse.data : [];
            
            // Buscar la mesa de esta orden
            const mesaDeOrden = todasLasMesas.find((mesa: any) => mesa._id === orden.idMesa);
            
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
              
              // Filtrar órdenes de esta mesa que NO sean Pagada ni Cancelado (excluyendo la que acabamos de cobrar)
              const ordenesActivasEnMesa = todasLasOrdenes.filter(
                (ord: any) => 
                  ord.idMesa === orden.idMesa && 
                  ord._id !== orden._id &&
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
            // No fallar el cobro si hay error con la mesa temporal
          }
        }
        
        if (!skipProcessing) {
          setSuccess('Orden cobrada exitosamente');
          await loadOrdenesActivas();
          setTimeout(() => setSuccess(''), 3000);
        }
      } else {
        setError('Error al cobrar la orden');
      }
    } catch (err) {
      setError('Error al cobrar la orden');
    } finally {
      if (!skipProcessing) setProcessing(false);
    }
  };

  const generateTicketContent = (orden: OrdenCompleta) => {
    const fecha = orden.fecha ? new Date(orden.fecha) : new Date();
    
    // Función para generar HTML de platillos con extras
    const generatePlatillosHtml = () => {
      if (!orden.platillos?.length) return '<p>Sin platillos</p>';
      
      return orden.platillos.map(p => {
        let html = `<p>${p.cantidad}x ${p.nombrePlatillo} - $${(p.importe || 0).toFixed(2)}</p>`;
        
        // Agregar extras si existen
        if (p.extras && p.extras.length > 0) {
          const extrasHtml = p.extras.map((e: any) => 
            `<p style="margin-left: 15px; font-size: 0.9em; color: #666;">+ ${e.cantidad}x ${e.nombreExtra} - $${(e.importe || 0).toFixed(2)}</p>`
          ).join('');
          html += extrasHtml;
        }
        
        return html;
      }).join('');
    };
    
    return `
      <div class="header">
        <h2>RESTAURANTE</h2>
        <p>Ticket de Venta</p>
        <div class="line"></div>
      </div>
      <p><strong>Fecha:</strong> ${fecha.toLocaleDateString('es-ES')}</p>
      <p><strong>Hora:</strong> ${fecha.toLocaleTimeString('es-ES')}</p>
      <p><strong>Orden:</strong> #${orden._id?.toString().slice(-6)}</p>
      <div class="line"></div>
      <h3>PLATILLOS</h3>
      ${generatePlatillosHtml()}
      <h3>PRODUCTOS</h3>
      ${orden.productos?.length
        ? orden.productos.map(p => `<p>${p.cantidad}x ${p.nombreProducto || p.nombre || ''} - $${(p.importe !== undefined ? p.importe.toFixed(2) : '0.00')}</p>`).join('')
        : '<p>Sin productos</p>'
      }
      <div class="line"></div>
      <div class="total">
        <p>TOTAL: $${orden.total?.toFixed(2)}</p>
      </div>
      <div class="line"></div>
      <p style="text-align: center;">¡Gracias por su preferencia!</p>
    `;
  };

  const generateMesaTicketContent = (mesa: MesaAgrupada) => {
    const fecha = new Date();
    
    // Función para generar HTML de platillos con extras para mesa
    const generatePlatillosHtmlForMesa = (platillos: any[]) => {
      if (!platillos?.length) return '<p>  Sin platillos</p>';
      
      return platillos.map(p => {
        let html = `<p>  ${p.cantidad}x ${p.nombrePlatillo} - $${(p.importe || 0).toFixed(2)}</p>`;
        
        // Agregar extras si existen
        if (p.extras && p.extras.length > 0) {
          const extrasHtml = p.extras.map((e: any) => 
            `<p style="margin-left: 25px; font-size: 0.9em; color: #666;">+ ${e.cantidad}x ${e.nombreExtra} - $${(e.importe || 0).toFixed(2)}</p>`
          ).join('');
          html += extrasHtml;
        }
        
        return html;
      }).join('');
    };
    
    return `
      <div class="header">
        <h2>RESTAURANTE</h2>
        <p>Ticket de Venta - ${mesa.nombreMesa}</p>
        <div class="line"></div>
      </div>
      <p><strong>Fecha:</strong> ${fecha.toLocaleDateString('es-ES')}</p>
      <p><strong>Hora:</strong> ${fecha.toLocaleTimeString('es-ES')}</p>
      <p><strong>Mesa:</strong> ${mesa.nombreMesa}</p>
      <p><strong>Total de órdenes:</strong> ${mesa.totalOrdenes}</p>
      <div class="line"></div>
      ${Object.entries(mesa.clientes).map(([cliente, ordenesCliente]) => `
        <h3>CLIENTE: ${cliente.toUpperCase()}</h3>
        ${ordenesCliente.map((orden: OrdenCompleta) => `
          <p><strong>Orden #${orden._id?.toString().slice(-6)}</strong></p>
          <h4>Platillos:</h4>
          ${generatePlatillosHtmlForMesa(orden.platillos || [])}
          <h4>Productos:</h4>
          ${orden.productos?.length
            ? orden.productos.map((p: any) => `<p>  ${p.cantidad}x ${p.nombreProducto || p.nombre || ''} - $${(p.importe !== undefined ? p.importe.toFixed(2) : '0.00')}</p>`).join('')
            : '<p>  Sin productos</p>'
          }
          <p><strong>Subtotal Orden:</strong> $${orden.total?.toFixed(2)}</p>
          <div class="line"></div>
        `).join('')}
        <p><strong>Total Cliente ${cliente}:</strong> $${ordenesCliente.reduce((sum, orden) => sum + (orden.total || 0), 0).toFixed(2)}</p>
        <div class="line"></div>
      `).join('')}
      <div class="total">
        <p>TOTAL MESA ${mesa.nombreMesa}: $${mesa.totalMonto.toFixed(2)}</p>
      </div>
      <div class="line"></div>
      <p style="text-align: center;">¡Gracias por su preferencia!</p>
    `;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 px-0.1 sm:px-2 lg:px-3 max-w-full mx-auto relative">
      {/* Overlay de carga al procesar cobro */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-orange-600 mb-6"></div>
            <span className="text-white text-titulo font-bold">Procesando cobro...</span>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-pantalla font-bold text-gray-900 break-words">Cobrar</h1>
          <p className="text-gray-600 mt-1 text-cuerpo break-words">Procesa el pago y finaliza las órdenes</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {hasNewOrders && (
            <div className="bg-yellow-100 rounded-lg px-2 py-1 sm:px-3 sm:py-2 shadow-sm border border-yellow-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse flex-shrink-0"></div>
                <span className="text-meta font-medium text-yellow-700 truncate">
                  Nuevas órdenes para cobrar
                </span>
              </div>
            </div>
          )}
          <div className="text-meta text-gray-500 text-right sm:text-left truncate">
           {lastUpdateTime.toLocaleTimeString('es-ES')}
          </div>
        </div>
      </div>

      <Aviso error={error} exito={success} />

      

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 sm:p-4 lg:p-6">
        <h2 className="text-titulo font-semibold text-gray-900 mb-2 sm:mb-4 break-words">Órdenes para Cobrar</h2>
        {mesasAgrupadas.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay órdenes para cobrar</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {mesasAgrupadas.map((mesa) => (
              <div key={mesa.idMesa} className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Mesa Header - Clickable to expand/collapse */}
                <div 
                  className="p-1.5 sm:p-3 lg:p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleMesaExpansion(mesa.idMesa)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-cuerpo lg:text-titulo font-semibold text-gray-900 break-words hyphens-auto">
                          {mesa.nombreMesa}
                        </h3>
                        <p className="text-meta text-gray-600 break-words">
                          {mesa.totalOrdenes} {mesa.totalOrdenes === 1 ? 'orden' : 'órdenes'}
                        </p>
                        {/* Lista de clientes de las órdenes en la mesa */}
                        {Object.keys(mesa.clientes).length > 0 && (
                          <div
                            className="mt-1 text-meta text-gray-700 flex gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                            style={{ WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}
                          >
                            {Object.keys(mesa.clientes).map((cliente, idx) => (
                              <span
                                key={cliente + idx}
                                className="bg-gray-100 rounded px-2 py-0.5 whitespace-nowrap flex-shrink-0"
                                title={cliente}
                              >
                                {cliente}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="text-left sm:text-right">
                        <p className="text-cuerpo lg:text-titulo font-semibold text-green-600 break-words">
                          ${mesa.totalMonto.toFixed(2)}
                        </p>
                        <p className="text-meta text-gray-600 break-words">Total mesa</p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end">
                        {expandedMesas.has(mesa.idMesa) ? (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick actions for the entire table when collapsed */}
                  {!expandedMesas.has(mesa.idMesa) && (
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 sm:space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                        <button
                          onClick={() => handleGenerateMesaTicket(mesa)}
                          className="btn flex-1 btn-neutro"
                        >
                          <Receipt className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                          <span className="truncate">PDF</span>
                        </button>
                        <button
                          onClick={() => handlePrintMesaTicket(mesa)}
                          className="btn flex-1 btn-neutro"
                        >
                          <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                          <span className="truncate">Imprimir</span>
                        </button>
                      </div>
                      {/* Solo mostrar botón de cobrar si TODAS las órdenes de la mesa (incluyendo las no mostradas) están listas */}
                      {todasLasOrdenesDeMesaListasParaCobrar(mesa.idMesa) && (
                        <button
                          onClick={() => handleCobrarTodaLaMesa(mesa)}
                          disabled={processing}
                          className="btn w-full btn-avanzar"
                        >
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {mesa.totalOrdenes === 1 
                              ? (esOrdenPagada(mesa.ordenes[0].nombreCliente) ? 'Entregar' : 'Cobrar')
                              : (todasLasOrdenesDeMesaPagadas(mesa) ? 'Entregar ' : 'Cobrar ')
                            }
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Orders grouped by client - Expanded view */}
                {expandedMesas.has(mesa.idMesa) && (
                  <div className="p-1.5 sm:p-3 lg:p-4">
                    {/* Mostrar las órdenes de la mesa en un grid de 3 columnas, sin agrupar por cliente */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {mesa.ordenes.map((orden) => (
                        <div key={orden._id?.toString()} className="bg-white border border-gray-200 rounded-lg p-1.5 flex flex-col h-full shadow-sm">
                          {/* Nombre del cliente */}
                          <div className="text-meta font-semibold text-gray-700 mb-1 truncate">
                            {orden.nombreCliente || 'Sin nombre'}
                          </div>
                          {/* Número de orden y hora */}
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900 text-cuerpo">#{orden._id?.toString().slice(-6)}</span>
                            <span className="text-meta text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {orden.fecha ? new Date(orden.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          {/* Notas de la orden */}
                          {orden.notas && (
                            <div className="flex items-start space-x-1 mb-1">
                              <StickyNote className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <p className="text-meta text-gray-700 italic break-words">{orden.notas}</p>
                            </div>
                          )}
                          {/* Productos */}
                          {orden.productos && orden.productos.length > 0 && (
                            <div className="mb-1">
                              <p className="text-meta font-medium text-gray-700 mb-0.5">Productos:</p>
                              <ul className="space-y-0.5">
                                {orden.productos.map((producto, idx) => (
                                  <li key={idx} className="flex justify-between items-center text-meta">
                                    <span className="text-gray-600 truncate">{producto.cantidad}x {producto.nombreProducto || producto.nombre || 'Producto'}</span>
                                    <span className="font-medium text-gray-900">${(producto.importe || 0).toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {/* Platillos */}
                          {orden.platillos && orden.platillos.length > 0 && (
                            <div className="mb-1">
                              <p className="text-meta font-medium text-gray-700 mb-0.5">Platillos:</p>
                              <ul className="space-y-0.5">
                                {orden.platillos.map((platillo, idx) => (
                                  <li key={idx} className="flex flex-col">
                                    <div className="flex justify-between items-center text-meta">
                                      <span className="text-gray-600 truncate">{platillo.cantidad}x {platillo.nombrePlatillo} ({platillo.nombreGuiso})</span>
                                      <span className="font-medium text-gray-900">${(platillo.importe || 0).toFixed(2)}</span>
                                    </div>
                                    {/* Extras del platillo */}
                                    {platillo.extras && platillo.extras.length > 0 && (
                                      <ul className="ml-2 space-y-0.5">
                                        {platillo.extras.map((extra: any, extraIdx: number) => (
                                          <li key={extraIdx} className="flex justify-between items-center text-meta">
                                            <span className="text-purple-600 italic truncate">+ {extra.cantidad}x {extra.nombreExtra}</span>
                                            {/* No mostrar precio del extra */}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    {/* Notas del platillo */}
                                    {platillo.notas && (
                                      <div className="ml-2 text-meta text-blue-600 italic">Nota: {platillo.notas}</div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {/* Total y estatus */}
                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                            <span className="text-cuerpo font-bold text-green-600">${orden.total?.toFixed(2)}</span>
                            <span className={`inline-block px-1 py-0.5 text-meta font-medium rounded-full ${orden.estatus === 'Entregada' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{orden.estatus}</span>
                          </div>
                          {/* Acciones */}
                          <div className="flex flex-col gap-1 mt-2">
                            <div className="flex gap-1">
                              <button onClick={() => handleGenerateTicket(orden)} className="btn flex-1 btn-neutro">
                                <Receipt className="w-3 h-3 mr-0.5 flex-shrink-0" />
                                <span className="truncate">PDF</span>
                              </button>
                              <button onClick={() => handlePrintTicket(orden)} className="btn flex-1 btn-neutro">
                                <Printer className="w-3 h-3 mr-0.5 flex-shrink-0" />
                                <span className="truncate">Impr.</span>
                              </button>
                            </div>
                            <button onClick={() => handleFinalizarOrden(orden)} disabled={processing} className="btn w-full btn-avanzar">
                              <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">
                                {esOrdenPagada(orden.nombreCliente) ? 'Entregar' : 'Cobrar'}
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Opción para cobrar toda la mesa */}
                    <div className="mt-3 pt-3 border-t border-gray-200 bg-green-50 rounded-lg p-1.5 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1.5 sm:mb-3">
                        <span className="text-titulo font-semibold text-gray-900">Total de la mesa:</span>
                        <span className="text-titulo font-bold text-green-600">${mesa.totalMonto.toFixed(2)}</span>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                          <button
                            onClick={() => handleGenerateMesaTicket(mesa)}
                            className="btn flex-1 btn-neutro"
                          >
                            <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                            <span className="truncate">PDF Mesa</span>
                          </button>
                          <button
                            onClick={() => handlePrintMesaTicket(mesa)}
                            className="btn flex-1 btn-neutro"
                          >
                            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                            <span className="truncate">Imprimir</span>
                          </button>
                        </div>
                        {/* Solo mostrar botón de cobrar si TODAS las órdenes de la mesa (incluyendo las no mostradas) están listas */}
                        {todasLasOrdenesDeMesaListasParaCobrar(mesa.idMesa) && (
                          <button
                            onClick={() => handleCobrarTodaLaMesa(mesa)}
                            disabled={processing}
                            className="btn w-full btn-avanzar"
                          >
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                            <span className="truncate">
                              {mesa.totalOrdenes === 1 
                                ? (esOrdenPagada(mesa.ordenes[0].nombreCliente) ? 'Entregar orden' : 'Cobrar orden')
                                : (todasLasOrdenesDeMesaPagadas(mesa) ? `Entregar ${mesa.nombreMesa}` : `Cobrar ${mesa.nombreMesa}`)
                              }
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cobrar;