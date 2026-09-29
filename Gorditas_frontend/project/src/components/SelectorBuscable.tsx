import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface OpcionBuscable {
  valor: string;
  etiqueta: string;
  /** Encabezado bajo el que se agrupa en la lista, p. ej. «Platillos» o «Productos». */
  grupo?: string;
}

interface Props {
  opciones: OpcionBuscable[];
  /** El valor elegido; `''` es ninguno. */
  valor: string;
  onChange: (valor: string) => void;
  /** Lo que se lee cuando no hay nada elegido. */
  placeholder?: string;
  /**
   * Una opción con valor `''` que significa algo —«Toda la orden»—, no «falta elegir». Se ofrece
   * la primera y se muestra como elegida cuando el valor es `''`.
   */
  opcionVacia?: string;
  /**
   * Para selectores que son una acción, como «Agregar artículo…»: al elegir se vacía y se queda
   * listo para el siguiente, en vez de mostrar lo elegido.
   */
  accion?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/** El alto máximo de la lista (256 px) más su separación del campo. */
const ALTO_LISTA = 264;

/** Lo mínimo que se deja ver aunque no quepa más: unas tres opciones. */
const ALTO_MINIMO = 132;

/**
 * El ancestro que recorta lo que se sale de él —la tarjeta de un modal—, o `null` si es la ventana.
 *
 * Recorta aunque no se desplace: el modal del combo tiene `overflow-y-auto` y su contenido cabe,
 * así que no hay nada que desplazar, pero una lista que se asome por encima de su borde queda
 * oculta y el toque cae en el fondo oscuro. Por eso no basta con buscar el que se desplaza.
 */
function contenedorQueRecorta(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY !== 'visible') return p;
  }
  return null;
}

/** Sin acentos ni mayúsculas: quien escribe «chicharron» busca «Chicharrón». */
const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Un `<select>` en el que se puede escribir para buscar.
 *
 * Existe porque los selects del catálogo —guisos, tipos, los artículos de un combo— crecen con el
 * restaurante, y un `<select>` nativo con cuarenta opciones obliga a desplazarse buscando con la
 * vista. Aquí se escriben tres letras y quedan las que coinciden, empezando por las que empiezan
 * así.
 *
 * Se comporta como un select: solo acepta opciones de la lista. Lo escrito sirve para buscar y se
 * descarta al salir; nunca se guarda texto libre.
 *
 * Teclado: flechas para moverse, Intro para elegir, Escape para cerrar. Sigue el patrón combobox
 * de WAI-ARIA para que un lector de pantalla anuncie la lista y la opción activa.
 */
