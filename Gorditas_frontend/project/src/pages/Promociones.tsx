import React, { useEffect, useState } from 'react';
import { Plus, Tag, X } from 'lucide-react';
import { Aviso } from '../components/Aviso';
import { apiService } from '../services/api';
import type { FormaPromocion, Promocion, PromocionItem } from '../types';

/** Lo que esta pantalla necesita de un catálogo: su identificador y cómo se llama. */
interface ArticuloDeCatalogo {
  _id: string | number;
  nombre: string;
}

/**
 * Las promociones del restaurante.
 *
 * Las tres formas son un conjunto cerrado —combo, lleva N paga M, y porcentaje—, así que la
 * pantalla puede pedir exactamente lo que cada una necesita en vez de ofrecer un formulario
 * genérico donde cualquier combinación parece válida y luego no descuenta nada.
 *
 * No hay forma de teclear un importe sobre una orden: todo descuento sale de una regla escrita
 * aquí antes. Un descuento a mano no se distingue de un faltante al cuadrar el día.
 */

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const FORMAS: Array<{ id: FormaPromocion; nombre: string; explica: string }> = [
  { id: 'combo', nombre: 'Combo', explica: 'Un conjunto de artículos a un precio fijo' },
  { id: 'nxm', nombre: 'Lleva N, paga M', explica: 'Como el 3x2: se regalan las unidades más baratas' },
  { id: 'porcentaje', nombre: 'Porcentaje', explica: 'Un descuento sobre una categoría o sobre todo' },
];

const vacia = (): Partial<Promocion> => ({
  nombre: '',
  forma: 'porcentaje',
  activo: true,
  combinable: false,
  diasSemana: [],
  items: [],
});

/** Lo que hace una promoción, en una línea, para no tener que abrirla para saberlo. */
function enPalabras(p: Promocion, nombreDe: (i: PromocionItem) => string, categoria: string | null): string {
  if (p.forma === 'combo') {
    const partes = p.items.map((i) => `${i.cantidad}× ${nombreDe(i)}`).join(' + ');
    return `${partes} por $${(p.precio ?? 0).toFixed(2)}`;
  }
  if (p.forma === 'nxm') {
    const donde = categoria ? ` en ${categoria}` : p.items.length > 0 ? ` en ${p.items.map(nombreDe).join(', ')}` : '';
    return `Lleva ${p.lleva}, paga ${p.paga}${donde}`;
  }
  const donde = categoria ? ` en ${categoria}` : p.items.length > 0 ? ` en ${p.items.map(nombreDe).join(', ')}` : ' en toda la orden';
  return `${p.porcentaje}% de descuento${donde}`;
}

function vigenciaEnPalabras(p: Promocion): string | null {
  const partes: string[] = [];
  if (p.diasSemana.length > 0 && p.diasSemana.length < 7) partes.push(p.diasSemana.map((d) => DIAS[d]).join(', '));
  if (p.horaInicio && p.horaFin) partes.push(`de ${p.horaInicio} a ${p.horaFin}`);
  if (p.desde) partes.push(`desde ${p.desde.slice(0, 10)}`);
  if (p.hasta) partes.push(`hasta ${p.hasta.slice(0, 10)}`);
  return partes.length > 0 ? partes.join(' · ') : null;
}

