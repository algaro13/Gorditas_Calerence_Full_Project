import { useState, useEffect, useCallback } from 'react';
import { ApiResponse } from '../services/api-client';

interface UseApiOptions {
  immediate?: boolean;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useApi<T>(
  fetchFn: () => Promise<ApiResponse<T>>,
  options: UseApiOptions = { immediate: true }
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options.immediate !== false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchFn();
      if (response.success && response.data !== undefined) {
        setData(response.data);
      } else {
        setError(response.error || 'Error desconocido');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (options.immediate !== false) {
      refresh();
    }
  }, []);

  return { data, loading, error, refresh };
}
