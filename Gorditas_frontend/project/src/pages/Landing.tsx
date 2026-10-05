import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Hand,
  MonitorSmartphone,
  Package,
  Palette,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { textoDeUsuarios, usePlanes } from "../hooks/usePlanes";

/**
 * Lo que hace práctico al sistema. Cada punto es verdad hoy: botones de 44 px como mínimo (ver
 * docs/estandar-ui.md), roles que solo ven su menú, una app web sin instalar y diseñada primero
 * para el teléfono.
 */
const FACIL = [
  {
    icon: Hand,
    title: "Botones grandes, pensados para el dedo",
    desc: "Todo se toca sin atinarle a botones diminutos, aunque haya prisa en la hora pico.",
  },
  {
    icon: ShieldCheck,
    title: "Cada quien ve solo lo suyo",
    desc: "El mesero toma órdenes, la cocina prepara, el encargado cobra. Nadie se pierde en menús que no usa.",
  },
  {
    icon: Zap,
    title: "Sin instalar nada",
    desc: "Abres el navegador y listo. Sin descargas, sin servidores, sin técnicos.",
  },
  {
    icon: MonitorSmartphone,
    title: "Hecho para el teléfono",
    desc: "Funciona en el celular que ya tienes, en una tableta o en la computadora de la caja.",
  },
];

/**
 * Las funcionalidades que se resaltan. Solo las que existen: no se promete nada que el sistema no
 * haga (antes se anunciaban sucursales y un «dashboard avanzado» que no había).
 */
const FUNCIONES = [
  {
    icon: UtensilsCrossed,
    color: "bg-orange-100 text-orange-600",
    title: "Órdenes y mesas",
    desc: "Toma la orden por mesa o para llevar, agrega extras y edítala cuando el cliente cambia de opinión.",
  },
  {
    icon: ChefHat,
    color: "bg-red-100 text-red-600",
    title: "Cocina y despacho",
    desc: "La cocina ve qué preparar en su propia pantalla y el mesero sabe qué ya está listo para llevar.",
  },
  {
    icon: CreditCard,
    color: "bg-green-100 text-green-600",
    title: "Cobro y caja del día",
    desc: "Cobra por mesa, imprime el ticket con su folio y cuadra la caja al cierre.",
  },
  {
    icon: Tag,
    color: "bg-purple-100 text-purple-600",
    title: "Promociones y combos",
    desc: "2×1, combos y descuentos por horario que se aplican solos y se explican en el ticket.",
  },
  {
    icon: Package,
    color: "bg-blue-100 text-blue-600",
    title: "Inventario",
    desc: "Registra lo que entra, se descuenta solo al vender y te avisa cuando algo se está acabando.",
  },
  {
    icon: FileSpreadsheet,
    color: "bg-emerald-100 text-emerald-600",
    title: "Reportes con Excel",
    desc: "Ventas, productos más vendidos, gastos y utilidad del día o del mes, listos para descargar.",
  },
  {
    icon: Users,
    color: "bg-amber-100 text-amber-700",
    title: "Roles para tu equipo",
    desc: "Administrador, encargado, mesero, cocinero y despachador, cada uno con su acceso.",
  },
  {
    icon: Palette,
    color: "bg-pink-100 text-pink-600",
    title: "Tu logo y tus colores",
    desc: "El sistema se ve como tu negocio: sube tu logo y elige la paleta.",
  },
];

const PASOS = [
  {
    title: "Crea tu cuenta",
    desc: "Con tu correo, en un par de minutos. Sin tarjeta.",
  },
  {
    title: "Configura tu negocio",
    desc: "Agrega tus platillos, tus mesas y a tu equipo.",
  },
  {
    title: "¡A vender!",
    desc: "Tu equipo empieza a tomar órdenes desde su teléfono.",
  },
];

/** Respuestas verdaderas: cada una corresponde a cómo funciona el sistema hoy. */
const PREGUNTAS = [
  {
    q: "¿Necesito tarjeta para probarlo?",
    a: "No. Tienes 14 días gratis con todas las funciones. Solo eliges un plan si decides quedarte.",
  },
  {
    q: "¿Funciona en mi celular?",
    a: "Sí. Está hecho primero para el teléfono, y también funciona en tableta y computadora. No hay que instalar nada.",
  },
  {
    q: "¿Qué pasa cuando termina la prueba?",
    a: "Te avisamos por correo antes de que termine. Si no eliges un plan, el punto de venta se pone en pausa, pero tus datos se conservan: al contratar, todo vuelve a donde estaba.",
  },
  {
    q: "¿Puedo cambiar de plan después?",
    a: "Cuando quieras, desde la pantalla de Suscripción. El cambio es inmediato y la diferencia se ajusta en tu siguiente factura.",
  },
  {
    q: "¿Puedo cancelar?",
    a: "Sí, en cualquier momento y sin llamadas. El sistema sigue funcionando hasta el final del periodo que ya pagaste.",
  },
];

/**
 * Una orden en una mesa, dibujada con la propia interfaz. Es ilustrativa: enseña cómo se ve el
 * sistema sin depender de capturas que se quedan viejas. Son `div` y no botones para que nadie
 * intente pulsarlos.
 */
