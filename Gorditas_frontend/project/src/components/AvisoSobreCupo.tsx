import React from 'react';
import type { EstadoDeCupo } from '../types';

interface Props {
  cupo: EstadoDeCupo;
  /** Usuarios activos ahora. */
  activos: number;
  /** Cómo ajustarlo. Por omisión, la frase de la lista de personal. */
  comoAjustar?: React.ReactNode;
}

/**
 * El aviso de un restaurante con más usuarios activos de los que su plan permite.
 *
 * Bajar de plan no desactiva a nadie en el momento: se abre un plazo. Quién se irá al vencer lo
 * decide el backend (`/usuarios/cupo`), no esta pantalla, para que el nombre anunciado y el
 * desactivado sean el mismo.
 *
 * Lo usan Catálogos → Usuarios y Suscripción. Vivía dentro de la lista de personal, y Suscripción
 * solo decía «Llegaste al límite»: quien miraba su plan no se enteraba del plazo ni de los nombres.
 */
export const AvisoSobreCupo: React.FC<Props> = ({ cupo, activos, comoAjustar }) => {
  const { sobran, enRiesgo, maxUsuarios } = cupo;
  const limite = cupo.fechaLimite ? new Date(cupo.fechaLimite) : null;
  const diasRestantes = limite ? Math.max(0, Math.ceil((limite.getTime() - Date.now()) / 86_400_000)) : null;
  const fechaTexto = limite ? limite.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }) : '';

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
      <p className="text-cuerpo font-semibold text-amber-900">
        Tienes {sobran} usuario{sobran === 1 ? '' : 's'} por encima de tu plan
      </p>
      <p className="text-cuerpo text-amber-800 mt-1">
        Tu plan permite {maxUsuarios} usuario{maxUsuarios === 1 ? '' : 's'} activo
        {maxUsuarios === 1 ? '' : 's'} y tienes {activos}. Nadie pierde el acceso ahora
        {limite ? (
          <>
            , pero tienes hasta el <strong>{fechaTexto}</strong>
            {diasRestantes !== null && diasRestantes <= 30 ? ` (${diasRestantes} día${diasRestantes === 1 ? '' : 's'})` : ''} para
            ajustarlo.
          </>
        ) : (
          '.'
        )}
      </p>
      {enRiesgo.length > 0 && (
        <p className="text-cuerpo text-amber-800 mt-2">
          Si no haces nada, ese día se desactivará a{' '}
          {enRiesgo.map((u, i) => (
            <React.Fragment key={u._id}>
              {i > 0 ? (i === enRiesgo.length - 1 ? ' y ' : ', ') : ''}
              <strong>{u.nombre}</strong>
              {u.lastSeenAt ? `, que no entra desde el ${new Date(u.lastSeenAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}` : ', que nunca ha entrado'}
            </React.Fragment>
          ))}
          .
        </p>
      )}
      <p className="text-cuerpo text-amber-800 mt-2">
        {comoAjustar ?? (
          <>
            Para evitarlo: desactiva {sobran} usuario{sobran === 1 ? '' : 's'} de la lista, o cambia a un plan más grande.
          </>
        )}
      </p>
    </div>
  );
};

export default AvisoSobreCupo;
