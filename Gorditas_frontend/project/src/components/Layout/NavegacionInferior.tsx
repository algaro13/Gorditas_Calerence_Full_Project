import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Edit3, Package, Truck, CreditCard, BarChart3, BookOpen, ChefHat, PlusCircle, Settings, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MENU, SERVICIO, type EntradaMenu } from './menu';

/**
 * La navegación, abajo, donde llega el pulgar.
 *
 * La barra lateral se comía 70 de 375 px —un 19 %— con nueve iconos sin etiqueta, y lo hacía en
 * la zona alta e izquierda, la peor para el pulgar: los objetivos de abajo se aciertan entre un
 * 30 y un 50 % más. Eran dos costes a la vez, porque ese ancho es parte de por qué las columnas
 * de las tablas no cabían.
 *
 * Los nombres van escritos. Nueve dibujos sin texto son nueve cosas que aprender, y quien entra
 * a trabajar un sábado no tiene turno de aprendizaje.
 */

const ICONOS: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Edit3, Package, Truck, CreditCard, BarChart3, BookOpen, ChefHat, PlusCircle, Settings,
};

/** Cuántos caben cómodos en 375 px con su nombre debajo. El quinto hueco es para «Más». */
const VISIBLES = 4;

interface Props {
  onAbrirMas: () => void;
}

export const NavegacionInferior: React.FC<Props> = ({ onAbrirMas }) => {
  const { hasPermission } = useAuth();
  const barra = useRef<HTMLElement>(null);

  // La barra publica su propia altura en `--hueco-nav`, y el contenido y los avisos flotantes
  // la leen. Fijarla a mano no funciono: escribi 5.5rem suponiendo una fila, y con las
  // etiquetas partidas en dos lineas la barra mide 97 px, asi que el aviso quedaba 9 px por
  // debajo de su borde. Medirla evita que el numero vuelva a desfasarse cuando cambie una
  // etiqueta, el tipo de letra o el numero de destinos.
  useEffect(() => {
    const el = barra.current;
    if (!el) return;
    const raiz = document.documentElement;
    // Con `lg:hidden` la barra no se dibuja en escritorio y mide 0, que es justo el valor
    // correcto alli: el hueco se queda en el margen normal.
    const medir = () => raiz.style.setProperty('--hueco-nav', `${el.offsetHeight + 16}px`);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => {
      ro.disconnect();
      raiz.style.removeProperty('--hueco-nav');
    };
  }, []);
  const disponibles = MENU.filter((i: EntradaMenu) => hasPermission(i.roles as any));

  // La barra lleva las tareas del servicio que tenga el rol, en el orden en que ocurren. Cada
  // rol tiene cuatro o menos, asi que nunca hay que recortar: un mesero ve las suyas cuatro y un
  // cocinero la unica que tiene.
  const enBarra = SERVICIO.map((id) => disponibles.find((i) => i.id === id))
    .filter((i): i is EntradaMenu => Boolean(i))
    .slice(0, VISIBLES);

  // «Más» solo cuando el rol tiene algo fuera de la barra. Para un mesero no sobra nada, asi que
  // no se le ofrece; para el administrador estan el panel, los catalogos y los reportes.
  const hayMas = disponibles.length > enBarra.length;

  return (
    <nav
      ref={barra}
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegación principal"
    >
      <ul className="flex">
        {enBarra.map((item) => {
          const Icono = ICONOS[item.icon] ?? Home;
          return (
            <li key={item.id} className="flex-1">
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 min-h-control px-1 py-sp-1 ${
                    isActive ? 'text-orange-600' : 'text-gray-500'
                  }`
                }
              >
                <Icono className="w-6 h-6 flex-shrink-0" />
                {/* El nombre se parte en dos líneas si hace falta; abreviarlo sería volver al
                    problema que tenían «Cobr.» y «Prep.». */}
                <span className="text-[11px] leading-tight text-center">{item.label}</span>
              </NavLink>
            </li>
          );
        })}

        {hayMas && (
          <li className="flex-1">
            <button
              onClick={onAbrirMas}
              className="w-full flex flex-col items-center justify-center gap-0.5 min-h-control px-1 py-sp-1 text-gray-500"
            >
              <MoreHorizontal className="w-6 h-6 flex-shrink-0" />
              <span className="text-[11px] leading-tight">Más</span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default NavegacionInferior;
