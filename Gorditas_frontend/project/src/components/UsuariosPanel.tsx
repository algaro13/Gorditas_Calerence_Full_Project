import React, { useCallback, useEffect, useState } from 'react';
import { Aviso } from './Aviso';
import { Plus, Mail, Trash2, UserCheck, UserX, X, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { EstadoDeCupo, UserRole, Usuario } from '../types';

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
  const { user } = useAuth();
  const allowed = rolesAdministrables(user?.roles ?? []);
  const [items, setItems] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [cupo, setCupo] = useState<EstadoDeCupo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [res, estado] = await Promise.all([apiService.getUsuarios(), apiService.getCupo()]);
    if (res.success && Array.isArray(res.data)) setItems(res.data);
    else setError(res.error || 'No se pudo cargar el personal');
    // El cupo lo calcula el backend: asi el nombre que se anuncia aqui es el mismo que
    // desactivara el trabajo diario, y no dos cuentas que puedan discrepar.
    setCupo(estado.success && estado.data ? estado.data : null);
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
  // Bajar de plan no desactiva a nadie en el momento: se abre un plazo. Quién se irá al vencer
  // lo decide el backend, no esta pantalla, para que el nombre anunciado y el desactivado sean
  // el mismo. Mientras dure, invitar falla siempre, así que no se ofrece.
  const sobreCupo = cupo?.excedido ?? false;
  const sobran = cupo?.sobran ?? 0;
  const enRiesgo = cupo?.enRiesgo ?? [];
  // Lo que ya ocurrió: sin decirlo, tras el vencimiento alguien simplemente deja de aparecer.
  const yaDesactivados = cupo?.desactivadosPorCupo ?? [];
  const limite = cupo?.fechaLimite ? new Date(cupo.fechaLimite) : null;
  const diasRestantes = limite ? Math.max(0, Math.ceil((limite.getTime() - Date.now()) / 86_400_000)) : null;
  const fechaTexto = limite ? limite.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }) : '';

  return (
    <div className="space-y-4">
      {yaDesactivados.length > 0 && (
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
          <p className="text-cuerpo font-semibold text-gray-900">
            {yaDesactivados.length === 1 ? 'Se desactivó 1 usuario' : `Se desactivaron ${yaDesactivados.length} usuarios`} al vencer el plazo
          </p>
          <p className="text-cuerpo text-gray-700 mt-1">
            Tu plan permite {cupo?.maxUsuarios ?? 0} usuario{(cupo?.maxUsuarios ?? 0) === 1 ? '' : 's'} activo
            {(cupo?.maxUsuarios ?? 0) === 1 ? '' : 's'} y el plazo para ajustarlo terminó, así que el sistema desactivó a{' '}
            {yaDesactivados.map((u, i) => (
              <React.Fragment key={u._id}>
                {i > 0 ? (i === yaDesactivados.length - 1 ? ' y ' : ', ') : ''}
                <strong>{u.nombre}</strong>
                {u.desactivadoPorCupo
                  ? ` el ${new Date(u.desactivadoPorCupo).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`
                  : ''}
              </React.Fragment>
            ))}
            .
          </p>
          <p className="text-cuerpo text-gray-700 mt-2">
            No se borró nada: si cambias a un plan más grande puedes volver a activarlos desde la lista.
          </p>
        </div>
      )}

      {sobreCupo && cupo && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <p className="text-cuerpo font-semibold text-amber-900">
            Tienes {sobran} usuario{sobran === 1 ? '' : 's'} por encima de tu plan
          </p>
          <p className="text-cuerpo text-amber-800 mt-1">
            Tu plan permite {cupo.maxUsuarios} usuario{cupo.maxUsuarios === 1 ? '' : 's'} activo
            {cupo.maxUsuarios === 1 ? '' : 's'} y tienes {activos}. Nadie pierde el acceso ahora
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
            Para evitarlo: desactiva {sobran} usuario{sobran === 1 ? '' : 's'} de la lista, o cambia a un
            plan más grande.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-cuerpo text-gray-600">
          {activos} activo{activos === 1 ? '' : 's'}
          {/* Del endpoint de cupo, no del contexto: el del contexto se carga al iniciar sesión
              y queda viejo si el plan cambia mientras la sesión está abierta. */}
          {cupo ? ` de ${cupo.maxUsuarios} permitidos en tu plan` : ''}. Los usuarios reciben un correo para crear su contraseña.
        </p>
        {allowed.length > 0 && !sobreCupo && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn flex-shrink-0 btn-neutro"
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? 'Cancelar' : 'Invitar usuario'}
          </button>
        )}
      </div>

      <Aviso error={error} exito={success} />
      

      {showForm && !sobreCupo && (
        <form onSubmit={invitar} className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            required
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="campo"
          />
          <input
            required
            placeholder="Apellido"
            value={form.apellido}
            onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            className="campo"
          />
          <input
            required
            type="email"
            placeholder="Correo electrónico"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="campo"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className="campo"
          >
            {ROLE_INFO.filter((r) => allowed.includes(r.value)).map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="sm:col-span-2 text-meta text-gray-500">{ROLE_INFO.find((r) => r.value === form.role)?.descripcion}</p>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={busy === 'invitar'}
              className="btn btn-neutro"
            >
              <Mail className="w-4 h-4 mr-2" /> {busy === 'invitar' ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-cuerpo text-gray-500 py-6">
          <RefreshCw className="w-4 h-4 animate-spin" /> Cargando personal...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 sm:px-4 font-medium text-gray-900 text-meta">Nombre</th>
                <th className="text-left py-2 px-2 sm:px-4 font-medium text-gray-900 text-meta">Correo</th>
                <th className="text-left py-2 px-2 sm:px-4 font-medium text-gray-900 text-meta">Rol</th>
                <th className="text-left py-2 px-2 sm:px-4 font-medium text-gray-900 text-meta">Estado</th>
                <th className="text-right py-2 px-2 sm:px-4 font-medium text-gray-900 text-meta">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const manageable = canManage(u);
                const isBusy = busy === u._id;
                return (
                  <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 sm:px-4 text-meta text-gray-900">
                      {u.nombre}
                      {isSelf(u) && <span className="ml-2 text-meta text-gray-400">(tú)</span>}
                    </td>
                    <td className="py-2 px-2 sm:px-4 text-meta text-gray-700 break-all">{u.email}</td>
                    <td className="py-2 px-2 sm:px-4 text-meta">
                      {manageable ? (
                        <select
                          value={u.role}
                          disabled={isBusy}
                          onChange={(e) => void cambiarRol(u, e.target.value as UserRole)}
                          className="px-2 py-1 border border-gray-300 rounded text-meta"
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
                    <td className="py-2 px-2 sm:px-4 text-meta">
                      <span className={`px-2 py-1 rounded-full text-meta ${u.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2 px-2 sm:px-4 text-right whitespace-nowrap">
                      {manageable && (
                        <div className="inline-flex items-center gap-1">
                          <button title="Reenviar invitación" disabled={isBusy} onClick={() => void reenviar(u)} className="btn text-gray-500 hover:text-blue-600">
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            title={u.activo ? 'Desactivar' : 'Activar'}
                            disabled={isBusy}
                            onClick={() => void toggleActivo(u)}
                            className="btn text-gray-500 hover:text-orange-600"
                          >
                            {u.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button title="Eliminar" disabled={isBusy} onClick={() => void eliminar(u)} className="btn text-gray-500 hover:text-red-600">
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
                  <td colSpan={5} className="py-6 text-center text-cuerpo text-gray-500">
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
