import React from 'react';
import { ArrowDown, ArrowRight, ChefHat, ChevronRight, CreditCard, Edit3, HelpCircle, Lightbulb, PlusCircle } from 'lucide-react';
import { PREGUNTAS, SECCIONES } from './contenido';

const irA = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const PASOS_FLUJO = [
  { icono: PlusCircle, titulo: 'Nueva orden', quien: 'Mesero o encargado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { icono: ChefHat, titulo: 'Surtir orden', quien: 'Cocina', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { icono: CreditCard, titulo: 'Cobrar', quien: 'Mesero, encargado o caja', color: 'bg-green-50 text-green-700 border-green-200' },
];

/** El flujo de una orden en tres cajas: de arriba abajo en el teléfono, de izquierda a derecha en la computadora. */
const DiagramaFlujo: React.FC = () => (
  <figure className="mb-5" aria-label="Flujo de una orden: Nueva orden, Surtir orden, Cobrar">
    <ol className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-center">
      {PASOS_FLUJO.map((p, i) => (
        <React.Fragment key={p.titulo}>
          <li className={`flex flex-1 items-center gap-3 rounded-xl border p-3 ${p.color}`}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-meta font-bold">{i + 1}</span>
            <p.icono className="h-6 w-6 shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block text-cuerpo font-bold">{p.titulo}</span>
              <span className="block text-meta">{p.quien}</span>
            </span>
          </li>
          {i < PASOS_FLUJO.length - 1 && (
            <li aria-hidden className="flex justify-center text-gray-400">
              <ArrowDown className="h-5 w-5 sm:hidden" />
              <ArrowRight className="hidden h-5 w-5 sm:block" />
            </li>
          )}
        </React.Fragment>
      ))}
    </ol>
    <figcaption className="mt-2 flex items-center gap-2 text-meta text-gray-600">
      <Edit3 className="h-4 w-4 shrink-0" aria-hidden /> Mientras no se cobre, la orden se puede cambiar en «Editar orden».
    </figcaption>
  </figure>
);

/**
 * Manual de uso para el administrador: índice, una sección por tarea con pasos numerados y la
 * captura que marca dónde pulsar, y preguntas frecuentes. El contenido está en `contenido.ts`.
 */
const Ayuda: React.FC = () => (
  <div className="mx-auto max-w-3xl space-y-8">
    <header id="indice" className="scroll-mt-4">
      <h1 className="flex items-center gap-2 text-pantalla font-bold text-gray-900">
        <HelpCircle className="h-7 w-7 text-orange-600" aria-hidden /> Ayuda
      </h1>
      <p className="mt-1 text-cuerpo text-gray-600">Cómo usar el sistema, paso a paso. Elige un tema.</p>
    </header>

    <nav aria-label="Índice de la ayuda" className="rounded-xl bg-white p-2 shadow-sm">
      <ol className="divide-y">
        {SECCIONES.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={irA(s.id)}
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-cuerpo text-gray-800 hover:bg-orange-50"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-meta font-bold text-orange-700">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{s.titulo}</span>
                <span className="block text-meta text-gray-500">{s.resumen}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            </a>
          </li>
        ))}
        <li>
          <a
            href="#preguntas"
            onClick={irA('preguntas')}
            className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-cuerpo text-gray-800 hover:bg-orange-50"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-meta font-bold text-orange-700">?</span>
            <span className="min-w-0 flex-1 font-semibold">Preguntas frecuentes</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          </a>
        </li>
      </ol>
    </nav>

    {SECCIONES.map((s, i) => (
      <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="scroll-mt-4 rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h2 id={`${s.id}-titulo`} className="text-titulo font-bold text-gray-900">
          {i + 1}. {s.titulo}
        </h2>
        <p className="mb-4 text-cuerpo text-gray-600">{s.resumen}</p>
        {s.diagrama && <DiagramaFlujo />}
        <ol className="space-y-5">
          {s.pasos.map((p, j) => (
            <li key={j} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-meta font-bold text-white">{j + 1}</span>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-cuerpo text-gray-800">{p.texto}</p>
                {p.imagen && (
                  <figure>
                    <img
                      src={`/ayuda/${p.imagen}`}
                      alt={p.pie ?? p.texto}
                      loading="lazy"
                      className="w-full max-w-xs rounded-xl border border-gray-200 shadow-sm"
                    />
                    {p.pie && <figcaption className="mt-1 text-meta text-gray-500">{p.pie}</figcaption>}
                  </figure>
                )}
              </div>
            </li>
          ))}
        </ol>
        {s.consejos && (
          <div className="mt-5 space-y-2 rounded-lg bg-amber-50 p-3">
            {s.consejos.map((c) => (
              <p key={c} className="flex gap-2 text-cuerpo text-amber-900">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {c}
              </p>
            ))}
          </div>
        )}
        <a href="#indice" onClick={irA('indice')} className="mt-4 inline-flex min-h-[44px] items-center text-cuerpo text-orange-700 underline">
          Volver al índice
        </a>
      </section>
    ))}

    <section id="preguntas" aria-labelledby="preguntas-titulo" className="scroll-mt-4 rounded-xl bg-white p-4 shadow-sm sm:p-6">
      <h2 id="preguntas-titulo" className="mb-3 text-titulo font-bold text-gray-900">
        Preguntas frecuentes
      </h2>
      <div className="divide-y">
        {PREGUNTAS.map((q) => (
          <details key={q.pregunta} className="group py-1">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-cuerpo font-semibold text-gray-800">
              {q.pregunta}
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <p className="pb-3 text-cuerpo text-gray-700">{q.respuesta}</p>
          </details>
        ))}
      </div>
      <a href="#indice" onClick={irA('indice')} className="mt-4 inline-flex min-h-[44px] items-center text-cuerpo text-orange-700 underline">
        Volver al índice
      </a>
    </section>
  </div>
);

export default Ayuda;