const Promociones: React.FC = () => {
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [platillos, setPlatillos] = useState<ArticuloDeCatalogo[]>([]);
  const [productos, setProductos] = useState<ArticuloDeCatalogo[]>([]);
  const [tipos, setTipos] = useState<ArticuloDeCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [abierta, setAbierta] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Promocion>>(vacia());
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    const [p, pl, pr, tp] = await Promise.all([
      apiService.getPromociones(),
      apiService.getCatalog<ArticuloDeCatalogo>('platillo'),
      apiService.getCatalog<ArticuloDeCatalogo>('producto'),
      apiService.getCatalog<ArticuloDeCatalogo>('tipoplatillo'),
    ]);
    if (p.success && p.data) setPromociones(p.data.promociones);
    else setError(p.error || 'No se pudieron cargar las promociones');
    const items = (r: typeof pl) => ((r.data as unknown as { items?: ArticuloDeCatalogo[] })?.items ?? []) as ArticuloDeCatalogo[];
    setPlatillos(items(pl));
    setProductos(items(pr));
    setTipos(items(tp));
    setCargando(false);
  };

  useEffect(() => {
    void cargar();
  }, []);

  const nombreDe = (i: PromocionItem): string => {
    if (i.idPlatillo) return platillos.find((p) => Number(p._id) === i.idPlatillo)?.nombre ?? 'Platillo';
    return productos.find((p) => Number(p._id) === i.idProducto)?.nombre ?? 'Producto';
  };

  const categoriaDe = (p: Promocion): string | null =>
    p.idTipoPlatillo ? (tipos.find((t) => Number(t._id) === p.idTipoPlatillo)?.nombre ?? null) : null;

  const abrirNueva = () => {
    setForm(vacia());
    setEditando(null);
    setAbierta(true);
  };

  const abrirEdicion = (p: Promocion) => {
    setForm({ ...p, desde: p.desde?.slice(0, 10) ?? null, hasta: p.hasta?.slice(0, 10) ?? null });
    setEditando(p.id);
    setAbierta(true);
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    // El servidor vuelve a validar que cada forma traiga lo suyo: aquí solo se evita el viaje.
    const datos: Partial<Promocion> = {
      ...form,
      nombre: form.nombre?.trim(),
      desde: form.desde || null,
      hasta: form.hasta || null,
      horaInicio: form.horaInicio || null,
      horaFin: form.horaFin || null,
    };
    const res = editando ? await apiService.actualizarPromocion(editando, datos) : await apiService.crearPromocion(datos);
    setGuardando(false);
    if (!res.success) {
      setError(res.error || 'No se pudo guardar la promoción');
      return;
    }
    setExito(editando ? 'Promoción actualizada' : 'Promoción creada');
    setAbierta(false);
    await cargar();
  };

  const desactivar = async (p: Promocion) => {
    if (!confirm(`¿Desactivar «${p.nombre}»? Dejará de aplicarse en las órdenes nuevas.`)) return;
    const res = await apiService.desactivarPromocion(p.id);
    if (!res.success) setError(res.error || 'No se pudo desactivar');
    else await cargar();
  };

  const alternarDia = (dia: number) => {
    const actuales = form.diasSemana ?? [];
    setForm({
      ...form,
      diasSemana: actuales.includes(dia) ? actuales.filter((d) => d !== dia) : [...actuales, dia].sort(),
    });
  };

  const agregarItem = (idPlatillo: number | null, idProducto: number | null) => {
    if (!idPlatillo && !idProducto) return;
    setForm({ ...form, items: [...(form.items ?? []), { idPlatillo, idProducto, cantidad: 1 }] });
  };

  const quitarItem = (indice: number) => {
    setForm({ ...form, items: (form.items ?? []).filter((_, i) => i !== indice) });
  };

  const cambiarCantidad = (indice: number, cantidad: number) => {
    setForm({
      ...form,
      items: (form.items ?? []).map((it, i) => (i === indice ? { ...it, cantidad: Math.max(1, cantidad) } : it)),
    });
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-pantalla font-bold text-gray-900">Promociones</h1>
        <p className="text-gray-600 mt-1 text-cuerpo">
          Se aplican solas cuando la orden las gana. Nadie teclea descuentos a mano.
        </p>
      </div>

      <Aviso error={error} exito={exito} />

      <button onClick={abrirNueva} className="btn btn-primario w-full sm:w-auto">
        <Plus className="w-4 h-4 mr-2" />
        Nueva promoción
      </button>

      <div className="space-y-sp-2">
        {promociones.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border p-sp-3 space-y-sp-2 ${p.activo ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}`}
          >
            <div className="flex items-start justify-between gap-sp-1">
              <div className="min-w-0">
                <h3 className="text-cuerpo font-semibold text-gray-900 break-words">{p.nombre}</h3>
                <p className="text-meta text-gray-600 break-words">{enPalabras(p, nombreDe, categoriaDe(p))}</p>
                {vigenciaEnPalabras(p) && (
                  <p className="text-meta text-gray-500 break-words">{vigenciaEnPalabras(p)}</p>
                )}
              </div>
              <span
                className={`px-2 py-1 text-meta font-medium rounded-full whitespace-nowrap ${
                  p.activo ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {p.activo ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            {p.combinable && (
              <p className="text-meta text-blue-600">Se acumula con otras promociones</p>
            )}

            <div className="flex gap-sp-1">
              <button onClick={() => abrirEdicion(p)} className="btn btn-neutro flex-1">
                Editar
              </button>
              {p.activo && (
                <button onClick={() => desactivar(p)} className="btn btn-destructivo flex-1">
                  Desactivar
                </button>
              )}
            </div>
          </div>
        ))}

        {promociones.length === 0 && (
          <div className="text-center py-8">
            <Tag className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-cuerpo">Todavía no hay promociones</p>
          </div>
        )}
      </div>

      {abierta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-1 py-2 sm:p-4">
          <div className="bg-white rounded-xl p-sp-3 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-sp-2">
            <div className="flex items-center justify-between">
              <h3 className="text-titulo font-semibold text-gray-900">
                {editando ? 'Editar promoción' : 'Nueva promoción'}
              </h3>
              <button onClick={() => setAbierta(false)} className="btn btn-neutro" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="etiqueta">Nombre</label>
              <input
                className="campo"
                value={form.nombre ?? ''}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Martes de gorditas"
              />
              <p className="text-meta text-gray-500 mt-1">
                Aparece en el ticket del cliente, así que conviene que se entienda.
              </p>
            </div>

            <div>
              <label className="etiqueta">Qué hace</label>
              <div className="space-y-sp-1">
                {FORMAS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setForm({ ...form, forma: f.id })}
                    className={`btn w-full justify-start text-left ${form.forma === f.id ? 'btn-primario' : 'btn-neutro'}`}
                  >
                    <span className="min-w-0">
                      <span className="block">{f.nombre}</span>
                      <span className="block text-meta opacity-80">{f.explica}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {form.forma === 'combo' && (
              <div className="space-y-sp-1">
                <label className="etiqueta">Precio del conjunto</label>
                <input
                  type="number"
                  className="campo"
                  value={form.precio ?? ''}
                  onChange={(e) => setForm({ ...form, precio: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            {form.forma === 'nxm' && (
              <div className="grid grid-cols-2 gap-sp-1">
                <div>
                  <label className="etiqueta">Se lleva</label>
                  <input
                    type="number"
                    className="campo"
                    value={form.lleva ?? ''}
                    onChange={(e) => setForm({ ...form, lleva: parseInt(e.target.value) || 0 })}
                    min="2"
                  />
                </div>
                <div>
                  <label className="etiqueta">Paga</label>
                  <input
                    type="number"
                    className="campo"
                    value={form.paga ?? ''}
                    onChange={(e) => setForm({ ...form, paga: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
              </div>
            )}

            {form.forma === 'porcentaje' && (
              <div>
                <label className="etiqueta">Porcentaje</label>
                <input
                  type="number"
                  className="campo"
                  value={form.porcentaje ?? ''}
                  onChange={(e) => setForm({ ...form, porcentaje: parseFloat(e.target.value) || 0 })}
                  min="1"
                  max="100"
                />
              </div>
            )}

            {form.forma !== 'combo' && (
              <div>
                <label className="etiqueta">Sobre qué categoría</label>
                <select
                  className="campo"
                  value={form.idTipoPlatillo ?? ''}
                  onChange={(e) => setForm({ ...form, idTipoPlatillo: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Toda la orden</option>
                  {tipos.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.forma === 'combo' && (
              <div className="space-y-sp-1">
                <label className="etiqueta">Qué lleva el combo</label>
                {(form.items ?? []).map((it, i) => (
                  <div key={i} className="flex items-center gap-sp-1">
                    <span className="flex-1 min-w-0 text-cuerpo break-words">{nombreDe(it)}</span>
                    <input
                      type="number"
                      className="campo w-20"
                      value={it.cantidad}
                      onChange={(e) => cambiarCantidad(i, parseInt(e.target.value) || 1)}
                      min="1"
                      aria-label="Cantidad"
                    />
                    <button onClick={() => quitarItem(i)} className="btn btn-destructivo flex-shrink-0" aria-label="Quitar">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <select
                  className="campo"
                  value=""
                  onChange={(e) => {
                    const [tipo, id] = e.target.value.split(':');
                    agregarItem(tipo === 'p' ? Number(id) : null, tipo === 'r' ? Number(id) : null);
                  }}
                >
                  <option value="">Agregar artículo…</option>
                  {platillos.map((p) => (
                    <option key={`p${p._id}`} value={`p:${p._id}`}>
                      {p.nombre}
                    </option>
                  ))}
                  {productos.map((p) => (
                    <option key={`r${p._id}`} value={`r:${p._id}`}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="etiqueta">Días</label>
              <div className="flex flex-wrap gap-sp-1">
                {DIAS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => alternarDia(i)}
                    className={`btn ${(form.diasSemana ?? []).includes(i) ? 'btn-primario' : 'btn-neutro'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-meta text-gray-500 mt-1">Sin ninguno marcado, aplica todos los días.</p>
            </div>

            <div className="grid grid-cols-2 gap-sp-1">
              <div>
                <label className="etiqueta">Desde las</label>
                <input
                  type="time"
                  className="campo"
                  value={form.horaInicio ?? ''}
                  onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                />
              </div>
              <div>
                <label className="etiqueta">Hasta las</label>
                <input
                  type="time"
                  className="campo"
                  value={form.horaFin ?? ''}
                  onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
                />
              </div>
            </div>

            <label className="flex items-center gap-sp-1">
              <input
                type="checkbox"
                className="casilla"
                checked={form.combinable ?? false}
                onChange={(e) => setForm({ ...form, combinable: e.target.checked })}
              />
              <span className="text-cuerpo">
                Se acumula con otras. Sin esto, si dos aplican solo se concede la que más favorece al cliente.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-sp-1 pt-sp-1">
              <button onClick={() => setAbierta(false)} className="btn btn-neutro flex-1">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando} className="btn btn-primario flex-1">
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promociones;
