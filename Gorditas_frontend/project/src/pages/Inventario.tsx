import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';

const Inventario: React.FC = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

useEffect(() => {
  const fetchInventario = async () => {
    try {
      const response = await apiService.getInventario();
      if (response.success && response.data && Array.isArray(response.data.productos)) {
        setProductos(response.data.productos);
      } else {
        setError('No se pudieron cargar los datos del inventario.');
      }
    } catch (err) {
      setError('Error al cargar el inventario.');
    } finally {
      setLoading(false);
    }
  };

  fetchInventario();
}, []);

  if (loading) {
    return <div>Cargando inventario...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
  <div className="p-6 max-w-4xl mx-auto">
    <h1 className="text-pantalla font-bold text-gray-900 mb-6">Inventario</h1>
    {productos.length === 0 ? (
      <p className="text-gray-500">No hay productos en el inventario.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl shadow-sm border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-cuerpo font-semibold text-gray-700">Producto</th>
              <th className="px-4 py-3 text-left text-cuerpo font-semibold text-gray-700">Cantidad</th>
              <th className="px-4 py-3 text-left text-cuerpo font-semibold text-gray-700">Costo</th>
              <th className="px-4 py-3 text-left text-cuerpo font-semibold text-gray-700">Stock</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto, index) => (
              <tr key={index} className="border-b last:border-b-0 hover:bg-orange-50 transition-colors">
                <td className="px-4 py-2 text-gray-900 font-medium">{producto.nombre}</td>
                <td className="px-4 py-2 text-gray-700">{producto.cantidad}</td>
                <td className="px-4 py-2 text-gray-700">${Number(producto.costo).toFixed(2)}</td>
                <td className="px-4 py-2">
                  {producto.stockAgotado ? (
                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-meta font-semibold">Agotado</span>
                  ) : producto.stockBajo ? (
                    <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-meta font-semibold">Bajo</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-meta font-semibold">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
};

export default Inventario;