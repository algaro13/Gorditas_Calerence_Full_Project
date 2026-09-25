import React, { useEffect, useState } from 'react';
import { Aviso } from '../components/Aviso';
import { 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Clock,
  Package,
  ChefHat,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Eye,
  Edit,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Orden } from '../types';

// Subscription status banner
const SubscriptionBanner: React.FC = () => {
  const { tenant } = useAuth();
  const plan = tenant?.plan || 'trial';
  const planStatus = tenant?.planStatus || 'trial';
  const trialEndsAt = tenant?.trialEndsAt || null;

  if (planStatus === 'active') {
    const planName = plan === 'basico' ? 'Básico' : plan === 'profesional' ? 'Profesional' : plan === 'empresarial' ? 'Empresarial' : plan;
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-cuerpo text-green-800 font-medium">Plan {planName} activo</span>
        </div>
        <Link to="/planes" className="text-cuerpo text-green-700 hover:text-green-900 font-medium">Gestionar →</Link>
      </div>
    );
  }

  if (planStatus === 'trial' && trialEndsAt) {
    const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const urgent = daysLeft <= 3;
    return (
      <div className={`${urgent ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border rounded-lg px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${urgent ? 'text-red-600' : 'text-blue-600'}`} />
          <span className={`text-cuerpo font-medium ${urgent ? 'text-red-800' : 'text-blue-800'}`}>
            Prueba gratuita — {daysLeft} {daysLeft === 1 ? 'día' : 'días'} restantes
          </span>
        </div>
        <Link to="/planes" className={`text-cuerpo font-medium ${urgent ? 'text-red-700 hover:text-red-900' : 'text-blue-700 hover:text-blue-900'}`}>
          Elegir plan →
        </Link>
      </div>
    );
  }

  if (planStatus === 'trial') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span className="text-cuerpo text-blue-800 font-medium">Prueba gratuita activa — 14 días</span>
        </div>
        <Link to="/planes" className="text-cuerpo text-blue-700 hover:text-blue-900 font-medium">Ver planes →</Link>
      </div>
    );
  }

  return null;
};

interface DashboardStats {
  ordenesHoy: number;
  ventasHoy: number;
  ordenesPendientes: number;
  productosLowStock: number;
  ordenesPorEstatus: {
    [key: string]: number;
  };
}

