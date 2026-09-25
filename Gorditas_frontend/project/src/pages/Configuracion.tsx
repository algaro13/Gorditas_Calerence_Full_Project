import React, { useState, useEffect } from 'react';
import { Settings, Upload, Check, Save } from 'lucide-react';
import { palettes, applyPalette, getPalette } from '../config/palettes';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { assetUrl } from '../config/app-config';

const Configuracion: React.FC = () => {
  const { tenant, hasPermission, refreshTenant } = useAuth();
  const canEdit = hasPermission(['Admin']);
  const [selectedPalette, setSelectedPalette] = useState('orange');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedPalette(tenant?.config?.paleta || 'orange');
    setImagePreview(assetUrl(tenant?.config?.imagen));
  }, [tenant]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('La imagen no debe exceder 2MB');
        return;
      }
      setError('');
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      if (imageFile) {
        const up = await apiService.uploadTenantLogo(imageFile);
        if (!up.success) {
          setError(up.error || 'No se pudo subir la imagen');
          setSaving(false);
          return;
        }
      }
      if (selectedPalette !== (tenant?.config?.paleta || 'orange')) {
        const res = await apiService.updateTenantConfig({ paleta: selectedPalette });
        if (!res.success) {
          setError(res.error || 'Error al guardar');
          setSaving(false);
          return;
        }
      }
      applyPalette(getPalette(selectedPalette));
      setImageFile(null);
      await refreshTenant();
      setSuccess('Configuración guardada exitosamente');
    } catch {
      setError('Error de conexión');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-gray-700" />
        <h1 className="text-pantalla font-bold text-gray-900">Configuración del negocio</h1>
      </div>

      {tenant && (
        <p className="text-cuerpo text-gray-500">
          {tenant.nombre} · <span className="font-mono">{tenant.url}</span>
        </p>
      )}

      {!canEdit && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-cuerpo">
          Solo un administrador puede modificar la configuración.
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5" /> {success}
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-cuerpo">{error}</div>}

      {/* Business Image */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-titulo font-semibold mb-4">Imagen del negocio</h2>
        <div className="flex items-center gap-6">
          {imagePreview ? (
            <img src={imagePreview} alt="Logo" className="w-24 h-24 rounded-lg object-cover border" />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div>
            <label className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-cuerpo font-medium ${canEdit ? 'cursor-pointer hover:bg-gray-200' : 'opacity-50'}`}>
              <Upload className="w-4 h-4" /> Cambiar imagen
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" disabled={!canEdit} />
            </label>
            <p className="text-meta text-gray-500 mt-2">JPG, PNG o WebP. Máximo 2MB.</p>
          </div>
        </div>
      </div>

      {/* Color Palette */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-titulo font-semibold mb-4">Paleta de colores</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {palettes.map((p) => (
            <button
              key={p.id}
              onClick={() => canEdit && setSelectedPalette(p.id)}
              disabled={!canEdit}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all disabled:cursor-not-allowed ${
                selectedPalette === p.id ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex gap-1">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: p.primary }} />
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: p.sidebarBg }} />
              </div>
              <span className="text-cuerpo font-medium">{p.name}</span>
              {selectedPalette === p.id && <Check className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !canEdit}
          className="btn gap-2 bg-gray-900 text-white hover:bg-gray-800"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
};

export default Configuracion;
