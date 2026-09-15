import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Mail, Trash2, UserCheck, UserX, X, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { UserRole, Usuario } from '../types';

const ROLE_INFO: { value: UserRole; label: string; descripcion: string }[] = [
  { value: 'Admin', label: 'Administrador', descripcion: 'Acceso total a todos los componentes y configuraciones.' },
  { value: 'Encargado', label: 'Encargado', descripcion: 'Gestiona inventario, reportes y personal operativo.' },
  { value: 'Mesero', label: 'Mesero', descripcion: 'Toma pedidos y atiende mesas.' },
  { value: 'Despachador', label: 'Despachador', descripcion: 'Atiende y despacha órdenes.' },
  { value: 'Cocinero', label: 'Cocinero', descripcion: 'Prepara y marca platillos listos.' },
];

const OPERATIVOS: UserRole[] = ['Mesero', 'Despachador', 'Cocinero'];

/** Roles que el usuario actual puede asignar (misma regla que el backend). */
function rolesAdministrables(roles: UserRole[]): UserRole[] {
  if (roles.includes('Admin')) return ['Admin', 'Encargado', ...OPERATIVOS];
  if (roles.includes('Encargado')) return OPERATIVOS;
  return [];
}

const emptyForm = { nombre: '', apellido: '', email: '', role: 'Mesero' as UserRole };

const UsuariosPanel: React.FC = () => {
  const { user, tenant } = useAuth();
  const allowed = rolesAdministrables(user?.roles ?? []);
  const [items, setItems] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiService.getUsuarios();
    if (res.success && Array.isArray(res.data)) setItems(res.data);
    else setError(res.error || 'No se pudo cargar el personal');
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const notify = (ok: boolean, msg: string) => {
    setError(ok ? '' : msg);
    setSuccess(ok ? msg : '');
  };

  // El espejo local expone su propio id, no el de Zitadel: el usuario actual se reconoce por correo.
  const isSelf = (u: Usuario) => Boolean(user?.email) && u.email.toLowerCase() === user!.email.toLowerCase();
  const canManage = (u: Usuario) => allowed.includes(u.role) && !isSelf(u);

  const invitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('invitar');
    const res = await apiService.invitarUsuario({ ...form, nombre: form.nombre.trim(), apellido: form.apellido.trim(), email: form.email.trim() });
    if (res.success) {
      notify(true, res.message || 'Usuario invitado. Recibirá un correo para establecer su contraseña.');
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } else {
      notify(false, res.error || 'No se pudo invitar al usuario');
    }
    setBusy(null);
  };

  const cambiarRol = async (u: Usuario, role: UserRole) => {
    setBusy(u._id);
    const res = await apiService.updateUsuario(u._id, { role });
    if (res.success) {
      notify(true, 'Rol actualizado');
      await load();
    } else notify(false, res.error || 'No se pudo cambiar el rol');
    setBusy(null);
  };

  const toggleActivo = async (u: Usuario) => {
    setBusy(u._id);
    const res = await apiService.updateUsuario(u._id, { activo: !u.activo });
    if (res.success) {
      notify(true, u.activo ? 'Usuario desactivado' : 'Usuario activado');
      await load();
    } else notify(false, res.error || 'No se pudo actualizar el usuario');
    setBusy(null);
  };

  const reenviar = async (u: Usuario) => {
    setBusy(u._id);
    const res = await apiService.resendInvite(u._id);
    notify(res.success, res.success ? 'Invitación reenviada' : res.error || 'No se pudo reenviar la invitación');
    setBusy(null);
  };

  const eliminar = async (u: Usuario) => {
    if (!window.confirm(`¿Eliminar a ${u.nombre} (${u.email})? Perderá el acceso de inmediato.`)) return;
    setBusy(u._id);
    const res = await apiService.deleteUsuario(u._id);
    if (res.success) {
      notify(true, 'Usuario eliminado');
      await load();
    } else notify(false, res.error || 'No se pudo eliminar el usuario');
    setBusy(null);
  };

  const activos = items.filter((u) => u.activo).length;
  // Al bajar de plan no se desactiva a nadie: el restaurante puede quedar por encima de su
  // cupo y seguir operando. Mientras eso dure, invitar falla siempre, así que no se ofrece.
  const excedidas = tenant ? activos - tenant.maxUsuarios : 0;
  const sobreCupo = excedidas > 0;

  return (
    <div className="space-y-4">
      {sobreCupo && tenant && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <p className="text-sm font-semibold text-amber-900">
            Tienes {excedidas} usuario{excedidas === 1 ? '' : 's'} por encima de tu plan
          </p>
          <p className="text-sm text-amber-800 mt-1">
            Tu plan permite {tenant.maxUsuarios} usuario{tenant.maxUsuarios === 1 ? '' : 's'} activo
            {tenant.maxUsuarios === 1 ? '' : 's'} y tienes {activos}. Nadie pierde el acceso, pero no
            puedes agregar a nadie más hasta resolverlo: desactiva {excedidas} usuario
            {excedidas === 1 ? '' : 's'} de la lista, o cambia a un plan más grande.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-gray-600">
          {activos} activo{activos === 1 ? '' : 's'}
          {tenant ? ` de ${tenant.maxUsuarios} permitidos en tu plan` : ''}. Los usuarios reciben un correo para crear su contraseña.
        </p>
        {allowed.length > 0 && !sobreCupo && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex-shrink-0 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center text-sm"
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? 'Cancelar' : 'Invitar usuario'}
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm break-words">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm break-words">{success}</div>}

      {showForm && !sobreCupo && (
        <form onSubmit={invitar} className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            required
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
          />
          <input
            required
            placeholder="Apellido"
            value={form.apellido}
            onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
          />
          <input
            required
            type="email"
            placeholder="Correo electrónico"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
          >
            {ROLE_INFO.filter((r) => allowed.includes(r.value)).map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="sm:col-span-2 text-xs text-gray-500">{ROLE_INFO.find((r) => r.value === form.role)?.descripcion}</p>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={busy === 'invitar'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center"
            >
              <Mail className="w-4 h-4 mr-2" /> {busy === 'invitar' ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
          <RefreshCw className="w-4 h-4 animate-spin" /> Cargando personal...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 sm:px-4 font-medium text-gray-900 text-xs sm:text-sm">Nombre</th>
                <th className="text-left py-2 px-2 sm:px-4 font-medium text-gray-900 text-xs sm:text-sm">Correo</th>
                <th className="text-left py-2 px-2 sm:px-4 font-medium text-gray-900 text-xs sm:text-sm">Rol</th>
                <th className="text-left py-2 px-2 sm:px-4 font-medium text-gray-900 text-xs sm:text-sm">Estado</th>
                <th className="text-right py-2 px-2 sm:px-4 font-medium text-gray-900 text-xs sm:text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const manageable = canManage(u);
                const isBusy = busy === u._id;
                return (
                  <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm text-gray-900">
                      {u.nombre}
                      {isSelf(u) && <span className="ml-2 text-xs text-gray-400">(tú)</span>}
                    </td>
                    <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm text-gray-700 break-all">{u.email}</td>
                    <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm">
                      {manageable ? (
                        <select
                          value={u.role}
                          disabled={isBusy}
                          onChange={(e) => void cambiarRol(u, e.target.value as UserRole)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                        >
                          {ROLE_INFO.filter((r) => allowed.includes(r.value)).map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        ROLE_INFO.find((r) => r.value === u.role)?.label ?? u.role
                      )}
                    </td>
                    <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${u.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2 px-2 sm:px-4 text-right whitespace-nowrap">
                      {manageable && (
                        <div className="inline-flex items-center gap-1">
                          <button title="Reenviar invitación" disabled={isBusy} onClick={() => void reenviar(u)} className="p-1.5 text-gray-500 hover:text-blue-600 disabled:opacity-50">
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            title={u.activo ? 'Desactivar' : 'Activar'}
                            disabled={isBusy}
                            onClick={() => void toggleActivo(u)}
                            className="p-1.5 text-gray-500 hover:text-orange-600 disabled:opacity-50"
                          >
                            {u.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button title="Eliminar" disabled={isBusy} onClick={() => void eliminar(u)} className="p-1.5 text-gray-500 hover:text-red-600 disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
                    Aún no hay personal registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsuariosPanel;
