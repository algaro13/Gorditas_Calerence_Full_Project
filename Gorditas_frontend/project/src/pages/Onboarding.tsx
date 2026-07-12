import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Store, Image, Palette, Grid3X3, BookOpen, Check, ArrowRight, ArrowLeft, Plus, X, Upload } from 'lucide-react';
import { palettes, applyPalette, getPalette } from '../config/palettes';

interface PlatilloItem {
  nombre: string;
  precio: number;
}

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Business info
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);

  // Step 2: Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Step 3: Palette
  const [selectedPalette, setSelectedPalette] = useState('orange');

  // Step 4: Mesas
  const [numMesas, setNumMesas] = useState(5);

  // Step 5: Catalog
  const [platillos, setPlatillos] = useState<PlatilloItem[]>([]);
  const [guisos, setGuisos] = useState<string[]>([]);
  const [newPlatillo, setNewPlatillo] = useState({ nombre: '', precio: 0 });
  const [newGuiso, setNewGuiso] = useState('');

  const totalSteps = 5;

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  };

  const handleNameChange = (value: string) => {
    setNombre(value);
    const newSlug = generateSlug(value);
    setSlug(newSlug);
    if (newSlug.length >= 3) checkSlug(newSlug);
  };

  const checkSlug = async (s: string) => {
    setSlugChecking(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tenants/check-slug/${s}`);
      const data = await res.json();
      setSlugAvailable(data.data?.available ?? null);
    } catch {
      setSlugAvailable(null);
    }
    setSlugChecking(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('La imagen no debe exceder 2MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('msalToken') || localStorage.getItem('token');

      // Upload image if selected
      let imagenUrl = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('slug', slug);

        const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/onboarding/upload-image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          imagenUrl = uploadData.data.url;
        }
      }

      // Complete onboarding
      const mesasArray = Array.from({ length: numMesas }, (_, i) => ({ nombre: `Mesa ${i + 1}` }));

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre,
          slug,
          paleta: selectedPalette,
          imagen: imagenUrl,
          mesas: mesasArray,
          platillos,
          guisos: guisos.map(g => ({ nombre: g })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Apply palette
        applyPalette(getPalette(selectedPalette));
        // Redirect to dashboard
        navigate('/');
        window.location.reload();
      } else {
        setError(data.message || 'Error al completar el registro');
      }
    } catch (err: any) {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  const addPlatillo = () => {
    if (newPlatillo.nombre && newPlatillo.precio > 0) {
      setPlatillos([...platillos, { ...newPlatillo }]);
      setNewPlatillo({ nombre: '', precio: 0 });
    }
  };

  const addGuiso = () => {
    if (newGuiso.trim()) {
      setGuisos([...guisos, newGuiso.trim()]);
      setNewGuiso('');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return nombre.length > 0 && slug.length >= 3 && slugAvailable === true;
      case 2: return true; // Image is optional
      case 3: return true; // Palette always selected
      case 4: return numMesas > 0;
      case 5: return true; // Catalog is optional
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i + 1 < step ? 'bg-green-500 text-white' :
                i + 1 === step ? 'bg-orange-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {i + 1 < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div className={`w-8 h-1 mx-1 ${i + 1 < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {/* Step 1: Business Name */}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Store className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold">¿Cómo se llama tu negocio?</h2>
            </div>
            <input
              type="text"
              value={nombre}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Ej: Gorditas El Sazón, Taquería Don Pepe, Fonda La Abuela"
            />
            {slug.length >= 3 && (
              <div className="text-sm mb-2">
                <span className="text-gray-500">Tu dirección: </span>
                <span className="font-mono font-bold text-orange-600">pos-{slug}.kustodela.com</span>
                {slugChecking && <span className="ml-2 text-gray-400">verificando...</span>}
                {!slugChecking && slugAvailable === true && <span className="ml-2 text-green-600">✅ Disponible</span>}
                {!slugChecking && slugAvailable === false && <span className="ml-2 text-red-600">❌ No disponible</span>}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Image */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold">Imagen de tu negocio</h2>
            </div>
            <p className="text-gray-500 text-sm mb-4">Sube el logo o una foto de tu local (opcional)</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {imagePreview ? (
                <div>
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg mx-auto mb-3" />
                  <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-sm text-red-500">Quitar imagen</button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Click para subir imagen</p>
                  <p className="text-xs text-gray-400">JPG, PNG o WebP (max 2MB)</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Palette */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold">Elige tu paleta de colores</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {palettes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPalette(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    selectedPalette === p.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex gap-1">
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: p.primary }} />
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: p.sidebarBg }} />
                  </div>
                  <span className="text-sm font-medium">{p.name}</span>
                  {selectedPalette === p.id && <Check className="w-4 h-4 text-orange-500 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Mesas */}
        {step === 4 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Grid3X3 className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold">¿Cuántas mesas tienes?</h2>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="range"
                min="1"
                max="30"
                value={numMesas}
                onChange={(e) => setNumMesas(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-2xl font-bold text-orange-600 w-12 text-center">{numMesas}</span>
            </div>
            <p className="text-sm text-gray-500">Se crearán {numMesas} mesas automáticamente (Mesa 1, Mesa 2...). Puedes agregar más después en Catálogos.</p>
            <p className="text-xs text-gray-400 mt-2">💡 Tip: También se agrega automáticamente la opción "Nuevo pedido" para órdenes para llevar.</p>
          </div>
        )}

        {/* Step 5: Catalog */}
        {step === 5 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold">Catálogo rápido</h2>
            </div>
            <p className="text-gray-500 text-sm mb-3">Agrega algunos platillos y guisos para empezar (opcional)</p>

            {/* Load examples button */}
            {platillos.length === 0 && guisos.length === 0 && (
              <button
                onClick={() => {
                  setPlatillos([
                    { nombre: 'Gordita de chicharrón', precio: 25 },
                    { nombre: 'Gordita de rajas con queso', precio: 30 },
                    { nombre: 'Gordita de picadillo', precio: 28 },
                    { nombre: 'Quesadilla', precio: 20 },
                    { nombre: 'Taco dorado', precio: 15 },
                  ]);
                  setGuisos([
                    'Chicharrón prensado', 'Rajas con queso', 'Picadillo',
                    'Mole verde', 'Frijoles con queso', 'Deshebrada', 'Papas con chorizo'
                  ]);
                }}
                className="w-full mb-4 py-2 px-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                📋 Cargar ejemplos de gorditas (puedes editarlos después)
              </button>
            )}

            {/* Platillos */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Platillos</label>
              <div className="flex gap-2 mb-2">
                <input type="text" placeholder="Ej: Gordita de chicharrón" value={newPlatillo.nombre} onChange={(e) => setNewPlatillo({ ...newPlatillo, nombre: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                <input type="number" placeholder="$25" value={newPlatillo.precio || ''} onChange={(e) => setNewPlatillo({ ...newPlatillo, precio: parseInt(e.target.value) || 0 })} className="w-20 px-3 py-2 border rounded-lg text-sm" />
                <button onClick={addPlatillo} className="p-2 bg-orange-500 text-white rounded-lg"><Plus className="w-4 h-4" /></button>
              </div>
              {platillos.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-sm bg-gray-50 px-3 py-1.5 rounded mb-1">
                  <span>{p.nombre}</span>
                  <span className="flex items-center gap-2">${p.precio} <button onClick={() => setPlatillos(platillos.filter((_, j) => j !== i))}><X className="w-3 h-3 text-red-500" /></button></span>
                </div>
              ))}
            </div>

            {/* Guisos */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Guisos</label>
              <div className="flex gap-2 mb-2">
                <input type="text" placeholder="Ej: Chicharrón prensado" value={newGuiso} onChange={(e) => setNewGuiso(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                <button onClick={addGuiso} className="p-2 bg-orange-500 text-white rounded-lg"><Plus className="w-4 h-4" /></button>
              </div>
              {guisos.map((g, i) => (
                <div key={i} className="flex justify-between items-center text-sm bg-gray-50 px-3 py-1.5 rounded mb-1">
                  <span>{g}</span>
                  <button onClick={() => setGuisos(guisos.filter((_, j) => j !== i))}><X className="w-3 h-3 text-red-500" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>
          ) : <div />}

          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="flex items-center gap-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Completar'} <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
