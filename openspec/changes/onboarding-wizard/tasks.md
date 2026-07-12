## 1. Backend — Upload de imágenes

- [ ] 1.1 Instalar `multer` y `@types/multer` para manejar uploads
- [ ] 1.2 Crear carpeta `uploads/` en la raíz del backend y agregar a `.gitignore`
- [ ] 1.3 Crear `src/routes/onboarding.ts` con endpoint `POST /api/onboarding/upload-image` que reciba multipart/form-data y guarde en `uploads/{slug}/`
- [ ] 1.4 Configurar Express para servir archivos estáticos de `uploads/` en `/uploads`

## 2. Backend — Endpoint de onboarding completo

- [ ] 2.1 Crear endpoint `POST /api/onboarding/complete` que reciba: nombre, slug, paleta, mesas[], platillos[], guisos[]
- [ ] 2.2 Implementar lógica: validar slug → crear tenant → provisionar DB → crear mesas → crear catálogo → vincular usuario
- [ ] 2.3 Retornar URL del subdominio y datos del tenant creado

## 3. Frontend — Sistema de paletas CSS

- [ ] 3.1 Crear `src/config/palettes.ts` con las 7 paletas (naranja, rojo, verde, azul, morado, café, oscuro) definidas como CSS variables
- [ ] 3.2 Crear hook `useTheme()` que lee la paleta del tenant y aplica las CSS variables al document
- [ ] 3.3 Integrar `useTheme()` en el Layout para que se aplique al cargar la app

## 4. Frontend — Wizard de onboarding

- [ ] 4.1 Crear `src/pages/Onboarding.tsx` con estructura de wizard multi-paso (indicador de progreso, navegación prev/next)
- [ ] 4.2 Implementar Step 1: nombre del negocio + slug con validación en tiempo real y preview del subdominio
- [ ] 4.3 Implementar Step 2: upload de imagen con drag & drop, preview y validación de tamaño/formato
- [ ] 4.4 Implementar Step 3: selección de paleta con preview visual en vivo
- [ ] 4.5 Implementar Step 4: configuración de mesas (input numérico o slider)
- [ ] 4.6 Implementar Step 5: catálogo rápido (agregar platillos nombre+precio, guisos nombre) con opción skip
- [ ] 4.7 Implementar paso final: botón "Completar" que envía todo al backend y redirige

## 5. Frontend — Detección de usuario sin tenant

- [ ] 5.1 Modificar AuthContext para detectar si el usuario tiene tenant asignado (consultar `/api/tenants/me`)
- [ ] 5.2 Si no tiene tenant → redirigir automáticamente a `/onboarding`
- [ ] 5.3 Agregar ruta `/onboarding` al router en App.tsx

## 6. Frontend — Imagen en el header

- [ ] 6.1 Modificar el componente Header/Sidebar para mostrar la imagen del negocio si está configurada en el tenant
- [ ] 6.2 Fallback al ícono de chef hat si no hay imagen configurada

## 7. Verificación

- [ ] 7.1 Verificar flujo completo: nuevo usuario → onboarding → 5 pasos → tenant creado → sistema funcional
- [ ] 7.2 Verificar upload de imagen (se sube, se almacena, se muestra)
- [ ] 7.3 Verificar paleta se aplica correctamente al elegirla
- [ ] 7.4 Verificar que mesas y catálogo se crean correctamente
- [ ] 7.5 Verificar que el proyecto compila sin errores