const VistaDelSistema: React.FC = () => (
  <div
    className="mx-auto w-72 max-w-full rounded-[2rem] border-8 border-gray-900 bg-gray-900 shadow-2xl shadow-orange-300/50"
    aria-hidden
  >
    <div className="overflow-hidden rounded-[1.4rem] bg-gray-50">
      <div className="flex items-center justify-between bg-orange-500 px-4 py-3 text-white">
        <span className="text-cuerpo font-semibold">Mesa 3</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-meta">
          En cocina
        </span>
      </div>
      <div className="space-y-2 p-4">
        {[
          ["2", "Gordita de chicharrón", "$50"],
          ["1", "Gordita de rajas", "$25"],
          ["2", "Refresco", "$40"],
        ].map(([n, nombre, precio]) => (
          <div
            key={nombre}
            className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-meta shadow-sm"
          >
            <span className="text-gray-800">
              <span className="font-semibold text-orange-600">{n}×</span>{" "}
              {nombre}
            </span>
            <span className="font-medium text-gray-700">{precio}</span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2 text-meta text-purple-700">
          <span>Combo comida</span>
          <span>−$15</span>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-3">
          <span className="text-cuerpo text-gray-600">Total</span>
          <span className="text-titulo font-bold text-gray-900">$100</span>
        </div>
        <div className="flex h-control items-center justify-center rounded-lg bg-orange-600 text-cuerpo font-semibold text-white">
          Cobrar
        </div>
      </div>
    </div>
  </div>
);

const Landing: React.FC = () => {
  const navigate = useNavigate();
  // Del backend, igual que la pantalla de planes: un solo catálogo.
  const { planes, error: errorPlanes, reintentar } = usePlanes();

  /** Los botones de prueba llevan al registro; solo el de «Iniciar sesión» va al acceso. */
  const empezar = () => navigate("/onboarding");
  const entrar = () => navigate("/login");

  // Los enlaces del menú con el alto mínimo táctil: eran texto suelto, de 24 px.
  const enlaceMenu =
    "inline-flex min-h-control-min items-center px-2 text-cuerpo text-gray-600 hover:text-orange-600";

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* Menú */}
      <nav className="fixed top-0 z-50 w-full border-b bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="text-titulo font-bold">
              Cuadranova
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <a
              href="#funciones"
              className={`${enlaceMenu} hidden md:inline-flex`}
            >
              Funciones
            </a>
            <a
              href="#precios"
              className={`${enlaceMenu} hidden md:inline-flex`}
            >
              Precios
            </a>
            <a
              href="#preguntas"
              className={`${enlaceMenu} hidden md:inline-flex`}
            >
              Preguntas
            </a>
            {/* También en el teléfono: antes solo aparecía desde el ancho de tableta. */}
            <button
              onClick={entrar}
              className="btn border border-gray-300 bg-white text-gray-800 hover:border-orange-300"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </nav>

      <main>
        {/* Portada */}
        <section className="relative bg-gradient-to-b from-orange-50 via-white to-white px-4 pb-16 pt-28 sm:px-6 md:pb-24 md:pt-36">
          <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
            <div className="text-center md:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-cuerpo font-medium text-orange-700">
                <Sparkles className="h-4 w-4" /> 14 días gratis, sin tarjeta
              </div>
              <h1 className="mb-6 text-4xl font-extrabold leading-tight text-gray-900 md:text-6xl">
                El punto de venta{" "}
                <span className="text-orange-600">
                  práctico y fácil de usar
                </span>{" "}
                para tu restaurante
              </h1>
              <p className="mb-8 text-titulo text-gray-600">
                Toma órdenes, manda a cocina y cobra desde el celular. Sin
                instalar nada y sin capacitaciones largas: si sabes usar tu
                teléfono, sabes usar Cuadranova.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
                <button
                  onClick={empezar}
                  className="btn btn-lg btn-primario rounded-xl px-sp-5 font-semibold shadow-lg shadow-orange-200"
                >
                  Probar gratis 14 días
                  <ArrowRight className="h-5 w-5" />
                </button>
                <a
                  href="#funciones"
                  className="btn btn-lg rounded-xl border-2 border-gray-200 bg-white px-sp-5 font-semibold text-gray-700 hover:border-orange-300"
                >
                  Ver cómo funciona
                </a>
              </div>
              <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-cuerpo text-gray-600 md:justify-start">
                {[
                  "Sin tarjeta de crédito",
                  "Listo en minutos",
                  "Cancela cuando quieras",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-green-600" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <VistaDelSistema />
          </div>
        </section>

        {/* Práctico y fácil de usar */}
        <section className="px-4 py-16 sm:px-6 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="mb-2 text-cuerpo font-semibold uppercase tracking-wide text-orange-600">
                Práctico y fácil de usar
              </p>
              <h2 className="mb-4 text-pantalla font-bold">
                Pensado para la prisa de un servicio real
              </h2>
              <p className="text-titulo text-gray-600">
                Sin manuales ni cursos: cada pantalla hace una sola cosa y la
                hace a la vista.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FACIL.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-orange-100 bg-orange-50/60 p-6"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-200">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-titulo font-semibold">{f.title}</h3>
                  <p className="text-cuerpo text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Funcionalidades */}
        <section
          id="funciones"
          className="scroll-mt-20 bg-gray-50 px-4 py-16 sm:px-6 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-pantalla font-bold">
                Todo lo que necesitas para operar
              </h2>
              <p className="text-titulo text-gray-600">
                De la toma de orden al corte de caja. Para fondas, gorditerías,
                taquerías y restaurantes.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FUNCIONES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${f.color}`}
                  >
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-titulo font-semibold">{f.title}</h3>
                  <p className="text-cuerpo text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pasos */}
        <section className="px-4 py-16 sm:px-6 md:py-20">
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="mb-12 text-pantalla font-bold">
              Empieza en 3 pasos
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {PASOS.map((p, i) => (
                <div key={p.title} className="relative">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-titulo font-bold text-white shadow-lg shadow-orange-200">
                    {i + 1}
                  </div>
                  <h3 className="mb-2 text-titulo font-semibold">{p.title}</h3>
                  <p className="text-cuerpo text-gray-600">{p.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-cuerpo text-green-800">
              <Clock className="h-4 w-4" /> Un asistente te guía paso a paso al
              registrarte.
            </div>
          </div>
        </section>

        {/* Precios */}
        <section
          id="precios"
          className="scroll-mt-20 bg-gray-50 px-4 py-16 sm:px-6 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-4 text-center text-pantalla font-bold">
              Planes simples, sin sorpresas
            </h2>
            <p className="mb-12 text-center text-titulo text-gray-600">
              Todas las funciones en todos los planes: solo cambia cuántas
              personas de tu equipo lo usan.
            </p>

            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
              {!planes && !errorPlanes && (
                <p className="text-center text-cuerpo text-gray-600 md:col-span-3">
                  Cargando planes…
                </p>
              )}
              {errorPlanes && (
                <div className="text-center md:col-span-3">
                  <p className="text-cuerpo text-gray-700">
                    No pudimos cargar los planes.
                  </p>
                  <button
                    onClick={reintentar}
                    className="btn mt-sp-2 text-orange-700 underline hover:text-orange-900"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              )}
              {(planes ?? []).map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl bg-white p-8 shadow-sm ${plan.popular ? "ring-2 ring-orange-500 md:scale-105" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-1 text-meta font-bold text-white">
                      Más popular
                    </div>
                  )}
                  <h3 className="mb-1 text-titulo font-bold">{plan.name}</h3>
                  <p className="mb-4 text-cuerpo text-gray-500">
                    {textoDeUsuarios(plan)}
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-cuerpo text-gray-500">
                      {" "}
                      {plan.currency}/mes
                    </span>
                  </div>
                  <ul className="mb-8 space-y-2">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-cuerpo text-gray-700"
                      >
                        <Check className="h-4 w-4 flex-shrink-0 text-orange-500" />{" "}
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={empezar}
                    className={`btn w-full rounded-lg font-medium ${
                      plan.popular
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    Empezar prueba gratis
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preguntas */}
        <section
          id="preguntas"
          className="scroll-mt-20 px-4 py-16 sm:px-6 md:py-20"
        >
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-10 text-center text-pantalla font-bold">
              Preguntas frecuentes
            </h2>
            <div className="space-y-3">
              {PREGUNTAS.map((p) => (
                <details
                  key={p.q}
                  className="group rounded-xl border border-gray-200 bg-white px-4"
                >
                  <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 py-2 text-titulo font-semibold text-gray-900">
                    {p.q}
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-4 text-cuerpo text-gray-600">{p.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Llamado final */}
        <section className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-16 sm:px-6 md:py-20">
          <div className="mx-auto max-w-3xl text-center text-white">
            <BarChart3 className="mx-auto mb-4 h-10 w-10 text-orange-100" />
            <h2 className="mb-4 text-pantalla font-bold">
              Tu restaurante, más ordenado desde hoy
            </h2>
            <p className="mb-8 text-titulo text-orange-50">
              Pruébalo 14 días sin costo y sin tarjeta. Si no te convence, no
              pagas nada.
            </p>
            <button
              onClick={empezar}
              className="btn btn-lg rounded-xl bg-white px-sp-5 font-semibold text-orange-600 hover:bg-orange-50"
            >
              Crear mi cuenta gratis
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>
      </main>

      {/* Pie */}
      <footer className="border-t px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-cuerpo text-gray-500 md:flex-row">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-gray-700">Cuadranova</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6" aria-label="Documentos legales">
            <Link to="/privacidad" className="inline-flex min-h-[44px] items-center hover:text-gray-800 hover:underline">
              Aviso de privacidad
            </Link>
            <Link to="/terminos" className="inline-flex min-h-[44px] items-center hover:text-gray-800 hover:underline">
              Términos del servicio
            </Link>
          </nav>
          <p>© 2026 Cuadranova. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
