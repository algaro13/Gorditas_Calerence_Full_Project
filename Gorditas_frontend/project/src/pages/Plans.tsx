import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import type { PlanId } from '../types';

const plans: { id: PlanId; name: string; price: number; period: string; maxUsers: string; features: string[]; popular: boolean }[] = [
  {
    id: 'basico',
    name: 'Básico',
    price: 299,
    period: '/mes',
    maxUsers: '3 usuarios',
    features: ['Gestión de órdenes', 'Cobro y pagos', 'Inventario básico', 'Soporte por email'],
    popular: false,
  },
  {
    id: 'profesional',
    name: 'Profesional',
    price: 599,
    period: '/mes',
    maxUsers: '10 usuarios',
    features: ['Todo en Básico', 'Reportes completos', 'Múltiples mesas', 'Extras y guisos', 'Despacho de órdenes', 'Soporte prioritario'],
    popular: true,
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    price: 999,
    period: '/mes',
    maxUsers: 'Usuarios ilimitados',
    features: ['Todo en Profesional', 'Múltiples sucursales', 'Exportación Excel', 'Dashboard avanzado', 'Soporte dedicado', 'Personalización de marca'],
    popular: false,
  },
];

const Plans: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { tenant, hasPermission } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasPermission(['Admin']);

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
          <h1 className="text-pantalla font-bold text-gray-900 mb-3">Elige tu plan</h1>
          <p className="text-gray-600 text-titulo">14 días de prueba gratis. Cancela cuando quieras.</p>
          {tenant && (
            <p className="text-cuerpo text-gray-500 mt-2">
              Plan actual: <span className="font-medium">{tenant.plan}</span> ({tenant.planStatus})
            </p>
          )}
          <div className="mt-4 flex justify-center gap-4 text-cuerpo">
            <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-900 underline">
              Volver al panel
            </button>
            {tenant?.planStatus !== 'trial' && isAdmin && (
              <button onClick={handlePortal} disabled={loading !== null} className="text-orange-700 hover:text-orange-900 underline disabled:opacity-50">
                Gestionar suscripción
              </button>
            )}
          </div>
          {!isAdmin && <p className="text-cuerpo text-yellow-700 mt-3">Solo un administrador puede contratar un plan.</p>}
          {error && <p className="text-cuerpo text-red-600 mt-3">{error}</p>}
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

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading !== null || !isAdmin}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  plan.popular
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {loading === plan.id ? 'Redirigiendo...' : 'Seleccionar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Plans;
