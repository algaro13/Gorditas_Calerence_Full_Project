import React, { useState, useEffect, useRef } from 'react';
import { Aviso } from '../components/Aviso';
import { 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Save,
  X,
  Search,
  Filter
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BaseEntity } from '../types';
import UsuariosPanel from '../components/UsuariosPanel';

interface CatalogItem extends BaseEntity {
  nombre: string;
  descripcion?: string;
  [key: string]: any;
}

const catalogModels = [
  { id: 'guiso', name: 'Guisos', fields: ['nombre', 'descripcion'], hasActivo: true },
  { id: 'tipoproducto', name: 'Tipos de Producto', fields: ['nombre', 'descripcion'], hasActivo: true },
  { id: 'producto', name: 'Productos', fields: ['nombre', 'idTipoProducto', 'cantidad', 'costo', 'variantes'], hasActivo: true },
  { id: 'tipoplatillo', name: 'Tipos de Platillo', fields: ['nombre', 'descripcion'], hasActivo: true },
  { id: 'platillo', name: 'Platillos', fields: ['nombre', 'idTipoPlatillo', 'descripcion', 'precio'], hasActivo: true },
  { id: 'tipoextra', name: 'Tipos de Extra', fields: ['nombre', 'descripcion'], hasActivo: true },
  { id: 'extra', name: 'Extras', fields: ['nombre', 'idTipoExtra', 'descripcion', 'costo'], hasActivo: true },
  { id: 'tipogasto', name: 'Tipos de Gasto', fields: ['nombre'], hasActivo: true },
  { id: 'tipousuario', name: 'Tipos de Usuario', fields: ['nombre', 'descripcion'], hasActivo: false },
  { id: 'usuario', name: 'Usuarios', fields: [], hasActivo: true },
  { id: 'mesa', name: 'Mesas', fields: ['nombre'], hasActivo: false },
];

