import { useState, useEffect, useCallback } from 'react';
import { catalogosService } from '../services/catalogos.service';

interface UseCatalogosReturn<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (data: Partial<T>) => Promise<boolean>;
  update: (id: string | number, data: Partial<T>) => Promise<boolean>;
  remove: (id: string | number) => Promise<boolean>;
}

export function useCatalogos<T = any>(modelo: string): UseCatalogosReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await catalogosService.list<T>(modelo);
      if (response.success && response.data) {
        setItems(response.data.items || []);
      } else {
        setError(response.error || 'Error al cargar catálogo');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [modelo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (data: Partial<T>): Promise<boolean> => {
    const response = await catalogosService.create<T>(modelo, data);
    if (response.success) {
      await refresh();
      return true;
    }
    return false;
  }, [modelo, refresh]);

  const update = useCallback(async (id: string | number, data: Partial<T>): Promise<boolean> => {
    const response = await catalogosService.update<T>(modelo, id, data);
    if (response.success) {
      await refresh();
      return true;
    }
    return false;
  }, [modelo, refresh]);

  const remove = useCallback(async (id: string | number): Promise<boolean> => {
    const response = await catalogosService.delete(modelo, id);
    if (response.success) {
      await refresh();
      return true;
    }
    return false;
  }, [modelo, refresh]);

  return { items, loading, error, refresh, create, update, remove };
}
