## 1. Capa de ergonomía

- [ ] 1.1 Capa en `src/index.css` para pantallas de teléfono, no por componente
- [ ] 1.2 Altura mínima de 44px en botones, enlaces-botón, inputs, selects y textarea
- [ ] 1.3 Casillas y radios a 24px de caja con área táctil de 44px
- [ ] 1.4 Texto de interfaz nunca por debajo de 16px en teléfono
- [ ] 1.5 Campos de formulario a 16px, para que iOS no haga zoom al enfocar

## 2. Riesgo de borrado

- [ ] 2.1 Reducir cantidad deja de eliminar el platillo al llegar a 1
- [ ] 2.2 Eliminar es una acción aparte y reconocible

## 3. Verificación medida

- [ ] 3.1 NuevaOrden a 375px: ningún control bajo 44px en los tres pasos
- [ ] 3.2 Ninguna fuente bajo 16px en el flujo de órdenes
- [ ] 3.3 Ningún par de objetivos a menos de 8px
- [ ] 3.4 Comprobar que no se rompe el diseño en escritorio
- [ ] 3.5 Regresión: `tsc -p tsconfig.app.json` sin errores nuevos

## 4. Cierre

- [ ] 4.1 Commit y `openspec archive`
