import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

/**
 * El aviso de una acción, anclado abajo y flotando sobre el contenido.
 *
 * Antes cada pantalla lo dibujaba dentro de su formulario, y siempre por encima del botón que
 * lo provocaba: en Catálogos el aviso estaba en la línea 891 y el botón en la 1107. En un
 * teléfono eso significa pulsar abajo y que el motivo del fallo aparezca fuera de la pantalla,
 * así que desde donde estás la aplicación no hizo nada.
 *
 * Va abajo y no arriba porque es donde está el pulgar y adonde mira el ojo después de pulsar.
 *
 * No toca quién emite los mensajes: cada pantalla sigue con su `setError` y su `setSuccess`.
 * Cambiar dónde aparece un mensaje no debería obligar a reescribir 247 sitios.
 */

/** Los errores duran más porque son los que hay que leer; el éxito solo confirma. */
const DURACION = { error: 6000, exito: 3000 };

interface Props {
  error?: string;
  exito?: string;
}

export const Aviso: React.FC<Props> = ({ error, exito }) => {
  const mensaje = error || exito || '';
  const tipo: 'error' | 'exito' = error ? 'error' : 'exito';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mensaje) return;
    // Se reinicia con cada mensaje nuevo: si la pantalla limpia y vuelve a fijar, se ve otra vez.
    setVisible(true);
    const t = setTimeout(() => setVisible(false), DURACION[tipo]);
    return () => clearTimeout(t);
  }, [mensaje, tipo]);

  if (!mensaje || !visible) return null;

  const estilo =
    tipo === 'error'
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-green-50 border-green-200 text-green-700';
  const Icono = tipo === 'error' ? AlertCircle : CheckCircle;

  return createPortal(
    <div
      // `pointer-events-none` en el contenedor y `auto` en la tarjeta: el aviso ocupa el ancho
      // pero no intercepta toques fuera de sí mismo, para no bloquear lo que hay debajo.
      className="fixed inset-x-0 z-50 flex justify-center px-sp-3 pointer-events-none"
      // Por encima de la barra inferior del teléfono, no pegado al borde.
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
    >
      <div
        // `alert` interrumpe al lector de pantalla y `status` no: el error merece la
        // interrupción, la confirmación no.
        role={tipo === 'error' ? 'alert' : 'status'}
        onClick={() => setVisible(false)}
        className={`pointer-events-auto flex items-start gap-sp-1 w-full max-w-md
                    px-sp-3 py-sp-2 rounded-lg border shadow-lg text-cuerpo cursor-pointer ${estilo}`}
      >
        <Icono className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span className="flex-1 break-words">{mensaje}</span>
        <X className="w-5 h-5 flex-shrink-0 opacity-60" aria-hidden />
      </div>
    </div>,
    document.body,
  );
};

export default Aviso;
