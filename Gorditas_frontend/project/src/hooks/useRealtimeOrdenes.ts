import { useEffect, useRef } from 'react';
import { appConfig } from '../config/app-config';
import { apiService } from '../services/api';

/**
 * Tiempo real para las pantallas de órdenes, en lugar del polling de antes (una consulta cada
 * 8-15 s por pantalla).
 *
 * - Abre un canal SSE (`/api/eventos`) con `fetch` para poder mandar el token en la cabecera
 *   `Authorization` (EventSource no puede, y el token en la URL acabaría en los logs).
 * - Al recibir el aviso «cambio» vuelve a consultar, agrupando ráfagas con un pequeño retardo.
 * - Se pausa con la pantalla oculta y al volver refresca de inmediato.
 * - Red de seguridad: refetch cada 60 s por si el canal está bloqueado.
 * - No solapa consultas. Si el canal cae, reintenta con espera creciente (5 s → 60 s).
 */
export function useRealtimeOrdenes(onCambio: () => void | Promise<void>): void {
  const cbRef = useRef(onCambio);
  cbRef.current = onCambio;

  useEffect(() => {
    let cerrado = false;
    let enCurso = false;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let reintento: ReturnType<typeof setTimeout> | null = null;
    let espera = 5000;
    let control: AbortController | null = null;

    const refrescar = async () => {
      if (cerrado || enCurso || document.hidden) return;
      enCurso = true;
      try {
        await cbRef.current();
      } finally {
        enCurso = false;
      }
    };
    const refrescarAgrupado = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void refrescar(), 300);
    };

    /** Procesa los bloques «event:/data:» separados por línea en blanco. */
    const procesarBloque = (bloque: string) => {
      if (bloque.split('\n').some((l) => l.trim() === 'event: cambio')) refrescarAgrupado();
    };

    const abrir = async () => {
      if (cerrado || control || document.hidden) return;
      const token = apiService.getToken();
      if (!token) return; // sin sesión no abrimos el canal
      const ctl = new AbortController();
      control = ctl;
      try {
        const res = await fetch(`${appConfig.apiBaseUrl}/eventos`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: ctl.signal,
        });
        if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`);
        espera = 5000;
        const lector = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;
          buffer += value.replace(/\r\n/g, '\n');
          let corte: number;
          while ((corte = buffer.indexOf('\n\n')) >= 0) {
            procesarBloque(buffer.slice(0, corte));
            buffer = buffer.slice(corte + 2);
          }
        }
      } catch {
        /* se reintenta abajo, salvo que lo hayamos cerrado nosotros */
      }
      if (control === ctl) control = null;
      if (cerrado || ctl.signal.aborted) return;
      reintento = setTimeout(() => void abrir(), espera);
      espera = Math.min(espera * 2, 60000);
    };

    const cerrarCanal = () => {
      if (reintento) clearTimeout(reintento);
      reintento = null;
      control?.abort();
      control = null;
    };

    const alCambiarVisibilidad = () => {
      if (document.hidden) {
        cerrarCanal();
      } else {
        espera = 5000;
        void abrir();
        void refrescar();
      }
    };

    void refrescar();
    void abrir();
    const seguridad = setInterval(() => void refrescar(), 60000);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    return () => {
      cerrado = true;
      if (debounce) clearTimeout(debounce);
      clearInterval(seguridad);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      cerrarCanal();
    };
  }, []);
}