const Catalogos: React.FC = () => {
  // Contexto de usuario logueado
  const { user } = useAuth();

  // Tipos dinámicos para selects
  const [tiposPlatillo, setTiposPlatillo] = useState<any[]>([]);
  const [tiposProducto, setTiposProducto] = useState<any[]>([]);
  const [tiposExtra, setTiposExtra] = useState<any[]>([]);
  // Tipos fijos para usuarios
  const tiposUsuarioFijos = [
    {
      value: 'Despachador',
      label: 'Despachador',
      descripcion: 'Atiende y despacha órdenes. Acceso: Surtir Orden, Despachar, Catálogos.'
    },
    {
      value: 'Mesero',
      label: 'Mesero',
      descripcion: 'Toma pedidos y atiende mesas. Acceso: Nueva Orden, Editar Orden.'
    },
    {
      value: 'Encargado',
      label: 'Encargado',
      descripcion: 'Gestiona inventario y reportes. Acceso: Inventario, Recibir Producto.'
    },
    {
      value: 'Admin',
      label: 'Administrador',
      descripcion: 'Acceso total a todos los componentes y configuraciones del sistema.'
    }
  ];
  const [tiposUsuario, setTiposUsuario] = useState<any[]>(tiposUsuarioFijos);

  const [selectedModel, setSelectedModel] = useState(catalogModels[0]);
  
  // Ref for items list section
  const itemsListRef = useRef<HTMLDivElement>(null);

  // Handle model selection with scroll functionality
  const handleModelSelect = (model: any) => {
    setSelectedModel(model);
    
    // Scroll to items list in mobile view
    if (window.innerWidth < 640 && itemsListRef.current) {
      setTimeout(() => {
        itemsListRef.current!.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  };
  useEffect(() => {
    // Cargar tipos para selects dinámicos
    const fetchTipos = async () => {
      if (selectedModel.id === 'platillo') {
        const res = await apiService.getCatalog('tipoplatillo');
        if (res.success && res.data) {
          if (Array.isArray(res.data.items)) {
            setTiposPlatillo(res.data.items);
          } else if (Array.isArray(res.data)) {
            setTiposPlatillo(res.data);
          } else {
            setTiposPlatillo([]);
          }
        } else {
          setTiposPlatillo([]);
        }
      }
      if (selectedModel.id === 'producto') {
        const res = await apiService.getCatalog('tipoproducto');
        if (res.success && res.data) {
          if (Array.isArray(res.data.items)) {
            setTiposProducto(res.data.items);
          } else if (Array.isArray(res.data)) {
            setTiposProducto(res.data);
          } else {
            setTiposProducto([]);
          }
        } else {
          setTiposProducto([]);
        }
      }
      if (selectedModel.id === 'extra') {
        const res = await apiService.getCatalog('tipoextra');
        if (res.success && res.data) {
          if (Array.isArray(res.data.items)) {
            setTiposExtra(res.data.items);
          } else if (Array.isArray(res.data)) {
            setTiposExtra(res.data);
          } else {
            setTiposExtra([]);
          }
        } else {
          setTiposExtra([]);
        }
      }
      if (selectedModel.id === 'usuario') {
        setTiposUsuario(tiposUsuarioFijos);
      }
    };
    fetchTipos();
  }, [selectedModel]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CatalogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nuevaVariante, setNuevaVariante] = useState('');

  useEffect(() => {
    loadItems();
  }, [selectedModel]);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, showActiveOnly]);

  const loadItems = async () => {
    if (selectedModel.id === 'usuario') {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.getCatalog<CatalogItem>(selectedModel.id);
      if (response.success && response.data) {
        // Backend returns {items: [], pagination: {}} structure
        const data = response.data as any;
        let itemsArray: CatalogItem[] = [];
        
        if (data.items && Array.isArray(data.items)) {
          itemsArray = data.items;
        } else if (Array.isArray(response.data)) {
          // Fallback in case backend returns array directly
          itemsArray = response.data;
        }
        
        // Filtrar mesas temporales si el catálogo es de mesas
        if (selectedModel.id === 'mesa') {
          // Filtrar mesas temporales y mesas con nombre "Pedido N"
          itemsArray = itemsArray.filter((item: any) => {
            // Filtrar mesas con propiedad temporal
            if (item.temporal) return false;
            // Filtrar mesas con nombre "Pedido N" (ej: Pedido 1, Pedido 2, etc)
            if (item.nombre && /^Pedido \d+$/i.test(item.nombre.trim())) return false;
            return true;
          });
          
          // Lógica para crear o renombrar la mesa "Nuevo pedido"
          const mesaNuevoPedido = itemsArray.find((mesa: any) => 
            mesa.nombre && mesa.nombre.trim().toLowerCase() === 'nuevo pedido'
          );
          const mesaPedidos = itemsArray.find((mesa: any) => 
            mesa.nombre && mesa.nombre.trim().toLowerCase() === 'pedidos'
          );
          
          // Si existe "Pedidos" pero no "Nuevo pedido", renombrar "Pedidos" a "Nuevo pedido"
          if (mesaPedidos && !mesaNuevoPedido) {
            try {
              await apiService.updateCatalogItem('mesa', mesaPedidos._id!, {
                ...mesaPedidos,
                nombre: 'Nuevo pedido'
              });
              // Recargar items después de renombrar
              const updatedResponse = await apiService.getCatalog<CatalogItem>('mesa');
              if (updatedResponse.success && updatedResponse.data) {
                const updatedData = updatedResponse.data as any;
                if (updatedData.items && Array.isArray(updatedData.items)) {
                  itemsArray = updatedData.items.filter((item: any) => {
                    if (item.temporal) return false;
                    if (item.nombre && /^Pedido \d+$/i.test(item.nombre.trim())) return false;
                    return true;
                  });
                } else if (Array.isArray(updatedResponse.data)) {
                  itemsArray = updatedResponse.data.filter((item: any) => {
                    if (item.temporal) return false;
                    if (item.nombre && /^Pedido \d+$/i.test(item.nombre.trim())) return false;
                    return true;
                  });
                }
              }
            } catch (error) {
              console.error('Error renombrando mesa Pedidos a Nuevo pedido:', error);
            }
          }
          // Si no existe ni "Nuevo pedido" ni "Pedidos", crear "Nuevo pedido"
          else if (!mesaNuevoPedido && !mesaPedidos) {
            try {
              await apiService.createCatalogItem('mesa', {
                nombre: 'Nuevo pedido',
                activo: true
              });
              // Recargar items después de crear
              const updatedResponse = await apiService.getCatalog<CatalogItem>('mesa');
              if (updatedResponse.success && updatedResponse.data) {
                const updatedData = updatedResponse.data as any;
                if (updatedData.items && Array.isArray(updatedData.items)) {
                  itemsArray = updatedData.items.filter((item: any) => {
                    if (item.temporal) return false;
                    if (item.nombre && /^Pedido \d+$/i.test(item.nombre.trim())) return false;
                    return true;
                  });
                } else if (Array.isArray(updatedResponse.data)) {
                  itemsArray = updatedResponse.data.filter((item: any) => {
                    if (item.temporal) return false;
                    if (item.nombre && /^Pedido \d+$/i.test(item.nombre.trim())) return false;
                    return true;
                  });
                }
              }
            } catch (error) {
              console.error('Error creando mesa Nuevo pedido:', error);
            }
          }
        }
        
        setItems(itemsArray);
      } else {
        setItems([]);
      }
    } catch (error) {
      setError('Error cargando datos');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = Array.isArray(items) ? items : [];
    
    if (showActiveOnly && selectedModel.hasActivo) {
      filtered = filtered.filter(item => item.activo);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredItems(filtered);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setNuevaVariante(''); // Limpiar el estado de nueva variante
    const initialData: any = {};
    if (selectedModel.hasActivo) {
      initialData.activo = true;
    }
    if (selectedModel.id === 'platillo') {
      initialData.precio = 0; // Set default value for precio
    }
    // Si es mesa, solo permitir seleccionar el número y autogenerar el nombre
    if (selectedModel.id === 'mesa') {
      // Verificar si existe 'Nuevo pedido' o 'Pedidos'
      const nuevoPedidoExists = items.some(
        (mesa) => mesa.nombre && mesa.nombre.trim().toLowerCase() === 'nuevo pedido'
      );
      const pedidosExists = items.some(
        (mesa) => mesa.nombre && mesa.nombre.trim().toLowerCase() === 'pedidos'
      );
      initialData.nuevoPedidoExists = nuevoPedidoExists;
      initialData.pedidosExists = pedidosExists;
      let maxNum = 0;
      items.forEach((mesa) => {
        if (mesa.nombre && mesa.nombre.startsWith('Mesa ')) {
          const num = parseInt(mesa.nombre.replace('Mesa ', ''));
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      initialData.numero = maxNum + 1;
      initialData.nombre = `Mesa ${maxNum + 1}`;
    }
    setFormData(initialData);
    setShowModal(true);
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setNuevaVariante(''); // Limpiar el estado de nueva variante
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedModel.id === 'platillo') {
        // `precio` es el precio de venta que usa el servidor para cobrar. Se copia también a
        // `costo` para no dejar en cero el campo heredado que aún leen pantallas antiguas.
        if (!formData.precio || formData.precio <= 0) {
          setError('El campo "precio" es obligatorio y debe ser mayor a 0.');
          setSaving(false);
          return;
        }
        formData.costo = formData.precio;
      }

      if (selectedModel.id === 'extra') {
        if (!formData.costo || formData.costo <= 0) {
          setError('El campo "costo" es obligatorio y debe ser mayor a 0.');
          setSaving(false);
          return;
        }
      }


      // Validación de usuario: correo y contraseña
      let dataToSend = { ...formData };
      if (selectedModel.id === 'usuario') {
        // Validar formato de correo
        const emailRegex = /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/;
        if (!formData.email || !emailRegex.test(formData.email)) {
          setError('El correo electrónico no es válido.');
          setSaving(false);
          return;
        }
        // Validar contraseña solo si se está creando o si se está editando y se ingresó una nueva
        if ((!editingItem && (!formData.password || formData.password.length < 6)) ||
            (editingItem && formData.password && formData.password.length > 0 && formData.password.length < 6)) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          setSaving(false);
          return;
        }
        // Si se está editando y el campo password está vacío, no enviar password
        if (editingItem) {
          if (!formData.password || formData.password.length === 0) {
            // Eliminar password para no enviarlo
            delete dataToSend.password;
          }
        }
      }

      // Validación especial para mesa
      if (selectedModel.id === 'mesa') {
        const nuevoPedidoExists = items.some(
          (mesa) => mesa.nombre && mesa.nombre.trim().toLowerCase() === 'nuevo pedido'
        );
        const pedidosExists = items.some(
          (mesa) => mesa.nombre && mesa.nombre.trim().toLowerCase() === 'pedidos'
        );
        
        // Si el usuario intenta crear 'Nuevo pedido' o 'Pedidos' y ya existe, bloquear
        if (formData.nombre) {
          const nombreLower = formData.nombre.trim().toLowerCase();
          if ((nombreLower === 'nuevo pedido' && nuevoPedidoExists) ||
              (nombreLower === 'pedidos' && (pedidosExists || nuevoPedidoExists))) {
            setError('Ya existe una mesa llamada "Nuevo pedido".');
            setSaving(false);
            return;
          }
        }
        
        // Si el nombre no es 'Mesa X', 'Pedidos' o 'Nuevo pedido', bloquear
        if (
          formData.nombre &&
          !/^Mesa \d+$/.test(formData.nombre.trim()) &&
          formData.nombre.trim().toLowerCase() !== 'pedidos' &&
          formData.nombre.trim().toLowerCase() !== 'nuevo pedido'
        ) {
          setError('El nombre de la mesa debe ser "Mesa X" o "Nuevo pedido".');
          setSaving(false);
          return;
        }
      }

      let response;
      if (editingItem) {
        response = await apiService.updateCatalogItem(selectedModel.id, editingItem._id!, dataToSend);
      } else {
        response = await apiService.createCatalogItem(selectedModel.id, dataToSend);
      }

      if (response.success) {
        setSuccess(editingItem ? 'Item actualizado exitosamente' : 'Item creado exitosamente');
        setError(''); // Clear error message after successful creation
        setShowModal(false);
        await loadItems();
      } else {
        // Mostrar advertencia específica si la contraseña es demasiado corta
        if (response.error && response.error.toString().includes('Path `password`') && response.error.toString().includes('minimum allowed length')) {
          setError('La contraseña debe tener al menos 6 caracteres.');
        } else if (response.error && response.error.toString().toLowerCase().includes('email')) {
          setError('El correo electrónico no es válido o ya está en uso.');
        } else {
          setError('Error guardando el item');
        }
        console.error('Error al guardar el item:', response.error);
      }
    } catch (error) {
      console.error('Error inesperado al guardar el item:', error);
      setError('Error guardando el item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    // Restringir eliminación de admin/encargado por mesero/despachador
    if (
      selectedModel.id === 'usuario' &&
      (item.nombreTipoUsuario === 'Admin' || item.nombreTipoUsuario === 'Encargado') &&
      user && (user.nombreTipoUsuario === 'Mesero' || user.nombreTipoUsuario === 'Despachador')
    ) {
      setError('No tienes permiso para eliminar usuarios tipo Administrador o Encargado.');
      return;
    }
    // No permitir eliminar la mesa con nombre "pedidos" o "nuevo pedido"
    if (selectedModel.id === 'mesa' && item.nombre && 
        (item.nombre.trim().toLowerCase() === 'pedidos' || 
         item.nombre.trim().toLowerCase() === 'nuevo pedido')) {
      setError('No puedes eliminar la mesa "Nuevo pedido".');
      return;
    }
    if (!confirm('¿Estás seguro de que quieres eliminar este item?')) return;
    try {
      const response = await apiService.deleteCatalogItem(selectedModel.id, item._id!);
      if (response.success) {
        setSuccess('Item eliminado exitosamente');
        await loadItems();
      } else {
        setError('Error eliminando el item');
      }
    } catch (error) {
      setError('Error eliminando el item');
    }
  };

  const handleToggleActive = async (item: CatalogItem) => {
    try {
      const response = await apiService.updateCatalogItem(selectedModel.id, item._id!, {
        ...item,
        activo: !item.activo
      });
      
      if (response.success) {
        setSuccess(`Item ${item.activo ? 'desactivado' : 'activado'} exitosamente`);
        await loadItems();
      } else {
        setError('Error actualizando el item');
      }
    } catch (error) {
      setError('Error actualizando el item');
    }
  };

  const renderField = (field: string, value: any) => {
  switch (field) {
      case 'nombreTipoUsuario': {
        // Restringir selección de tipo Admin/Encargado para Mesero/Despachador
        const esMeseroODespachador = user && (user.nombreTipoUsuario === 'Mesero' || user.nombreTipoUsuario === 'Despachador');
        // Si es edición y el usuario editado es Admin/Encargado, bloquear el select
        const esAdminOEncargadoEdit = editingItem && (editingItem.nombreTipoUsuario === 'Admin' || editingItem.nombreTipoUsuario === 'Encargado');
        // Opciones permitidas
        const opciones = esMeseroODespachador
          ? tiposUsuario.filter(tipo => tipo.value !== 'Admin' && tipo.value !== 'Encargado')
          : tiposUsuario;
        return (
          <div>
            <select
              value={value || ''}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
              className="campo"
              disabled={!!esAdminOEncargadoEdit && !!esMeseroODespachador}
            >
              <option value="">Selecciona tipo de usuario</option>
              {opciones.map(tipo => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
            {/* Mensaje si no puede editar tipo de usuario */}
            {esAdminOEncargadoEdit && esMeseroODespachador && (
              <div className="text-meta text-red-600 mt-1">No puedes cambiar el tipo de usuario de un Administrador o Encargado.</div>
            )}
            {/* Mensaje si está creando y no puede crear admin/encargado */}
            {!editingItem && esMeseroODespachador && (
              <div className="text-meta text-orange-600 mt-1">No puedes crear usuarios tipo Administrador o Encargado.</div>
            )}
          </div>
        );
      }
      case 'idTipoPlatillo': {
        // Mostrar solo tipos de platillo existentes
        return (
          <select
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            className="campo"
          >
            <option value="">Selecciona tipo de platillo</option>
            {(Array.isArray(tiposPlatillo) ? tiposPlatillo : []).map(tipo => (
              <option key={tipo._id} value={tipo._id}>{tipo.nombre}</option>
            ))}
          </select>
        );
      }
      case 'idTipoExtra': {
        // Mostrar solo tipos de extra existentes
        return (
          <select
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            className="campo"
          >
            <option value="">Selecciona tipo de extra</option>
            {(Array.isArray(tiposExtra) ? tiposExtra : []).map(tipo => (
              <option key={tipo._id} value={tipo._id}>{tipo.nombre}</option>
            ))}
          </select>
        );
      }
      case 'idTipoProducto': {
        // Mostrar solo tipos de producto existentes
        return (
          <select
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            className="campo"
          >
            <option value="">Selecciona tipo de producto</option>
            {(Array.isArray(tiposProducto) ? tiposProducto : []).map(tipo => (
              <option key={tipo._id} value={tipo._id}>{tipo.nombre}</option>
            ))}
          </select>
        );
      }
      case 'activo':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.checked })}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <label className="ml-2 text-cuerpo text-gray-700">Activo</label>
          </div>
        );
      case 'password': {
        // Si es edición de usuario, mostrar campo para cambiar contraseña opcional
        if (selectedModel.id === 'usuario' && editingItem) {
          const esAdminOEncargado = editingItem.nombreTipoUsuario === 'Admin' || editingItem.nombreTipoUsuario === 'Encargado';
          const esMeseroODespachador = user && (user.nombreTipoUsuario === 'Mesero' || user.nombreTipoUsuario === 'Despachador');
          const noPuedeEditar = esAdminOEncargado && esMeseroODespachador;
          return (
            <div>
              <input
                type="password"
                value={value || ''}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                className="campo"
                placeholder="Dejar vacío para no cambiar"
                disabled={!!noPuedeEditar}
              />
              {noPuedeEditar && (
                <div className="text-meta text-red-600 mt-1">No puedes editar la contraseña de un Administrador o Encargado.</div>
              )}
              {value && value.length > 0 && value.length < 6 && !noPuedeEditar && (
                <div className="text-meta text-red-600 mt-1">La contraseña debe tener al menos 6 caracteres.</div>
              )}
              {!noPuedeEditar && (
                <div className="text-meta text-gray-500 mt-1">Dejar vacío para mantener la contraseña actual.</div>
              )}
            </div>
          );
        }
        // Si es creación de usuario o edición de otro modelo
        return (
          <div>
            <input
              type="password"
              value={value || ''}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
              className="campo"
              placeholder={`Ingresa ${field}`}
            />
            {selectedModel.id === 'usuario' && value && value.length > 0 && value.length < 6 && (
              <div className="text-meta text-red-600 mt-1">La contraseña debe tener al menos 6 caracteres.</div>
            )}
          </div>
        );
      }
      case 'email': {
        // Validación visual de formato de correo solo en crear usuario
        const emailRegex = /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/;
        const isUsuario = selectedModel.id === 'usuario';
        const showEmailFormatError = isUsuario && value && !emailRegex.test(value);
        let noPuedeEditarCorreo = false;
        if (isUsuario && editingItem) {
          const esAdminOEncargado = editingItem.nombreTipoUsuario === 'Admin' || editingItem.nombreTipoUsuario === 'Encargado';
          const esMeseroODespachador = !!user && (user.nombreTipoUsuario === 'Mesero' || user.nombreTipoUsuario === 'Despachador');
          noPuedeEditarCorreo = !!(esAdminOEncargado && esMeseroODespachador);
        }
        return (
          <div>
            <input
              type="email"
              value={value || ''}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
              className="campo"
              placeholder={`Ingresa ${field}`}
              pattern="^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$"
              required={isUsuario}
              disabled={!!noPuedeEditarCorreo}
            />
            {noPuedeEditarCorreo && (
              <div className="text-meta text-red-600 mt-1">No puedes editar el correo de un Administrador o Encargado.</div>
            )}
            {showEmailFormatError && !noPuedeEditarCorreo && (
              <div className="text-meta text-red-600 mt-1">Formato: ejemplo@gmail.com</div>
            )}
          </div>
        );
      }
      case 'numero': {
        // Si es mesa, solo permitir seleccionar el número correlativo siguiente
        if (selectedModel.id === 'mesa') {
          let maxNum = 0;
          items.forEach((mesa) => {
            if (mesa.nombre && mesa.nombre.startsWith('Mesa ')) {
              const num = parseInt(mesa.nombre.replace('Mesa ', ''));
              if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          });
          const nextNum = maxNum + 1;
          return (
            <input
              type="number"
              value={formData.numero || nextNum}
              min={nextNum}
              max={nextNum}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
              placeholder="Número de mesa"
            />
          );
        }
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [field]: parseFloat(e.target.value) || 0 })}
            className="campo"
            placeholder={`Ingresa ${field}`}
            min="0"
            step={['costo', 'precio'].includes(field) ? '0.01' : '1'}
          />
        );
      }
      case 'descripcion':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            className="campo"
            placeholder={`Ingresa ${field}`}
            rows={3}
          />
        );
      case 'nombre': {
        if (selectedModel.id === 'mesa') {
          // Permitir crear 'Nuevo pedido' solo si no existe
          const nuevoPedidoExists = items.some(
            (mesa) => mesa.nombre && mesa.nombre.trim().toLowerCase() === 'nuevo pedido'
          );
          const pedidosExists = items.some(
            (mesa) => mesa.nombre && mesa.nombre.trim().toLowerCase() === 'pedidos'
          );
          const mesaEspecialExists = nuevoPedidoExists || pedidosExists;
          
          // Si ya existe 'Nuevo pedido' o 'Pedidos', solo mostrar el nombre autogenerado y deshabilitado
          if (formData.nombre && 
              (formData.nombre.trim().toLowerCase() === 'nuevo pedido' || 
               formData.nombre.trim().toLowerCase() === 'pedidos')) {
            if (mesaEspecialExists) {
              return (
                <input
                  type="text"
                  value={formData.nombre}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
                  placeholder="Nombre de la mesa"
                />
              );
            }
          }
          // Permitir al usuario elegir entre 'Nuevo pedido' (si no existe) o el nombre autogenerado
          return (
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.nombre || ''}
                disabled={formData.nombre && 
                         formData.nombre.trim().toLowerCase() !== 'nuevo pedido' && 
                         formData.nombre.trim().toLowerCase() !== 'pedidos'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
                placeholder="Nombre de la mesa"
              />
              {!mesaEspecialExists && (
                <button
                  type="button"
                  className="btn bg-blue-100 text-blue-700 whitespace-nowrap"
                  onClick={() => setFormData({ ...formData, nombre: 'Nuevo pedido' })}
                >
                  Crear Nuevo pedido
                </button>
              )}
            </div>
          );
        }
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            className="campo"
            placeholder={`Ingresa ${field}`}
          />
        );
      }
      case 'variantes': {
        // Campo especial para manejar variantes de productos
        const variantes = Array.isArray(value) ? value : [];

        return (
          <div className="space-y-2">
            {/* Lista de variantes existentes */}
            {variantes.length > 0 && (
              <div className="space-y-1">
                {variantes.map((variante: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <span className="flex-1 text-cuerpo">{variante}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nuevasVariantes = variantes.filter((_: string, i: number) => i !== index);
                        setFormData({ ...formData, variantes: nuevasVariantes });
                      }}
                      className="text-red-600 hover:text-red-800 text-meta"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Input para agregar nueva variante */}
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevaVariante}
                onChange={(e) => setNuevaVariante(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (nuevaVariante.trim()) {
                      const nuevasVariantes = [...variantes, nuevaVariante.trim()];
                      setFormData({ ...formData, variantes: nuevasVariantes });
                      setNuevaVariante('');
                    }
                  }
                }}
                className="campo flex-1"
                placeholder="Escribe una variante y presiona Enter"
              />
              <button
                type="button"
                onClick={() => {
                  if (nuevaVariante.trim()) {
                    const nuevasVariantes = [...variantes, nuevaVariante.trim()];
                    setFormData({ ...formData, variantes: nuevasVariantes });
                    setNuevaVariante('');
                  }
                }}
                className="btn bg-orange-600 text-white hover:bg-orange-700 whitespace-nowrap"
              >
                Agregar
              </button>
            </div>
            <p className="text-meta text-gray-500">
              Las variantes son opcionales y no afectan el precio del producto
            </p>
          </div>
        );
      }
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            className="campo"
            placeholder={`Ingresa ${field}`}
          />
        );
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: { [key: string]: string } = {
      nombre: 'Nombre',
      descripcion: 'Descripción',
      codigoBarras: 'Código de Barras',
      idTipoProducto: 'Tipo de Producto',
      idTipoExtra: 'Tipo de Extra',
      cantidad: 'Cantidad',
      costo: 'Costo',
      precio: 'Precio',
      idTipoPlatillo: 'Tipo de Platillo',
      permisos: 'Permisos',
      email: 'Email',
      password: 'Contraseña',
      nombreTipoUsuario: 'Tipo de Usuario',
      telefono: 'Teléfono',
      numero: 'Número',
      capacidad: 'Capacidad',
      ubicacion: 'Ubicación',
      activo: 'Activo',
      variantes: 'Variantes del Producto'
    };
    return labels[field] || field;
  };

  return (
      <div className="max-w-7xl mx-auto space-y-6 px-1 py-2 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-pantalla font-bold text-gray-900 truncate">Catálogos</h1>
            <p className="text-gray-600 mt-1 text-cuerpo">Gestiona los catálogos maestros del sistema</p>
          </div>
          {/* Solo mostrar botón de nuevo si NO es tipos de usuario */}
          {!['tipousuario', 'usuario'].includes(selectedModel.id) && (
            <button
              onClick={handleCreate}
              className="btn flex-shrink-0 bg-orange-600 text-white hover:bg-orange-700"
            >
              <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Nuevo {selectedModel.name.slice(0, -1)}</span>
            </button>
          )}
        </div>

        <Aviso error={error} exito={success} />

        

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-6">
          {/* Model Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-1 py-2 sm:p-6">
            <div className="flex items-center space-x-2 mb-2 sm:mb-4">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
              <h2 className="text-titulo font-semibold text-gray-900 truncate">Catálogos</h2>
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              {catalogModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  className={`w-full text-left px-2 py-1 sm:px-3 sm:py-2 rounded-lg transition-colors truncate text-cuerpo ${
                    selectedModel.id === model.id
                      ? 'bg-orange-100 text-orange-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>

          {/* Items List */}
          <div ref={itemsListRef} className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 px-1 py-2 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-6">
              <h2 className="text-titulo font-semibold text-gray-900 truncate">{selectedModel.name}</h2>
              {/* Solo mostrar búsqueda y filtro si NO es tipos de usuario */}
              {!['tipousuario', 'usuario'].includes(selectedModel.id) && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1 sm:flex-initial">
                    <Search className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="campo min-w-0 flex-1 sm:w-48"
                      placeholder="Buscar..."
                    />
                  </div>
                  {selectedModel.hasActivo && (
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                      <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                      <label className="flex items-center whitespace-nowrap text-meta">
                        <input
                          type="checkbox"
                          checked={showActiveOnly}
                          onChange={(e) => setShowActiveOnly(e.target.checked)}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="ml-2 text-cuerpo text-gray-700">Solo activos</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel especial para tipos de usuario */}
            {selectedModel.id === 'usuario' ? (
              <UsuariosPanel />
            ) : selectedModel.id === 'tipousuario' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-1 sm:py-3 sm:px-4 font-medium text-gray-900 text-cuerpo">Tipo de Usuario</th>
                      <th className="text-left py-2 px-1 sm:py-3 sm:px-4 font-medium text-gray-900 text-cuerpo">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiposUsuarioFijos.map(tipo => (
                      <tr key={tipo.value} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-1 sm:py-3 sm:px-4 font-medium text-gray-900 text-cuerpo truncate">{tipo.label}</td>
                        <td className="py-2 px-1 sm:py-3 sm:px-4 text-gray-700 text-cuerpo break-words hyphens-auto">{tipo.descripcion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // ...existing code for other models...
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-1 sm:py-3 sm:px-4 font-medium text-gray-900 text-cuerpo">Nombre</th>
                      <th className="text-left py-2 px-1 sm:py-3 sm:px-4 font-medium text-gray-900 text-cuerpo">Estado</th>
                      {(selectedModel.id === 'producto' || selectedModel.id === 'platillo' || selectedModel.id === 'extra') && (
                        <th className="text-left py-2 px-1 sm:py-3 sm:px-4 font-medium text-gray-900 text-cuerpo">Precio</th>
                      )}
                      <th className="text-left py-2 px-1 sm:py-3 sm:px-4 font-medium text-gray-900 text-cuerpo">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-1 sm:py-3 sm:px-4">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-cuerpo truncate break-words hyphens-auto">{item.nombre}</p>
                            {item.descripcion && (
                              <p className="text-meta text-gray-600 line-clamp-2 break-words hyphens-auto">{item.descripcion}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-1 sm:py-3 sm:px-4">
                          {selectedModel.hasActivo ? (
                            <span
                              className={`px-2 py-1 text-meta font-medium rounded-full whitespace-nowrap ${
                                item.activo
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {item.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-meta font-medium rounded-full bg-gray-100 text-gray-800 whitespace-nowrap">
                              N/A
                            </span>
                          )}
                        </td>
                        {(selectedModel.id === 'producto' || selectedModel.id === 'platillo' || selectedModel.id === 'extra') && (
                          <td className="py-2 px-1 sm:py-3 sm:px-4">
                            <span className="font-medium text-green-600 text-cuerpo whitespace-nowrap">
                              ${((item as any).precio || (item as any).costo || 0).toFixed(2)}
                            </span>
                          </td>
                        )}
                        <td className="py-2 px-1 sm:py-3 sm:px-4">
                          <div className="flex space-x-1">
                            {selectedModel.id !== 'mesa' && (
                              <button
                                onClick={() => handleEdit(item)}
                                className="btn text-blue-600 hover:bg-blue-50 flex-shrink-0"
                              >
                                <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(item)}
                              className="btn text-red-600 hover:bg-red-50 flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredItems.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No se encontraron items</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal solo si NO es tipos de usuario */}
        {showModal && !['tipousuario', 'usuario'].includes(selectedModel.id) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-1 py-2 sm:p-4">
            <div className="bg-white rounded-xl px-2 py-3 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-titulo font-semibold text-gray-900 mb-2 sm:mb-4 truncate break-words hyphens-auto">
                {editingItem ? 'Editar' : 'Crear'} {selectedModel.name.slice(0, -1)}
              </h3>
              
              <div className="space-y-2 sm:space-y-4">
                {selectedModel.fields.map((field) => (
                  <div key={field}>
                    <label className="block text-meta font-medium text-gray-700 mb-1 sm:mb-2 truncate break-words">
                      {getFieldLabel(field)}
                    </label>
                    {renderField(field, formData[field])}
                  </div>
                ))}
                
                {selectedModel.hasActivo && (
                  <div>
                    <label className="block text-meta font-medium text-gray-700 mb-1 sm:mb-2">
                      Estado
                    </label>
                    {renderField('activo', formData.activo)}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-3 sm:mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn flex-1 bg-orange-600 text-white hover:bg-orange-700"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default Catalogos;