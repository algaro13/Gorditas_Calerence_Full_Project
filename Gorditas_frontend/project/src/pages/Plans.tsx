import React, { useEffect, useState } from 'react';
import { Aviso } from '../components/Aviso';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import type { PlanId } from '../types';
import { etiquetaDeEstadoDePlan, nombreDePlan } from '../utils/plan';

const plans: { id: PlanId; name: string; price: number; period: string; maxUsers: string; limite: number; features: string[]; popular: boolean }[] = [
  {
    id: 'basico',
    name: 'Básico',
    price: 299,
    period: '/mes',
    maxUsers: '3 usuarios',
    limite: 3,
    features: ['Gestión de órdenes', 'Cobro y pagos', 'Inventario básico', 'Soporte por email'],
    popular: false,
  },
  {
    id: 'profesional',
    name: 'Profesional',
    price: 599,
    period: '/mes',
    maxUsers: '10 usuarios',
    limite: 10,
    features: ['Todo en Básico', 'Reportes completos', 'Múltiples mesas', 'Extras y guisos', 'Despacho de órdenes', 'Soporte prioritario'],
    popular: true,
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    price: 999,
    period: '/mes',
    maxUsers: 'Usuarios ilimitados',
    limite: 999,
    features: ['Todo en Profesional', 'Múltiples sucursales', 'Exportación Excel', 'Dashboard avanzado', 'Soporte dedicado', 'Personalización de marca'],
    popular: false,
  },
];

