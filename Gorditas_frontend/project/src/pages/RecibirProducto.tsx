import React, { useState, useEffect } from 'react';
import { Aviso } from '../components/Aviso';
import { 
  Package, 
  Search, 
  Plus, 
  Minus,
  Edit3,
  Trash2,
  Save,
  X,
  Filter,
  ShoppingCart
} from 'lucide-react';
import { apiService } from '../services/api';
import { Producto } from '../types';

interface ProductoInventario {
  _id: string;
  nombre: string;
  codigoBarras?: string;
  cantidad: number;
  costo: number;
  activo?: boolean;
  cantidadNueva?: number;
  costoNuevo?: number;
  activoNuevo?: boolean;
  editando?: boolean;
}

const RecibirProductos: React.FC = () => {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<ProductoInventario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    codigoBarras: '',
    cantidad: 0,
    costo: 0,
    idTipoProducto: ''
  });
  const [tiposProducto, setTiposProducto] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProductos();
    loadTiposProducto();
  }, []);

  useEffect(() => {
    filterProductos();
  }, [productos, searchTerm, showActiveOnly]);

  const loadProductos = async () => {
    setLoading(true);
    try {
      const response = await apiService.getCatalog<{ items: Producto[] }>('producto');
      if (response.success && response.data) {
        // El backend devuelve la estructura: { items: [...], pagination: {...} }
        const productosData = response.data.items || [];
        
        const productosInventario: ProductoInventario[] = productosData.map((p: any) => ({
          _id: p._id,
          nombre: p.nombre,
          codigoBarras: p.codigoBarras,
          cantidad: p.cantidad,
          costo: p.costo,
          activo: p.activo
        }));
        
        setProductos(productosInventario);
      } else {
        setProductos([]);
      }
    } catch (error) {
      setError('Error cargando productos');
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTiposProducto = async () => {
    try {
      const response = await apiService.getCatalog('tipoproducto');
      if (response.success && response.data) {
        // El backend devuelve la estructura: { items: [...], pagination: {...} }
        const tiposData = response.data.items || [];
        setTiposProducto(tiposData);
      }
    } catch (error) {
      console.error('Error loading tipos de producto:', error);
    }
  };

  const filterProductos = () => {
    let filtered = [...productos];
    
    if (showActiveOnly) {
      filtered = filtered.filter(producto => producto.activo !== false);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(producto =>
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (producto.codigoBarras && producto.codigoBarras.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredProductos(filtered);
  };

  const handleEdit = (producto: ProductoInventario) => {
    const updatedProductos = productos.map(p => 
      p._id === producto._id 
        ? { ...p, editando: true, cantidadNueva: p.cantidad, costoNuevo: p.costo, activoNuevo: p.activo }
        : { ...p, editando: false }
    );
    setProductos(updatedProductos);
  };

  const handleSave = async (producto: ProductoInventario) => {
    setSaving(true);
    try {
      const updatedData = {
        cantidad: producto.cantidadNueva || producto.cantidad,
        costo: producto.costoNuevo || producto.costo,
        activo: producto.activoNuevo !== undefined ? producto.activoNuevo : producto.activo
      };

      const response = await apiService.updateCatalogItem('producto', producto._id, updatedData);
      
      if (response.success) {
        setSuccess('Producto actualizado exitosamente');
        await loadProductos();
      } else {
        setError('Error actualizando el producto');
      }
    } catch (error) {
      setError('Error actualizando el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (producto: ProductoInventario) => {
    const updatedProductos = productos.map(p => 
      p._id === producto._id 
        ? { ...p, editando: false, cantidadNueva: undefined, costoNuevo: undefined, activoNuevo: undefined }
        : p
    );
    setProductos(updatedProductos);
  };

  const handleAgregarCantidad = (producto: ProductoInventario, cantidad: number) => {
    const updatedProductos = productos.map(p => 
      p._id === producto._id 
        ? { ...p, cantidadNueva: (p.cantidadNueva || p.cantidad) + cantidad }
        : p
    );
    setProductos(updatedProductos);
  };

  const handleQuitarCantidad = (producto: ProductoInventario, cantidad: number) => {
    const updatedProductos = productos.map(p => 
      p._id === producto._id 
        ? { ...p, cantidadNueva: Math.max(0, (p.cantidadNueva || p.cantidad) - cantidad) }
        : p
    );
    setProductos(updatedProductos);
  };

  const handleDelete = async (producto: ProductoInventario) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
    
    try {
      const response = await apiService.deleteCatalogItem('producto', producto._id);
      
      if (response.success) {
        setSuccess('Producto eliminado exitosamente');
        await loadProductos();
      } else {
        setError('Error eliminando el producto');
      }
    } catch (error) {
      setError('Error eliminando el producto');
    }
  };

  const handleCreateProducto = async () => {
    if (!nuevoProducto.nombre.trim() || !nuevoProducto.idTipoProducto) {
      setError('Completa todos los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const response = await apiService.createCatalogItem('producto', nuevoProducto);
      
      if (response.success) {
        setSuccess('Producto creado exitosamente');
        setShowModal(false);
        setNuevoProducto({
          nombre: '',
          codigoBarras: '',
          cantidad: 0,
          costo: 0,
          idTipoProducto: ''
        });
        await loadProductos();
      } else {
        setError('Error creando el producto');
      }
    } catch (error) {
      setError('Error creando el producto');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  /**
   * Cada campo se define UNA vez y lo usan las dos presentaciones: la tabla en pantalla ancha y
   * las tarjetas en teléfono. Duplicar el JSX de cinco campos en dos modos serían diez trozos
   * que divergen al primer cambio — alguien arregla el costo en la tabla y no en la tarjeta, y
   * el fallo solo se ve en teléfono, que es justo donde nadie mira.
   */
  const campoStock = (producto: ProductoInventario) =>
    producto.editando ? (
      <div className="flex items-center gap-sp-1">
        <button
          onClick={() => handleQuitarCantidad(producto, 1)}
          className="btn text-red-600 hover:bg-red-50 flex-shrink-0"
          disabled={saving}
          aria-label="Quitar uno"
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          value={producto.cantidadNueva || producto.cantidad}
          onChange={(e) => {
            setProductos(productos.map((p) =>
              p._id === producto._id ? { ...p, cantidadNueva: parseInt(e.target.value) || 0 } : p,
            ));
          }}
          className="campo w-20 text-center"
          min="0"
          aria-label="Cantidad"
        />
        <button
          onClick={() => handleAgregarCantidad(producto, 1)}
          className="btn text-green-600 hover:bg-green-50 flex-shrink-0"
          disabled={saving}
          aria-label="Agregar uno"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    ) : (
      <span className={`font-medium text-cuerpo ${producto.cantidad < 10 ? 'text-red-600' : 'text-gray-900'}`}>
        {producto.cantidad}
      </span>
    );

  const campoCosto = (producto: ProductoInventario) =>
    producto.editando ? (
      <input
        type="number"
        value={producto.costoNuevo || producto.costo}
        onChange={(e) => {
          setProductos(productos.map((p) =>
            p._id === producto._id ? { ...p, costoNuevo: parseFloat(e.target.value) || 0 } : p,
          ));
        }}
        className="campo w-24"
        min="0"
        step="0.01"
        aria-label="Costo"
      />
    ) : (
      <span className="font-medium text-green-600 text-cuerpo whitespace-nowrap">
        ${producto.costo.toFixed(2)}
      </span>
    );

  const campoEstado = (producto: ProductoInventario) =>
    producto.editando ? (
      <select
        value={
          producto.activoNuevo !== undefined
            ? producto.activoNuevo ? 'true' : 'false'
            : producto.activo !== false ? 'true' : 'false'
        }
        onChange={(e) => {
          setProductos(productos.map((p) =>
            p._id === producto._id ? { ...p, activoNuevo: e.target.value === 'true' } : p,
          ));
        }}
        className="campo w-28"
        aria-label="Estado"
      >
        <option value="true">Activo</option>
        <option value="false">Inactivo</option>
      </select>
    ) : (
      <span
        className={`px-sp-2 py-1 text-meta font-medium rounded-full whitespace-nowrap ${
          producto.activo !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {producto.activo !== false ? 'Activo' : 'Inactivo'}
      </span>
    );

  const acciones = (producto: ProductoInventario) =>
    producto.editando ? (
      <>
        <button onClick={() => handleSave(producto)} disabled={saving} className="btn text-green-600 hover:bg-green-50 flex-shrink-0" aria-label="Guardar">
          <Save className="w-4 h-4" />
        </button>
        <button onClick={() => handleCancel(producto)} disabled={saving} className="btn text-gray-600 hover:bg-gray-50 flex-shrink-0" aria-label="Cancelar">
          <X className="w-4 h-4" />
        </button>
      </>
    ) : (
      <>
        <button onClick={() => handleEdit(producto)} className="btn text-blue-600 hover:bg-blue-50 flex-shrink-0" aria-label="Editar">
          <Edit3 className="w-4 h-4" />
        </button>
        <button onClick={() => handleDelete(producto)} className="btn text-red-600 hover:bg-red-50 flex-shrink-0" aria-label="Eliminar">
          <Trash2 className="w-4 h-4" />
        </button>
      </>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-pantalla font-bold text-gray-900 truncate">Gestión de Inventario</h1>
          <p className="text-gray-600 mt-1 text-cuerpo">Administra el stock y precios de los productos</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn flex-shrink-0 bg-orange-600 text-white hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">Nuevo Producto</span>
        </button>
      </div>

      <Aviso error={error} exito={success} />

      

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center space-x-2 min-w-0 flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="campo min-w-0 flex-1 sm:w-64"
                placeholder="Buscar productos..."
              />
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <label className="flex items-center whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="ml-2 text-cuerpo text-gray-700">Solo activos</span>
              </label>
            </div>
          </div>
          <div className="text-cuerpo text-gray-600 whitespace-nowrap flex-shrink-0">
            Total productos: {filteredProductos.length}
          </div>
        </div>
      </div>

      {/* Lista de Productos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Package className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <h2 className="text-titulo font-semibold text-gray-900 truncate">Inventario de Productos</h2>
        </div>

        {/* Tarjetas en teléfono. De las cinco columnas de la tabla solo se veían dos a 375px:
            «Costo», «Estado» y —lo peor— «Acciones» caían fuera del borde derecho, sin ninguna
            señal de que hubiera más a la derecha. Aquí cada producto se lee solo y sus acciones
            están dentro de su propia tarjeta. */}
        <div className="sm:hidden space-y-sp-2">
          {filteredProductos.map((producto) => (
            <div key={producto._id} className="border border-gray-200 rounded-lg p-sp-3 space-y-sp-2">
              <div className="flex items-start justify-between gap-sp-2">
                <h3 className="font-medium text-gray-900 text-cuerpo break-words flex-1">{producto.nombre}</h3>
                {!producto.editando && campoEstado(producto)}
              </div>

              {/* Al editar, la etiqueta va ENCIMA del control y no al lado: con ambos en la
                  misma fila el control de stock —dos botones de 44px más el campo— no cabía en
                  el ancho de la tarjeta y el «+» se salía 57px por el borde, cortado. */}
              {producto.editando ? (
                <div className="space-y-sp-2">
                  <div>
                    <span className="block text-meta text-gray-600 mb-1">Stock</span>
                    {campoStock(producto)}
                  </div>
                  <div>
                    <span className="block text-meta text-gray-600 mb-1">Costo</span>
                    {campoCosto(producto)}
                  </div>
                  <div>
                    <span className="block text-meta text-gray-600 mb-1">Estado</span>
                    {campoEstado(producto)}
                  </div>
                </div>
              ) : (
                <p className="text-meta text-gray-600">
                  {producto.cantidad} en stock · ${producto.costo.toFixed(2)}
                </p>
              )}

              <div className="flex justify-end gap-sp-1">{acciones(producto)}</div>
            </div>
          ))}
        </div>

        {/* Tabla a partir de tablet, donde comparar filas sí tiene sentido y las cinco columnas
            caben sin que ninguna se caiga. */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 text-cuerpo">Producto</th>
                <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 text-cuerpo">Stock</th>
                <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 text-cuerpo">Costo</th>
                <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 text-cuerpo">Estado</th>
                <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 text-cuerpo">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductos.map((producto) => (
                <tr key={producto._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 sm:px-4">
                    <div className="font-medium text-gray-900 text-cuerpo truncate">{producto.nombre}</div>
                  </td>
                  <td className="py-3 px-2 sm:px-4">{campoStock(producto)}</td>
                  <td className="py-3 px-2 sm:px-4">{campoCosto(producto)}</td>
                  <td className="py-3 px-2 sm:px-4">{campoEstado(producto)}</td>
                  <td className="py-3 px-2 sm:px-4">
                    <div className="flex gap-sp-1">{acciones(producto)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProductos.length === 0 && (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Modal para crear producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-titulo font-semibold text-gray-900 mb-4 truncate">
              Nuevo Producto
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-cuerpo font-medium text-gray-700 mb-2 truncate">
                  Nombre*
                </label>
                <input
                  type="text"
                  value={nuevoProducto.nombre}
                  onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                  className="campo"
                  placeholder="Nombre del producto"
                />
              </div>

              <div>
                <label className="block text-cuerpo font-medium text-gray-700 mb-2 truncate">
                  Tipo de Producto*
                </label>
                <select
                  value={nuevoProducto.idTipoProducto}
                  onChange={(e) => setNuevoProducto({...nuevoProducto, idTipoProducto: e.target.value})}
                  className="campo"
                >
                  <option value="">Selecciona tipo</option>
                  {tiposProducto.map(tipo => (
                    <option key={tipo._id} value={tipo._id}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-cuerpo font-medium text-gray-700 mb-2 truncate">
                  Código de Barras
                </label>
                <input
                  type="text"
                  value={nuevoProducto.codigoBarras}
                  onChange={(e) => setNuevoProducto({...nuevoProducto, codigoBarras: e.target.value})}
                  className="campo"
                  placeholder="Código de barras"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-cuerpo font-medium text-gray-700 mb-2 truncate">
                    Cantidad Inicial
                  </label>
                  <input
                    type="number"
                    value={nuevoProducto.cantidad}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, cantidad: parseInt(e.target.value) || 0})}
                    className="campo"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-cuerpo font-medium text-gray-700 mb-2 truncate">
                    Costo
                  </label>
                  <input
                    type="number"
                    value={nuevoProducto.costo}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, costo: parseFloat(e.target.value) || 0})}
                    className="campo"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProducto}
                disabled={saving}
                className="btn flex-1 bg-orange-600 text-white hover:bg-orange-700"
              >
                {saving ? 'Guardando...' : 'Crear Producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecibirProductos;