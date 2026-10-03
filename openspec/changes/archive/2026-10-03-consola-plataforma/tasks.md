## 1. Acceso

- [x] 1.1 Rol «Plataforma» en el bootstrap y `scripts/crear-operador.ts`
- [x] 1.2 `authenticate` reconoce al operador (rol y organización de la plataforma)
- [x] 1.3 Middleware `soloPlataforma`

## 2. Backend

- [x] 2.1 Dominio: situación de cada restaurante, días sin uso, tramos de actividad, ingreso y conversión
- [x] 2.2 Lectura por restaurante (usuarios activos, último acceso, última orden, órdenes de 30 días)
- [x] 2.3 Migración `0009_bitacora_plataforma`
- [x] 2.4 `GET /api/plataforma/acceso` y `GET /api/plataforma/resumen`
- [x] 2.5 Pruebas unitarias y e2e (incluido el 403)

## 3. Frontend

- [x] 3.1 Pantalla `/plataforma`: entrar como operador, números, lista con filtros
- [x] 3.2 El regreso del inicio de sesión vuelve a `/plataforma`

## 4. Verificación

- [x] 4.1 Local: operador de prueba ve datos reales; un Admin de restaurante no entra
- [x] 4.2 Suites en verde

## 5. Cierre

- [x] 5.1 Commit y `openspec archive`
