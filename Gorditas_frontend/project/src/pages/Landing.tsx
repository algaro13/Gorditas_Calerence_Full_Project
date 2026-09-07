import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Check, ShieldCheck, Smartphone, BarChart3, Users, Clock, CreditCard, Star } from 'lucide-react';

const features = [
  { icon: ShieldCheck, title: 'Multi-usuario con roles', desc: 'Admin, Encargado, Mesero, Cocinero, Despachador — cada quien ve lo que necesita.' },
  { icon: Smartphone, title: 'Funciona en cualquier dispositivo', desc: 'Tablet, celular o computadora. Sin instalar nada.' },
  { icon: BarChart3, title: 'Reportes en tiempo real', desc: 'Ventas del día, productos más vendidos, gastos y utilidades.' },
  { icon: Users, title: 'Gestión de mesas y órdenes', desc: 'Control de mesas, subórdenes, extras y despacho.' },
  { icon: Clock, title: 'Operación en minutos', desc: 'Configura tu negocio en 5 minutos y empieza a operar.' },
  { icon: CreditCard, title: 'Cobro integrado', desc: 'Control de pagos, cuentas por mesa y resumen diario.' },
];

const plans = [
  { name: 'Básico', price: 299, users: '3 usuarios', features: ['Órdenes', 'Cobro', 'Inventario básico', 'Soporte por email'] },
  { name: 'Profesional', price: 599, users: '10 usuarios', features: ['Todo en Básico', 'Reportes', 'Múltiples mesas', 'Extras y guisos', 'Soporte prioritario'], popular: true },
  { name: 'Empresarial', price: 999, users: 'Ilimitados', features: ['Todo en Profesional', 'Múltiples sucursales', 'Dashboard avanzado', 'Soporte dedicado', 'Personalización'] },
];

const Landing: React.FC = () => {
  const navigate = useNavigate();

  /** Los botones de prueba llevan al registro; solo el del encabezado va al inicio de sesión. */
  const handleStart = () => {
    navigate('/onboarding');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm border-b z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">Kustodela <span className="text-orange-500">POS</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-orange-500">Funciones</a>
            <a href="#pricing" className="hover:text-orange-500">Precios</a>
            <button onClick={handleLogin} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium">
              Iniciar sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4" /> 14 días de prueba gratis
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            El sistema de punto de venta que tu restaurante necesita
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Gestiona órdenes, mesas, inventario y cobros desde cualquier dispositivo. 
            Sin instalaciones. Sin complicaciones. Listo en 5 minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleStart}
              className="bg-orange-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all"
            >
              Prueba gratis 14 días
            </button>
            <a
              href="#pricing"
              className="border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-orange-300 transition-all"
            >
              Ver precios
            </a>
          </div>
          <p className="text-sm text-gray-500 mt-4">Sin tarjeta de crédito • Cancela cuando quieras</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Todo lo que necesitas para operar</h2>
          <p className="text-gray-600 text-center mb-12 max-w-xl mx-auto">Desde la toma de orden hasta el cobro. Un sistema completo pensado para fondas, gorditerías, taquerías y restaurantes.</p>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Empieza en 3 pasos</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="font-semibold mb-2">Crea tu cuenta</h3>
              <p className="text-gray-600 text-sm">Regístrate con tu email en menos de 1 minuto.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="font-semibold mb-2">Configura tu negocio</h3>
              <p className="text-gray-600 text-sm">Agrega tus mesas, platillos y elige tu estilo.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="font-semibold mb-2">¡Listo para vender!</h3>
              <p className="text-gray-600 text-sm">Tu equipo puede empezar a tomar órdenes de inmediato.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Planes simples, sin sorpresas</h2>
          <p className="text-gray-600 text-center mb-12">14 días de prueba gratis en cualquier plan. Cancela cuando quieras.</p>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-8 shadow-sm relative ${plan.popular ? 'ring-2 ring-orange-500 scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    Más popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.users}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-gray-500 text-sm"> MXN/mes</span>
                </div>
                <ul className="space-y-2 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-orange-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleStart}
                  className={`w-full py-3 rounded-lg font-medium ${
                    plan.popular ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Empezar prueba gratis
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-orange-500">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">¿Listo para modernizar tu negocio?</h2>
          <p className="text-orange-100 mb-8 text-lg">Únete a los restaurantes que ya usan Kustodela POS. Sin riesgo, sin compromiso.</p>
          <button
            onClick={handleStart}
            className="bg-white text-orange-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-orange-50 transition-all"
          >
            Crear mi cuenta gratis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <ChefHat className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-gray-700">Kustodela POS</span>
          </div>
          <p>© 2026 Kustodela. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
