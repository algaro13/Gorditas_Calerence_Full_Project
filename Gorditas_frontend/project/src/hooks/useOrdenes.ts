import { useState, useCallback } from 'react';
import { ordenesService } from '../services/ordenes.service';
import { usePolling } from './usePolling';
import { Orden } from '../types';
import { CreateOrdenDTO } from '../types/orden.types';

interface UseOrdenesOptions {
  polling?: boolean;
  pollingInterval?: number;
  excludeStatus?: string;
}

interface UseOrdenesReturn {
  ordenes: Orden[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createOrden: (data: CreateOrdenDTO) => Promise<any | null>;
  updateStatus: (ordenId: string, estatus: string) => Promise<boolean>;
  deleteOrden: (ordenId: string) => Promise<boolean>;
}

export function useOrdenes(options: UseOrdenesOptions = {}): UseOrdenesReturn {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = options.excludeStatus
        ? await ordenesService.list({ estatusNo: options.excludeStatus, limit: 1000 })
        : await ordenesService.list({ limit: 1000 });

      if (response.success && response.data) {
        setOrdenes(response.data.ordenes || []);
        setError(null);
      } else {
        setError(response.error || 'Error al cargar órdenes');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [options.excludeStatus]);

  usePolling(refresh, options.pollingInterval, options.polling);

  const createOrden = useCallback(async (data: CreateOrdenDTO) => {
    const response = await ordenesService.create(data);
    if (response.success) {
      await refresh();
      return response.data;
    }
    return null;
  }, [refresh]);

  const updateStatus = useCallback(async (ordenId: string, estatus: string) => {
    const response = await ordenesService.updateStatus(ordenId, estatus);
    if (response.success) {
      await refresh();
      return true;
    }
    return false;
  }, [refresh]);

  const deleteOrden = useCallback(async (ordenId: string) => {
    const response = await ordenesService.deleteOrden(ordenId);
    if (response.success) {
      await refresh();
      return true;
    }
    return false;
  }, [refresh]);

  return { ordenes, loading, error, refresh, createOrden, updateStatus, deleteOrden };
}