export function SelectorBuscable({
  opciones,
  valor,
  onChange,
  placeholder = 'Selecciona…',
  opcionVacia,
  accion = false,
  id,
  'aria-label': ariaLabel,
  className = '',
}: Props) {
  const propio = useId();
  const idCampo = id ?? `selector-${propio}`;
  const idLista = `${idCampo}-lista`;

  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [activo, setActivo] = useState(0);
  const [haciaArriba, setHaciaArriba] = useState(false);
  const [altoMaximo, setAltoMaximo] = useState(ALTO_LISTA - 8);
  const lista = useRef<HTMLUListElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const todas = useMemo<OpcionBuscable[]>(
    () => (opcionVacia ? [{ valor: '', etiqueta: opcionVacia }, ...opciones] : opciones),
    [opciones, opcionVacia],
  );

  const elegida = accion ? undefined : todas.find((o) => o.valor === valor);

  // Las que empiezan por lo escrito van primero; después, las que lo contienen en cualquier parte.
  const visibles = useMemo(() => {
    const q = normalizar(texto);
    if (!q) return todas;
    const empiezan: OpcionBuscable[] = [];
    const contienen: OpcionBuscable[] = [];
    for (const o of todas) {
      const e = normalizar(o.etiqueta);
      if (e.startsWith(q) || e.split(/\s+/).some((palabra) => palabra.startsWith(q))) empiezan.push(o);
      else if (e.includes(q)) contienen.push(o);
    }
    return [...empiezan, ...contienen];
  }, [texto, todas]);

  // Al abrir, la opción activa es la elegida: así Intro sin tocar nada no cambia la elección.
  const abrir = () => {
    if (abierto) return;
    setTexto('');
    setActivo(Math.max(0, todas.findIndex((o) => o.valor === valor)));
    hacerSitio();
    setAbierto(true);
  };

  /**
   * Que la lista se vea entera.
   *
   * Casi todos viven en un modal, y el de «Agregar artículo» está al final del formulario:
   * abierta hacia abajo, el borde del modal la cortaba y en un teléfono quedaba una sola opción a
   * la vista. Primero se desplaza el contenedor para dejarle sitio; si aun así no cabe, se abre
   * hacia el lado con más espacio y se acorta a lo que haya, en vez de dejar que la corten.
   */
  const hacerSitio = () => {
    const el = campo.current;
    if (!el) return;
    const marco = contenedorQueRecorta(el);
    const limites = () => {
      const r = el.getBoundingClientRect();
      // Lo visible de verdad: en un teléfono el teclado tapa la mitad de abajo, y
      // `innerHeight` no lo descuenta (en iOS no cambia al abrirse). `visualViewport` sí.
      const vista = window.visualViewport;
      const vistaArriba = vista?.offsetTop ?? 0;
      const vistaAbajo = vista ? vista.offsetTop + vista.height : window.innerHeight;
      const m = marco ? marco.getBoundingClientRect() : { top: vistaArriba, bottom: vistaAbajo };
      const arriba = Math.max(m.top, vistaArriba);
      const abajo = Math.min(m.bottom, vistaAbajo);
      return { abajo: abajo - r.bottom, arriba: r.top - arriba };
    };
    if (limites().abajo < ALTO_LISTA) {
      el.scrollIntoView({ block: 'start' });
    }
    const { abajo, arriba } = limites();
    const subir = abajo < ALTO_LISTA && arriba > abajo;
    setHaciaArriba(subir);
    setAltoMaximo(Math.max(ALTO_MINIMO, Math.min(ALTO_LISTA, subir ? arriba : abajo) - 8));
  };

  const cerrar = () => {
    setAbierto(false);
    setTexto('');
  };

  const elegir = (o: OpcionBuscable) => {
    onChange(o.valor);
    cerrar();
  };

  // El teclado del teléfono sube después de abrir la lista, al enfocar el campo: el espacio
  // medido al abrir deja de valer. Se vuelve a medir cuando cambia la parte visible.
  useEffect(() => {
    const vista = window.visualViewport;
    if (!abierto || !vista) return;
    const medir = () => hacerSitio();
    vista.addEventListener('resize', medir);
    return () => vista.removeEventListener('resize', medir);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const el = lista.current?.querySelector<HTMLElement>(`[data-indice="${activo}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activo, abierto]);

  const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!abierto) return abrir();
        setActivo((i) => Math.min(i + 1, visibles.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!abierto) return abrir();
        setActivo((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        // Nunca envía el formulario: Intro en un selector es elegir.
        e.preventDefault();
        if (abierto && visibles[activo]) elegir(visibles[activo]);
        else abrir();
        break;
      case 'Escape':
        if (abierto) {
          e.preventDefault();
          cerrar();
        }
        break;
      case 'Tab':
        cerrar();
        break;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={idCampo}
        ref={campo}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={abierto && visibles[activo] ? `${idLista}-${activo}` : undefined}
        autoComplete="off"
        className="campo w-full pr-10"
        // Mientras se busca, lo elegido pasa a ser la pista: se ve qué había sin estorbar lo que se escribe.
        placeholder={abierto ? elegida?.etiqueta || placeholder : placeholder}
        value={abierto ? texto : elegida?.etiqueta ?? ''}
        onFocus={abrir}
        onClick={abrir}
        onChange={(e) => {
          if (!abierto) setAbierto(true);
          setTexto(e.target.value);
          setActivo(0);
        }}
        onKeyDown={alTeclear}
        onBlur={cerrar}
      />
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${abierto ? 'rotate-180' : ''}`}
      />

      {abierto && (
        <ul
          id={idLista}
          ref={lista}
          role="listbox"
          aria-label={ariaLabel}
          style={{ maxHeight: altoMaximo }}
          className={`absolute z-[70] w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${
            haciaArriba ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {visibles.length === 0 && <li className="px-sp-2 py-sp-2 text-cuerpo text-gray-500">Sin coincidencias</li>}
          {visibles.map((o, i) => {
            const nuevoGrupo = o.grupo && o.grupo !== visibles[i - 1]?.grupo;
            const esElegida = !accion && o.valor === valor;
            return (
              <React.Fragment key={`${o.grupo ?? ''}:${o.valor}`}>
                {nuevoGrupo && (
                  <li role="presentation" className="px-sp-2 pt-sp-1 text-meta font-semibold uppercase text-gray-500">
                    {o.grupo}
                  </li>
                )}
                <li
                  id={`${idLista}-${i}`}
                  data-indice={i}
                  role="option"
                  aria-selected={esElegida}
                  // mousedown y no click: el campo no pierde el foco antes de que la opción se elija.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    elegir(o);
                  }}
                  // Dentro de un <label>, el clic en la opción se reenviaba al campo, que volvía a
                  // abrir la lista recién cerrada. Así pasó con los guisos del combo.
                  onClick={(e) => e.preventDefault()}
                  onMouseMove={() => setActivo(i)}
                  className={`flex min-h-[44px] cursor-pointer items-center gap-sp-1 px-sp-2 text-cuerpo ${
                    i === activo ? 'bg-orange-50 text-orange-900' : 'text-gray-900'
                  } ${o.valor === '' ? 'italic text-gray-600' : ''}`}
                >
                  <span className="min-w-0 flex-1 break-words">{o.etiqueta}</span>
                  {esElegida && <Check aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-orange-600" />}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}
