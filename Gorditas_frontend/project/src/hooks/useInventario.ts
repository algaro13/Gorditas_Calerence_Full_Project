import { useState, useCallback, useEffect } from 'react';
import { inventarioService } from '../services/inventario.service';
import { RecibirProductoItem, AjustarInventarioDTO } from '../types/inventario.types';

interface UseInventarioReturn {
  productos: any[];
  loading: boolean;
  error: string | null;
  resumen: { total: number; stockBajo: number; stockAgotado: number } | null;
  refresh: () => Promise<void>;
  recibirProductos: (items: RecibirProductoItem[]) => Promise<boolean>;
  ajustarInventario: (productoId: string, data: AjustarInventarioDTO) => Promise<boolean>;
}

export function useInventario(): UseInventarioReturn {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<{ total: number; stockBajo: number; stockAgotado: number } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventarioService.getInventario();
      if (response.success && response.data) {
        setProductos(response.data.productos || []);
        setResumen(response.data.resumen || null);
      } else {
        setError(response.error || 'Error al cargar inventario');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recibirProductos = useCallback(async (items: RecibirProductoItem[]) => {
    const response = await inventarioService.recibirProductos(items);
    if (response.success) {
      await refresh();
      return true;
    }
    return false;
  }, [refresh]);

  const ajustarInventario = useCallback(async (productoId: string, data: AjustarInventarioDTO) => {
    const response = await inventarioService.ajustarInventario(productoId, data);
    if (response.success) {
      await refresh();
      return true;
    }
    return false;
  }, [refresh]);

  return { productos, loading, error, resumen, refresh, recibirProductos, ajustarInventario };
}
