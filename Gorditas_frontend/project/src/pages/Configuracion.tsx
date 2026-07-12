import React, { useState, useEffect } from 'react';
import { Settings, Upload, Check, Save } from 'lucide-react';
import { palettes, applyPalette, getPalette } from '../config/palettes';

const Configuracion: React.FC = () => {
  const [tenantConfig, setTenantConfig] = useState<any>({});
  const [tenantNombre, setTenantNombre] = useState('');
  const [selectedPalette, setSelectedPalette] = useState('orange');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const config = JSON.parse(localStorage.getItem('tenantConfig') || '{}');
    const nombre = localStorage.getItem('tenantNombre') || '';
    setTenantConfig(config);
    setTenantNombre(nombre);
    setSelectedPalette(config.paleta || 'orange');
    if (config.imagen) {
      const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
      setImagePreview(`${baseUrl}${config.imagen}`);
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no debe exceder 2MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    const token = localStorage.getItem('msalToken') || localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    try {
      // Upload image if changed
      let imagenUrl = tenantConfig.imagen || null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('slug', tenantNombre.toLowerCase().replace(/\s+/g, '-'));

        const uploadRes = await fetch(`${baseUrl}/onboarding/upload-image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          imagenUrl = uploadData.data.url;
        }
      }

      // Save config
      const res = await fetch(`${baseUrl}/tenants/me/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ paleta: selectedPalette, imagen: imagenUrl }),
      });

      const data = await res.json();
      if (data.success) {
        // Update local storage
        const newConfig = { ...tenantConfig, paleta: selectedPalette, imagen: imagenUrl };
        localStorage.setItem('tenantConfig', JSON.stringify(newConfig));
        setTenantConfig(newConfig);

        // Apply palette immediately
        applyPalette(getPalette(selectedPalette));
        setSuccess('Configuración guardada exitosamente');
        setImageFile(null);

        // Reload to apply changes to header
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert(data.message || 'Error al guardar');
      }
    } catch (error) {
      alert('Error de conexión');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">Configuración del negocio</h1>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5" /> {success}
        </div>
      )}

      {/* Business Image */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Imagen del negocio</h2>
        <div className="flex items-center gap-6">
          {imagePreview ? (
            <img src={imagePreview} alt="Logo" className="w-24 h-24 rounded-lg object-cover border" />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium">
              <Upload className="w-4 h-4" /> Cambiar imagen
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
            </label>
            <p className="text-xs text-gray-500 mt-2">JPG, PNG o WebP. Máximo 2MB.</p>
          </div>
        </div>
      </div>

      {/* Color Palette */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Paleta de colores</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {palettes.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPalette(p.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                selectedPalette === p.id ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex gap-1">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: p.primary }} />
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: p.sidebarBg }} />
              </div>
              <span className="text-sm font-medium">{p.name}</span>
              {selectedPalette === p.id && <Check className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
};

export default Configuracion;
