import React, { useEffect, useRef, useState } from 'react';
import { Aviso } from '../components/Aviso';
import { Link } from 'react-router-dom';
import { UserPlus, Store, Image, Palette, Grid3X3, BookOpen, Check, ArrowRight, ArrowLeft, Plus, X, Upload, Mail, ExternalLink } from 'lucide-react';
import { palettes } from '../config/palettes';
import { apiService } from '../services/api';
import { appConfig } from '../config/app-config';
import { isLocalHost, isValidSlug, setDevTenantSlug, tenantHostLabel } from '../config/tenant-host';

interface PlatilloItem {
  nombre: string;
  precio: number;
}

const STEPS = 6;
// Política de contraseñas por defecto de Zitadel: 8+ caracteres con mayúscula, minúscula, número y símbolo.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;
const PASSWORD_HINT = 'Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo';

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Paso 1: cuenta del administrador
  const [admin, setAdmin] = useState({ nombre: '', apellido: '', email: '', password: '', confirm: '' });

  // Paso 2: negocio
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const slugTimer = useRef<number | null>(null);

  // Paso 3: imagen
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Paso 4: paleta
  const [selectedPalette, setSelectedPalette] = useState('orange');

  // Paso 5: mesas
  const [numMesas, setNumMesas] = useState(5);

  // Paso 6: catálogo
  const [platillos, setPlatillos] = useState<PlatilloItem[]>([]);
  const [guisos, setGuisos] = useState<string[]>([]);
  const [newPlatillo, setNewPlatillo] = useState({ nombre: '', precio: 0 });
  const [newGuiso, setNewGuiso] = useState('');

  // Resultado
  const [result, setResult] = useState<{ slug: string; url: string; email: string } | null>(null);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

  const handleNameChange = (value: string) => {
    setNombre(value);
    setSlug(generateSlug(value));
  };

  useEffect(() => {
    if (slugTimer.current) window.clearTimeout(slugTimer.current);
    if (!isValidSlug(slug)) {
      setSlugAvailable(slug.length >= 3 ? false : null);
      return;
    }
    setSlugChecking(true);
    slugTimer.current = window.setTimeout(async () => {
      const res = await apiService.checkSlug(slug);
      setSlugAvailable(res.success ? Boolean(res.data?.available) : null);
      setSlugChecking(false);
    }, 350);
    return () => {
      if (slugTimer.current) window.clearTimeout(slugTimer.current);
    };
  }, [slug]);

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

  const passwordError = (): string | null => {
    if (!admin.password) return null;
    if (!PASSWORD_RULE.test(admin.password)) return PASSWORD_HINT;
    if (admin.confirm && admin.confirm !== admin.password) return 'Las contraseñas no coinciden';
    return null;
  };

  const accountValid =
    admin.nombre.trim().length > 0 &&
    admin.apellido.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email.trim()) &&
    PASSWORD_RULE.test(admin.password) &&
    admin.confirm === admin.password;

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    try {
      let imagenUrl: string | null = null;
      if (imageFile) {
        const up = await apiService.uploadOnboardingImage(imageFile);
        if (!up.success) {
          setError(up.error || 'No se pudo subir la imagen');
          setLoading(false);
          return;
        }
        imagenUrl = up.data?.url ?? null;
      }

      const res = await apiService.completeOnboarding({
        admin: { nombre: admin.nombre.trim(), apellido: admin.apellido.trim(), email: admin.email.trim(), password: admin.password },
        nombre: nombre.trim(),
        slug,
        paleta: selectedPalette,
        imagen: imagenUrl,
        mesas: Array.from({ length: numMesas }, (_, i) => ({ nombre: `Mesa ${i + 1}` })),
        platillos,
        guisos: guisos.map((g) => ({ nombre: g })),
      });

      if (res.success && res.data) {
        if (isLocalHost()) setDevTenantSlug(res.data.tenant.slug);
        setResult({ slug: res.data.tenant.slug, url: res.data.url, email: admin.email.trim() });
      } else {
        setError(res.error || 'Error al completar el registro');
        if (res.code === 'SLUG_TAKEN' || res.code === 'NEGOCIO_DUPLICADO') setStep(2);
        if (res.code === 'EMAIL_DUPLICADO' || res.code === 'PASSWORD_POLICY') setStep(1);
      }
    } catch {
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
      case 1:
        return accountValid;
      case 2:
        return nombre.trim().length >= 2 && isValidSlug(slug) && slugAvailable === true && !slugChecking;
      case 3:
      case 4:
        return true;
      case 5:
        return numMesas > 0;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const inputCls = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent';

  if (result) {
    const localUrl = `${window.location.origin}/login`;
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-pantalla font-bold text-gray-900 mb-2">¡Tu restaurante está listo!</h1>
          <p className="text-gray-600 mb-4">
            La dirección de <strong>{nombre}</strong> es{' '}
            <span className="font-mono font-bold text-orange-600">{tenantHostLabel(result.slug)}</span>
          </p>
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-cuerpo text-left flex gap-2 mb-6">
            <Mail className="w-5 h-5 flex-shrink-0" />
            <span>
              Enviamos un correo a <strong>{result.email}</strong> para verificar tu cuenta. Revísalo antes de iniciar sesión.
            </span>
          </div>
          <a
            href={isLocalHost() ? localUrl : `${result.url}/login`}
            className="w-full inline-flex items-center justify-center gap-2 bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700"
          >
            Ir a mi restaurante <ExternalLink className="w-4 h-4" />
          </a>
          {isLocalHost() && (
            <p className="text-meta text-gray-400 mt-3">
              Entorno local: se guardó <code>devTenantSlug={result.slug}</code> para este navegador.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        {/* Progreso */}
        <div className="flex items-center justify-between mb-8">
          {Array.from({ length: STEPS }, (_, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-cuerpo font-bold ${
                  i + 1 < step ? 'bg-green-500 text-white' : i + 1 === step ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1 < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS - 1 && <div className={`w-6 h-1 mx-1 ${i + 1 < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <Aviso error={error} />

        {/* Paso 1: cuenta */}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-6 h-6 text-orange-500" />
              <h2 className="text-titulo font-bold">Tu cuenta</h2>
            </div>
            <p className="text-gray-500 text-cuerpo mb-4">Serás el administrador del restaurante en {appConfig.brandName}.</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="text" value={admin.nombre} onChange={(e) => setAdmin({ ...admin, nombre: e.target.value })} className={inputCls} placeholder="Nombre" autoComplete="given-name" />
              <input type="text" value={admin.apellido} onChange={(e) => setAdmin({ ...admin, apellido: e.target.value })} className={inputCls} placeholder="Apellido" autoComplete="family-name" />
            </div>
            <input type="email" value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} className={`${inputCls} mb-3`} placeholder="Correo electrónico" autoComplete="email" />
            <input type="password" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} className={`${inputCls} mb-3`} placeholder="Contraseña" autoComplete="new-password" />
            <input type="password" value={admin.confirm} onChange={(e) => setAdmin({ ...admin, confirm: e.target.value })} className={inputCls} placeholder="Confirmar contraseña" autoComplete="new-password" />
            <p className={`text-meta mt-2 ${passwordError() ? 'text-red-600' : 'text-gray-400'}`}>{passwordError() ?? PASSWORD_HINT}</p>
            <p className="text-meta text-gray-400 mt-3">
              ¿Ya tienes restaurante?{' '}
              <Link to="/login" className="text-orange-600 hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        )}

        {/* Paso 2: negocio */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Store className="w-6 h-6 text-orange-500" />
              <h2 className="text-titulo font-bold">¿Cómo se llama tu negocio?</h2>
            </div>
            <input
              type="text"
              value={nombre}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`${inputCls} mb-3`}
              placeholder="Ej: Gorditas El Sazón, Taquería Don Pepe, Fonda La Abuela"
            />
            {slug.length >= 3 && (
              <div className="text-cuerpo mb-2">
                <span className="text-gray-500">Tu dirección: </span>
                <span className="font-mono font-bold text-orange-600">{tenantHostLabel(slug)}</span>
                {slugChecking && <span className="ml-2 text-gray-400">verificando...</span>}
                {!slugChecking && slugAvailable === true && <span className="ml-2 text-green-600">✅ Disponible</span>}
                {!slugChecking && slugAvailable === false && <span className="ml-2 text-red-600">❌ No disponible</span>}
              </div>
            )}
          </div>
        )}

        {/* Paso 3: imagen */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-6 h-6 text-orange-500" />
              <h2 className="text-titulo font-bold">Imagen de tu negocio</h2>
            </div>
            <p className="text-gray-500 text-cuerpo mb-4">Sube el logo o una foto de tu local (opcional)</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {imagePreview ? (
                <div>
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg mx-auto mb-3" />
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="text-cuerpo text-red-500"
                  >
                    Quitar imagen
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Click para subir imagen</p>
                  <p className="text-meta text-gray-400">JPG, PNG o WebP (max 2MB)</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Paso 4: paleta */}
        {step === 4 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-6 h-6 text-orange-500" />
              <h2 className="text-titulo font-bold">Elige tu paleta de colores</h2>
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
                  <span className="text-cuerpo font-medium">{p.name}</span>
                  {selectedPalette === p.id && <Check className="w-4 h-4 text-orange-500 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paso 5: mesas */}
        {step === 5 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Grid3X3 className="w-6 h-6 text-orange-500" />
              <h2 className="text-titulo font-bold">¿Cuántas mesas tienes?</h2>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <input type="range" min="1" max="30" value={numMesas} onChange={(e) => setNumMesas(parseInt(e.target.value))} className="flex-1" />
              <span className="text-pantalla font-bold text-orange-600 w-12 text-center">{numMesas}</span>
            </div>
            <p className="text-cuerpo text-gray-500">Se crearán {numMesas} mesas automáticamente (Mesa 1, Mesa 2...). Puedes agregar más después en Catálogos.</p>
            <p className="text-meta text-gray-400 mt-2">💡 Tip: También se agrega automáticamente la opción "Nuevo pedido" para órdenes para llevar.</p>
          </div>
        )}

        {/* Paso 6: catálogo */}
        {step === 6 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-6 h-6 text-orange-500" />
              <h2 className="text-titulo font-bold">Catálogo rápido</h2>
            </div>
            <p className="text-gray-500 text-cuerpo mb-3">Agrega algunos platillos y guisos para empezar (opcional)</p>

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
                  setGuisos(['Chicharrón prensado', 'Rajas con queso', 'Picadillo', 'Mole verde', 'Frijoles con queso', 'Deshebrada', 'Papas con chorizo']);
                }}
                className="btn w-full mb-4 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                📋 Cargar ejemplos de gorditas (puedes editarlos después)
              </button>
            )}

            <div className="mb-4">
              <label className="text-cuerpo font-medium text-gray-700 mb-1 block">Platillos</label>
              <div className="flex gap-2 mb-2">
                <input type="text" placeholder="Ej: Gordita de chicharrón" value={newPlatillo.nombre} onChange={(e) => setNewPlatillo({ ...newPlatillo, nombre: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg text-cuerpo" />
                <input type="number" placeholder="$25" value={newPlatillo.precio || ''} onChange={(e) => setNewPlatillo({ ...newPlatillo, precio: parseInt(e.target.value) || 0 })} className="w-20 px-3 py-2 border rounded-lg text-cuerpo" />
                <button onClick={addPlatillo} className="btn bg-orange-500 text-white" aria-label="Agregar platillo">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {platillos.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-cuerpo bg-gray-50 px-3 py-1.5 rounded mb-1">
                  <span>{p.nombre}</span>
                  <span className="flex items-center gap-2">
                    ${p.precio}{' '}
                    <button onClick={() => setPlatillos(platillos.filter((_, j) => j !== i))} aria-label="Quitar platillo">
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </span>
                </div>
              ))}
            </div>

            <div>
              <label className="text-cuerpo font-medium text-gray-700 mb-1 block">Guisos</label>
              <div className="flex gap-2 mb-2">
                <input type="text" placeholder="Ej: Chicharrón prensado" value={newGuiso} onChange={(e) => setNewGuiso(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-cuerpo" />
                <button onClick={addGuiso} className="btn bg-orange-500 text-white" aria-label="Agregar guiso">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {guisos.map((g, i) => (
                <div key={i} className="flex justify-between items-center text-cuerpo bg-gray-50 px-3 py-1.5 rounded mb-1">
                  <span>{g}</span>
                  <button onClick={() => setGuisos(guisos.filter((_, j) => j !== i))} aria-label="Quitar guiso">
                    <X className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navegación */}
        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="btn gap-1 text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>
          ) : (
            <div />
          )}

          {step < STEPS ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="btn gap-1 bg-orange-500 text-white hover:bg-orange-600"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="btn gap-1 bg-green-600 text-white hover:bg-green-700"
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
