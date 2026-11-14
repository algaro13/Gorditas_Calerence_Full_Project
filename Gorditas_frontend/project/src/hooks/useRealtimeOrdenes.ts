import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '../services/api';

/**
 * Tiempo real para las pantallas de órdenes, en lugar del polling agresivo de antes
 * (una consulta cada 8-15 s por pantalla, que saturaba el proxy).
 *
 * - Abre un canal SSE (`/api/eventos`). Cuando el backend avisa que algo cambió,
 *   vuelve a consultar, agrupando ráfagas con un pequeño retardo.
 * - Se pausa cuando la pantalla no está visible (una caja o cocina olvidada abierta
 *   deja de consultar hasta que alguien la vuelve a mirar).
 * - Red de seguridad: un refetch lento cada 60 s por si el SSE está bloqueado.
 * - No solapa consultas.
 *
 * Reemplaza directamente al `useEffect` con `setInterval(loadX, ...)`.
 */
export function useRealtimeOrdenes(onCambio: () => void | Promise<void>): void {
  const cbRef = useRef(onCambio);
  cbRef.current = onCambio;

  useEffect(() => {
    let cerrado = false;
    let enCurso = false;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let es: EventSource | null = null;

    const refrescar = async () => {
      if (cerrado || enCurso) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      enCurso = true;
      try {
        await cbRef.current();
      } finally {
        enCurso = false;
      }
    };

    // Agrupa varios avisos seguidos en una sola consulta.
    const refrescarAgrupado = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void refrescar(), 300);
    };

    const leerToken = (): string | null => {
      try {
        return localStorage.getItem('token');
      } catch {
        return null;
      }
    };

    const abrirSSE = () => {
      if (cerrado || es) return;
      const token = leerToken();
      if (!token) return; // sin sesión no abrimos el canal
      try {
        es = new EventSource(`${API_BASE_URL}/eventos?token=${encodeURIComponent(token)}`);
        es.addEventListener('cambio', refrescarAgrupado);
        es.onerror = () => {
          // EventSource reintenta solo mientras readyState siga en CONNECTING.
          // Si el servidor cerró de verdad (p. ej. token inválido), lo soltamos.
          if (es && es.readyState === EventSource.CLOSED) es = null;
        };
      } catch {
        es = null;
      }
    };

    const cerrarSSE = () => {
      if (es) {
        es.close();
        es = null;
      }
    };

    const alCambiarVisibilidad = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        cerrarSSE();
      } else {
        abrirSSE();
        void refrescar(); // al volver a la pantalla, refresca de inmediato
      }
    };

    // Carga inicial + canal + red de seguridad.
    void refrescar();
    abrirSSE();
    const seguridad = setInterval(() => void refrescar(), 60000);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    return () => {
      cerrado = true;
      if (debounce) clearTimeout(debounce);
      clearInterval(seguridad);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      cerrarSSE();
    };
    // Se monta una sola vez; onCambio se mantiene fresco vía cbRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
