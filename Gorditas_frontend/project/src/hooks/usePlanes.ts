import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../services/api';
import type { PlanCatalogo } from '../types';

/**
 * El catálogo de planes, leído del backend (`GET /api/billing/plans`, público).
 *
 * Es la única fuente de precios, cupos y características. La pantalla de planes y la landing
 * tenían cada una su copia —con tres listas distintas por plan—, y un cambio de precio dejaba
 * alguna vieja.
 */
export function usePlanes(): { planes: PlanCatalogo[] | null; error: boolean; reintentar: () => void } {
  const [planes, setPlanes] = useState<PlanCatalogo[] | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(() => {
    setError(false);
    apiService.getPlans().then((res) => {
      if (res.success && Array.isArray(res.data)) setPlanes(res.data);
      else setError(true);
    });
  }, []);

  useEffect(cargar, [cargar]);
  return { planes, error, reintentar: cargar };
}

/** «3 usuarios», «Usuarios ilimitados». */
export const textoDeUsuarios = (p: PlanCatalogo): string =>
  p.usuariosIlimitados ? 'Usuarios ilimitados' : `${p.maxUsuarios} usuario${p.maxUsuarios === 1 ? '' : 's'}`;