const Plans: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { tenant, hasPermission, accesoBloqueado, logout, refreshTenant } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasPermission(['Admin']);
  // Con una suscripción que sigue cobrando, elegir otro plan cambia esa misma suscripción. Antes
  // abría un Checkout nuevo: una segunda suscripción que cobraba junto a la primera.
  const suscripcionViva = tenant?.plan !== 'trial' && (tenant?.planStatus === 'active' || tenant?.planStatus === 'past_due');
  const [confirmando, setConfirmando] = useState<PlanId | null>(null);
  // Para advertir al bajar de plan: cuántos usuarios hay activos y cuántos días de plazo da el
  // sistema si quedan de más. Los dos salen del backend.
  const [uso, setUso] = useState<{ activos: number; dias: number } | null>(null);
  useEffect(() => {
    if (!suscripcionViva || !isAdmin) return;
    apiService.getBillingStatus().then((res) => {
      if (res.success && res.data) setUso({ activos: res.data.usuariosActivos, dias: res.data.diasSobreCupo });
    });
  }, [suscripcionViva, isAdmin]);

  const handleChangePlan = async (planId: PlanId) => {
    setLoading(planId);
    setError('');
    const res = await apiService.changePlan(planId);
    if (res.success) {
      await refreshTenant();
      navigate('/suscripcion');
      return;
    }
    setError(res.error || 'No se pudo cambiar de plan');
    setLoading(null);
    setConfirmando(null);
  };

  const handleSelectPlan = async (planId: PlanId) => {
    setLoading(planId);
    setError('');
    const res = await apiService.createCheckout(planId);
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
      return;
    }
    setError(res.error || 'Error al crear sesión de pago');
    setLoading(null);
  };

  const handlePortal = async () => {
    setLoading('portal');
    setError('');
    const res = await apiService.createPortal();
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
      return;
    }
    setError(res.error || 'No se pudo abrir el portal de facturación');
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-pantalla font-bold text-gray-900 mb-3">
            {accesoBloqueado ? 'Tu acceso está en pausa' : 'Elige tu plan'}
          </h1>
          {/* Quien llega aqui porque su plan vencio necesita saberlo. Antes no habia aviso: el
              POS devolvia listas vacias y parecia que los datos se habian borrado. */}
          {accesoBloqueado ? (
            <div className="mx-auto max-w-2xl rounded-lg border border-orange-200 bg-orange-50 p-sp-3 text-left">
              <p className="text-cuerpo text-orange-900">
                {accesoBloqueado === 'TRIAL_EXPIRED'
                  ? 'Tu periodo de prueba terminó, así que el punto de venta está en pausa.'
                  : 'Tu suscripción no está activa, así que el punto de venta está en pausa.'}
              </p>
              <p className="text-cuerpo text-orange-900 mt-2">
                <strong>Tus datos están intactos.</strong>{' '}
                {/* Quien no es Admin no puede contratar: pedirle que elija un plan lo dejaba
                    frente a tres botones apagados sin saber qué hacer. */}
                {isAdmin
                  ? 'Elige un plan abajo y todo vuelve a donde estaba: tus mesas, tus platillos, tus órdenes y tus reportes.'
                  : 'Avisa al administrador del restaurante para que elija un plan; en cuanto lo haga, todo vuelve a donde estaba.'}
              </p>
            </div>
          ) : (
            <p className="text-gray-600 text-titulo">14 días de prueba gratis. Cancela cuando quieras.</p>
          )}
          {tenant && (
            <p className="text-cuerpo text-gray-500 mt-2">
              Plan actual: <span className="font-medium">{nombreDePlan(tenant.plan)}</span> · {etiquetaDeEstadoDePlan(tenant.planStatus, tenant.trialEndsAt)}
            </p>
          )}
          <div className="mt-4 flex justify-center gap-4 text-cuerpo">
            {/* Con el acceso en pausa, «volver al panel» solo rebota aqui: no se ofrece. */}
            {!accesoBloqueado && (
              <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-900 underline">
                Volver al panel
              </button>
            )}
            {tenant?.planStatus !== 'trial' && isAdmin && (
              <button onClick={handlePortal} disabled={loading !== null} className="text-orange-700 hover:text-orange-900 underline disabled:opacity-50">
                Gestionar suscripción
              </button>
            )}
            {/* Esta pantalla no tiene menú: con el acceso en pausa, este botón es la única salida.
                Sin él, un mesero quedaba atrapado aquí. */}
            {accesoBloqueado && (
              <button onClick={() => logout()} className="text-gray-600 hover:text-gray-900 underline">
                Cerrar sesión
              </button>
            )}
          </div>
          {!isAdmin && !accesoBloqueado && <p className="text-cuerpo text-yellow-700 mt-3">Solo un administrador puede contratar un plan.</p>}
          <Aviso error={error} />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-lg p-8 relative ${
                plan.popular ? 'ring-2 ring-orange-500 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-cuerpo font-medium">
                  Más popular
                </div>
              )}

              <h3 className="text-titulo font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-cuerpo text-gray-500 mb-4">{plan.maxUsers}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-500 text-cuerpo"> MXN{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-cuerpo text-gray-700">
                    <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {suscripcionViva && plan.id === tenant?.plan ? (
                <button disabled className="w-full py-3 rounded-lg font-medium bg-green-50 text-green-800 border border-green-200">
                  Tu plan actual
                </button>
              ) : suscripcionViva && confirmando === plan.id ? (
                <div className="space-y-sp-2" role="group" aria-label={`Confirmar cambio a ${plan.name}`}>
                  <p className="text-cuerpo text-gray-700">
                    Cambias a {plan.name} en este momento. Stripe calcula la diferencia por los días
                    que faltan y la suma (o la descuenta) en tu próxima factura.
                  </p>
                  {/* Bajar por debajo de los usuarios activos no expulsa a nadie al momento: abre
                      un plazo. Quien confirma tiene que saberlo antes, no descubrirlo después. */}
                  {uso && uso.activos > plan.limite && (
                    <p className="rounded-lg border border-amber-300 bg-amber-50 p-sp-2 text-cuerpo text-amber-900">
                      Tienes {uso.activos} usuarios activos y {plan.name} permite {plan.limite}:{' '}
                      {uso.activos - plan.limite === 1 ? 'te sobraría 1' : `te sobrarían ${uso.activos - plan.limite}`}. Nadie
                      pierde el acceso al cambiar, pero tendrás {uso.dias} días para desactivar
                      {uso.activos - plan.limite === 1 ? ' a uno' : ' a los que sobren'}. Si no, el sistema desactivará
                      primero a quienes llevan más tiempo sin entrar.
                    </p>
                  )}
                  <button
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={loading !== null}
                    className="w-full py-3 rounded-lg font-medium bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    {loading === plan.id ? 'Cambiando…' : 'Confirmar cambio'}
                  </button>
                  <button
                    onClick={() => setConfirmando(null)}
                    disabled={loading !== null}
                    className="w-full py-3 rounded-lg font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => (suscripcionViva ? setConfirmando(plan.id) : handleSelectPlan(plan.id))}
                  disabled={loading !== null || !isAdmin}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    plan.popular
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {loading === plan.id ? 'Redirigiendo...' : suscripcionViva ? 'Cambiar a este plan' : 'Seleccionar'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Plans;