interface OrdenWorkflow {
  _id: string;
  folio: string;
  mesa: string;
  cliente: string;
  estatus: string;
  total: number;
  fechaHora: Date;
  tiempoTranscurrido?: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    ordenesHoy: 0,
    ventasHoy: 0,
    ordenesPendientes: 0,
    productosLowStock: 0,
    ordenesPorEstatus: {},
  });
  const [ordenesPendientes, setOrdenesPendientes] = useState<Orden[]>([]);
  const [ordenesWorkflow, setOrdenesWorkflow] = useState<OrdenWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasNewData, setHasNewData] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  // Estado para la orden seleccionada (detalle)
  const [selectedOrden, setSelectedOrden] = useState<OrdenWorkflow | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Set up polling for real-time updates - more frequent for better responsiveness
    const interval = setInterval(loadDashboardData, 8000); // Refresh every 8 seconds
    return () => clearInterval(interval);
  }, []);


  const loadDashboardData = async () => {
    try {
      // Load orders
      const ordenesResponse = await apiService.getOrdenes();
      if (ordenesResponse?.data?.ordenes) {
        if (ordenesResponse.data.ordenes.length > 0) {
        }
      }
      if (ordenesResponse.success && ordenesResponse.data) {
        const ordenes: Orden[] = Array.isArray(ordenesResponse.data.ordenes) ? ordenesResponse.data.ordenes : [];

        // Definir función para saber si una orden es de hoy
        const hoy = new Date();
        const esHoy = (d?: Date | string) => {
          if (!d) return false;
          const fecha = new Date(d);
          return fecha.getFullYear() === hoy.getFullYear() &&
                 fecha.getMonth() === hoy.getMonth() &&
                 fecha.getDate() === hoy.getDate();
        };

        // Filtrar solo órdenes del día
        const ordenesHoyArr = ordenes.filter((orden: Orden) => esHoy(orden.fechaHora ?? orden.fecha));

        // Ventas de hoy: solo órdenes pagadas hoy (por fechaPago)
        const ventasHoy = ordenesHoyArr
          .filter((orden: Orden) => 
            orden.estatus === 'Pagada' && esHoy((orden as any).fechaPago)
          )
          .reduce((sum, orden) => sum + orden.total, 0);

        // Órdenes pendientes del día
        const pendientes = ordenesHoyArr.filter((orden: Orden) => 
          orden.estatus !== 'Pagada' && orden.estatus !== 'Cancelado'
        );

        // Count orders by status SOLO del día
        const ordenesPorEstatus = ordenesHoyArr.reduce((acc: any, orden: Orden) => {
          acc[orden.estatus] = (acc[orden.estatus] || 0) + 1;
          return acc;
        }, {});

        // Create workflow data SOLO del día
        const workflow = ordenesHoyArr
          .filter((orden: Orden) => 
            orden.estatus !== 'Pagada' && orden.estatus !== 'Cancelado'
          )
          .map((orden: Orden) => {
            const fechaHoraRaw = orden.fechaHora ?? orden.fecha;
            const fechaHora: Date = fechaHoraRaw ? new Date(fechaHoraRaw) : new Date();
            return {
              _id: orden._id || '',
              folio: `#${(orden as any).folio || 'N/A'}`,
              mesa: (orden as any).nombreMesa || orden.mesa || 'N/A',
              cliente: orden.nombreCliente || 'Sin nombre',
              estatus: orden.estatus,
              total: orden.total,
              fechaHora,
              tiempoTranscurrido: calculateTimeElapsed(fechaHora)
            };
          })
          .sort((a, b) => 
            a.fechaHora.getTime() - b.fechaHora.getTime()
          );

        setStats(prev => ({
          ...prev,
          ordenesHoy: ordenesHoyArr.length,
          ventasHoy,
          ordenesPendientes: pendientes.length,
          ordenesPorEstatus
        }));

        setOrdenesPendientes(pendientes);
        setOrdenesWorkflow(workflow);

        // Detectar nuevos datos
        const currentWorkflowIds = ordenesWorkflow.map(o => o._id);
        const newWorkflowIds = workflow.map(o => o._id);
        const hasChanges = newWorkflowIds.some(id => !currentWorkflowIds.includes(id)) || 
                          newWorkflowIds.length !== currentWorkflowIds.length;

        if (hasChanges && ordenesWorkflow.length > 0) {
          setHasNewData(true);
          setTimeout(() => setHasNewData(false), 3000);
        }

        setLastUpdateTime(new Date());

        // Si hay una orden seleccionada, actualizar su información si cambia en el workflow
        if (selectedOrden) {
          const actualizada = workflow.find(o => o._id === selectedOrden._id);
          if (actualizada) {
            setSelectedOrden(actualizada);
          } else {
            // Si la orden ya no existe, cerrar el detalle
            setSelectedOrden(null);
          }
        }
      }

      // Load inventory
      const inventarioResponse = await apiService.getInventario();
      
      if (inventarioResponse.success && inventarioResponse.data) {
        // Los productos están en inventarioResponse.data.productos
        const productos = Array.isArray(inventarioResponse.data.productos) 
          ? inventarioResponse.data.productos 
          : [];

        
        // Filtrar productos con stock bajo (menos de 10 items)
        const lowStock = productos.filter((producto: any) => {
          const cantidad = Number(producto.cantidad) || 0;
          return cantidad < 10;
        }).length;

        setStats(prev => ({
          ...prev,
          productosLowStock: lowStock,
        }));
      } else {
        console.error('Error cargando inventario:', inventarioResponse);
        setStats(prev => ({
          ...prev,
          productosLowStock: 0,
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeElapsed = (fecha: Date) => {
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

  const updateOrderStatus = async (ordenId: string, newStatus: string) => {
    setUpdating(ordenId);
    try {
      const response = await apiService.updateOrdenStatus(ordenId, newStatus);
      if (response.success) {
        setSuccess(`Orden actualizada a ${newStatus}`);
        setTimeout(() => setSuccess(''), 3000);
        await loadDashboardData(); // Reload data
      } else {
        setError('Error actualizando orden');
      }
    } catch (error) {
      setError('Error actualizando orden');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (estatus: string) => {
    switch (estatus) {
      case 'Pendiente':
        return 'bg-orange-100 text-orange-800';
      case 'Recepcion':
        return 'bg-blue-100 text-blue-800';
      case 'Preparacion':
        return 'bg-yellow-100 text-yellow-800';
      case 'Surtida':
        return 'bg-purple-100 text-purple-800';
      case 'Entregada':
        return 'bg-green-100 text-green-800';
      case 'Pagada':
        return 'bg-gray-100 text-gray-800';
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (estatus: string) => {
    switch (estatus) {
      case 'Pendiente':
        return <Clock className="w-4 h-4" />;
      case 'Recepcion':
        return <Eye className="w-4 h-4" />;
      case 'Preparacion':
        return <ChefHat className="w-4 h-4" />;
      case 'Surtida':
        return <Package className="w-4 h-4" />;
      case 'Entregada':
        return <CheckCircle className="w-4 h-4" />;
      case 'Pagada':
        return <DollarSign className="w-4 h-4" />;
      case 'Cancelado':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      'Pendiente': 'Recepcion',
      'Recepcion': 'Preparacion',
      'Preparacion': 'Surtida',
      'Surtida': 'Entregada',
      'Entregada': 'Pagada'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const renderWorkflowActions = (orden: OrdenWorkflow) => {
    const userRole = user?.nombreTipoUsuario;
    const currentStatus = orden.estatus;
    const isUpdating = updating === orden._id;

    // Admin can see all actions
    if (userRole === 'Admin') {
      return renderAdminActions(orden);
    }

    // Role-specific workflow actions
    switch (currentStatus) {
      case 'Pendiente':
        if (userRole === 'Mesero') {
          return (
            <div className="flex space-x-1">
              <button
                onClick={() => updateOrderStatus(orden._id, 'Recepcion')}
                disabled={isUpdating}
                className="btn space-x-1 bg-green-100 text-green-600 sm:text-meta hover:bg-green-200 whitespace-nowrap"
                title="Marcar como verificada y completa"
              >
                {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                <span className="hidden sm:inline">Verificar</span>
                <span className="sm:hidden">Ver.</span>
              </button>
            </div>
          );
        }
        break;

      case 'Recepcion':
        if (userRole === 'Despachador') {
          return (
            <button
              onClick={() => updateOrderStatus(orden._id, 'Preparacion')}
              disabled={isUpdating}
              className="btn space-x-1 bg-yellow-100 text-yellow-600 sm:text-meta hover:bg-yellow-200 whitespace-nowrap"
              title="Iniciar preparación"
            >
              {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ChefHat className="w-3 h-3" />}
              <span className="hidden sm:inline">Preparar</span>
              <span className="sm:hidden">Prep.</span>
            </button>
          );
        }
        break;

      case 'Preparacion':
        if (userRole === 'Despachador') {
          return (
            <button
              onClick={() => updateOrderStatus(orden._id, 'Surtida')}
              disabled={isUpdating}
              className="btn space-x-1 bg-purple-100 text-purple-600 sm:text-meta hover:bg-purple-200 whitespace-nowrap"
              title="Marcar como surtida"
            >
              {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
              <span className="hidden sm:inline">Surtir</span>
              <span className="sm:hidden">Surt.</span>
            </button>
          );
        }
        break;

      case 'Surtida':
        if (userRole === 'Mesero' || userRole === 'Encargado') {
          return (
            <button
              onClick={async () => {
                if (window.confirm('¿Confirmar cobro de la orden?')) {
                  if (window.confirm('¿Estás seguro que deseas marcar la orden como pagada?')) {
                    await updateOrderStatus(orden._id, 'Pagada');
                  }
                }
              }}
              disabled={isUpdating}
              className="btn space-x-1 bg-green-100 text-green-600 sm:text-meta hover:bg-green-200 whitespace-nowrap"
              title="Cobrar orden"
            >
              {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
              <span className="hidden sm:inline">Cobrar</span>
              <span className="sm:hidden">Cobr.</span>
            </button>
          );
        }
        break;

      case 'Entregada':
        if (userRole === 'Mesero' || userRole === 'Encargado') {
          return (
            <button
              onClick={() => updateOrderStatus(orden._id, 'Pagada')}
              disabled={isUpdating}
              className="btn space-x-1 bg-green-100 text-green-600 sm:text-meta hover:bg-green-200 whitespace-nowrap"
              title="Cobrar orden"
            >
              {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
              <span className="hidden sm:inline">Cobrar</span>
              <span className="sm:hidden">Cobr.</span>
            </button>
          );
        }
        break;

      default:
        break;
    }

    return null;
  };

  const renderAdminActions = (orden: OrdenWorkflow) => {
    const isUpdating = updating === orden._id;
    const nextStatus = getNextStatus(orden.estatus);

    if (!nextStatus) return null;

    return (
      <button
        onClick={() => updateOrderStatus(orden._id, nextStatus)}
        disabled={isUpdating}
        className="btn gap-1 bg-orange-100 text-orange-600 hover:bg-orange-200 sm:text-cuerpo whitespace-nowrap"
      >
        {isUpdating ? (
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
        ) : (
          <>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden md:inline">{nextStatus}</span>
            <span className="md:hidden">{nextStatus.substring(0, 4)}.</span>
          </>
        )}
      </button>
    );
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Banner */}
      <SubscriptionBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-pantalla font-bold text-gray-900">
            Bienvenido, {user?.nombre}
          </h1>
          <p className="text-gray-600 mt-1">
            Resumen de actividad del restaurante
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-4">
            {hasNewData && (
              <div className="bg-indigo-100 rounded-lg px-3 py-2 shadow-sm border border-indigo-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                  <span className="text-meta font-medium text-indigo-700">
                    Datos actualizados
                  </span>
                </div>
              </div>
            )}
            <div className="text-meta text-gray-500">
              {lastUpdateTime.toLocaleTimeString('es-ES')}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cuerpo text-gray-600">Órdenes Hoy</p>
              <p className="text-pantalla font-bold text-gray-900">{stats.ordenesHoy}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Ventas Hoy - Solo para Admin */}
        {user?.nombreTipoUsuario === 'Admin' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cuerpo text-gray-600">Ventas Hoy</p>
                <p className="text-pantalla font-bold text-gray-900">
                  ${stats.ventasHoy.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cuerpo text-gray-600">Órdenes Pendientes</p>
              <p className="text-pantalla font-bold text-gray-900">{stats.ordenesPendientes}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Stock Bajo - Solo para Admin */}
        {user?.nombreTipoUsuario === 'Admin' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cuerpo text-gray-600">Stock Bajo</p>
                <p className={`text-pantalla font-bold ${stats.productosLowStock > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {stats.productosLowStock}
                </p>
                <p className="text-meta text-gray-500 mt-1">
                  {stats.productosLowStock === 0 ? 'Todo en orden' : `cuentas con ${stats.productosLowStock} producto(s) con${stats.productosLowStock !== 1 ? 's' : ''} menos de 10 items`}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stats.productosLowStock > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                <AlertCircle className={`w-6 h-6 ${stats.productosLowStock > 0 ? 'text-red-600' : 'text-green-600'}`} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alert Messages */}
      <Aviso error={error} exito={success} />
      

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
      {/* Modal de detalles de orden activa */}
      {selectedOrden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setSelectedOrden(null)}
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 text-pantalla"
              title="Cerrar"
            >
              ×
            </button>
            <h2 className="text-titulo font-bold text-gray-900 mb-2">Detalle de Orden</h2>
            <div className="mb-2">
              <span className="font-medium">Folio:</span> {selectedOrden.folio}<br />
              <span className="font-medium">Mesa:</span> {selectedOrden.mesa}<br />
              <span className="font-medium">Cliente:</span> {selectedOrden.cliente}<br />
              <span className="font-medium">Estatus:</span> {selectedOrden.estatus}<br />
              <span className="font-medium">Total:</span> ${selectedOrden.total.toFixed(2)}<br />
              <span className="font-medium">Tiempo:</span> {selectedOrden.tiempoTranscurrido}
            </div>
            {/* Aquí puedes agregar más detalles si lo deseas */}
          </div>
        </div>
      )}
        {/* Order Workflow Management */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-orange-600" />
              <h2 className="text-titulo font-semibold text-gray-900">Gestión de Flujo de Órdenes</h2>
            </div>
            <button
              onClick={loadDashboardData}
              className="btn bg-orange-100 text-orange-600 hover:bg-orange-200"
            >
              Actualizar
            </button>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-6">
            {Object.entries(stats.ordenesPorEstatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className={`inline-flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${getStatusColor(status)} min-w-0`}>
                  {getStatusIcon(status)}
                  <span className="text-meta font-medium">{count}</span>
                </div>
                <p className="text-meta sm:text-meta text-gray-600 mt-1 truncate px-1">{status}</p>
              </div>
            ))}
          </div>

          {/* Active Orders Workflow */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Órdenes Activas</h3>
            {ordenesWorkflow.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay órdenes activas</p>
            ) : (
              <div className="space-y-3">
                {ordenesWorkflow.map((orden) => (
                  <div
                    key={orden._id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3 sm:gap-4 cursor-pointer"
                    onClick={() => setSelectedOrden(orden)}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto min-w-0 flex-1">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {getStatusIcon(orden.estatus)}
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Nombre del cliente grande */}
                          <p className="font-bold text-titulo text-gray-900 truncate">{orden.cliente}</p>
                          <p className="text-meta text-gray-600 truncate">{orden.mesa}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 text-meta sm:text-meta font-medium rounded-full ${getStatusColor(orden.estatus)} whitespace-nowrap`}>
                          {orden.estatus}
                        </span>
                        <span className="text-meta sm:text-meta text-gray-500 whitespace-nowrap">
                          {orden.tiempoTranscurrido}
                        </span>
                        {/* Order modification indicator */}
                        {orden.estatus === 'Pendiente' && (
                          <span className="px-1.5 sm:px-2 py-0.5 text-meta sm:text-meta bg-orange-100 text-orange-600 rounded whitespace-nowrap">
                            Val.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 flex-shrink-0">
                      <span className="text-cuerpo font-medium text-gray-900 whitespace-nowrap">
                        ${orden.total.toFixed(2)}
                      </span>
                      {/* Workflow Action Buttons */}
                      <div className="flex items-center gap-1">
                        {renderWorkflowActions(orden)}
                      </div>
                      <Link
                        to="/editar-orden"
                        className="btn btn-min text-gray-400 hover:text-gray-600 flex-shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <ChefHat className="w-5 h-5 text-orange-600" />
            <h2 className="text-titulo font-semibold text-gray-900">Órdenes Pendientes</h2>
          </div>
          
          <div className="space-y-4">
            {ordenesPendientes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay órdenes pendientes</p>
            ) : (
              ordenesPendientes.slice(0, 5).map((orden) => (
                <div
                  key={orden._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    {/* Cliente primero, luego total, luego mesa */}
                    <p className="font-bold text-gray-900 text-cuerpo">{orden.nombreCliente || 'Sin nombre'}</p>
                    <p className="text-cuerpo text-gray-600">Total: ${orden.total.toFixed(2)}</p>
                    <p className="text-meta text-blue-600 font-medium">Tipo: {orden.nombreMesa}</p>
                  </div>
                  <span
                    className={`px-3 py-1 text-meta font-medium rounded-full ${getStatusColor(
                      orden.estatus
                    )}`}
                  >
                    {orden.estatus}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <h2 className="text-titulo font-semibold text-gray-900">Acciones Rápidas</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
              <Link to="/nueva-orden" className="flex flex-col items-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors">
              <ShoppingCart className="w-8 h-8 text-orange-600 mb-2" />
              <span className="text-cuerpo font-medium text-gray-700">Nueva Orden</span>
              </Link>
            
              <Link to="/inventario" className="flex flex-col items-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors">
              <Package className="w-8 h-8 text-orange-600 mb-2" />
              <span className="text-cuerpo font-medium text-gray-700">Inventario</span>
              </Link>
            
            {/* Catálogos - Solo para Admin, Mesero y Despachador */}
            {user?.nombreTipoUsuario !== 'Encargado' && (
              <Link to="/catalogos" className="flex flex-col items-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors">
              <Users className="w-8 h-8 text-orange-600 mb-2" />
              <span className="text-cuerpo font-medium text-gray-700">Catálogos</span>
              </Link>
            )}
            
            {/* Reportes - Solo para Admin */}
            {user?.nombreTipoUsuario === 'Admin' && (
              <Link to="/reportes" className="flex flex-col items-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors">
              <TrendingUp className="w-8 h-8 text-orange-600 mb-2" />
              <span className="text-cuerpo font-medium text-gray-700">Reportes</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;