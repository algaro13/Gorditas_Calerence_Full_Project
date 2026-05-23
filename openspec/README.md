# Gorditas Calerence — Arquitectura del Proyecto

## Resumen

Sistema de gestión para un restaurante de gorditas ("Gorditas Calerence"). Cubre el ciclo completo de operación: toma de órdenes, preparación, despacho, cobro, inventario y reportes.

## Stack Tecnológico

### Backend (`Gorditas_Calerence_Backend/`)

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18 (Alpine) |
| Framework | Express.js 4.18 |
| Lenguaje | TypeScript 5.3 |
| Base de datos | MongoDB 8.0 (Mongoose 8 ODM) |
| Autenticación | JWT + bcryptjs |
| Validación | Joi 17 |
| Seguridad | Helmet, CORS |
| Reportes | ExcelJS |

**Rutas API:**
- `/api/auth` — Login, registro, perfil
- `/api/ordenes` — CRUD de órdenes y subórdenes
- `/api/inventario` — Gestión de productos y stock
- `/api/reportes` — Generación de reportes (Excel)
- `/api/catalogos` — Catálogos (guisos, platillos, extras, mesas, tipos)

**Modelos principales (18 modelos Mongoose):**
- Orden, Suborden, OrdenDetalleProducto, OrdenDetallePlatillo, OrdenDetalleExtra
- Guiso, Producto, Platillo, Extra, Mesa, Usuario, Gasto
- Catálogos "Tipo": TipoProducto, TipoPlatillo, TipoExtra, TipoOrden, TipoUsuario, TipoGasto

### Frontend (`Gorditas_frontend/project/`)

| Capa | Tecnología |
|------|-----------|
| Framework | React 18.3 |
| Lenguaje | TypeScript 5.5 |
| Build | Vite 5.4 |
| Estilos | Tailwind CSS 3.4 |
| Routing | react-router-dom 7.8 |
| Iconos | lucide-react |
| Estado | React Context API |

**Páginas (11):**
- Login, Dashboard, NuevaOrden, EditarOrden, SurtirOrden
- Despachar, RecibirProducto, Cobrar, Catalogos, Reportes, Inventario

**Roles de usuario:**
- Admin, Encargado, Mesero, Despachador, Cocinero
- Cada rol tiene acceso restringido a ciertas páginas

### Infraestructura (`docker-compose.yaml`)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  calerence_front│     │  calerence_back  │     │     mongo       │
│  (Nginx + SPA)  │────▶│  (Express API)   │────▶│  (MongoDB 8.0)  │
│  Puerto: 5173   │     │  Puerto: 5000    │     │  Puerto: 27017  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                   │ mongo_data vol │
```

- **3 servicios** Docker con `restart: unless-stopped`
- Imágenes publicadas en Docker Hub (`desarollonerualmane/`)
- Volumen persistente para datos de MongoDB

## Patrones de Arquitectura

- **Monorepo** con carpetas separadas para backend y frontend
- **REST API** con autenticación JWT y control de acceso por roles
- **Esquema MongoDB desnormalizado** (almacena nombres junto a IDs para rendimiento)
- **Ciclo de vida de órdenes:** Recepción → Surtir → Despachar → Cobrar
- **Multi-stage Docker build** en frontend (Node build → Nginx serve)
- **SPA routing** con Nginx fallback a `index.html`

## Variables de Entorno Clave

| Variable | Servicio | Descripción |
|----------|----------|-------------|
| `PORT` | Backend | Puerto del servidor Express (5000) |
| `MONGODB_URI` | Backend | URI de conexión a MongoDB |
| `JWT_SECRET` | Backend | Secreto para firmar tokens JWT |
| `VITE_API_URL` | Frontend | URL base del API backend |

## Comandos de Desarrollo

```bash
# Backend
cd Gorditas_Calerence_Backend
npm install
npm run dev          # ts-node-dev con hot reload

# Frontend
cd Gorditas_frontend/project
npm install
npm run dev          # Vite dev server

# Docker (todo junto)
docker-compose up -d
```

## Notas para el Agente

- El backend auto-crea un usuario admin (`Encargado@gorditas.com` / `encargado123`) al iniciar.
- Los modelos usan un patrón de "Tipo" + "Entidad" (ej: TipoPlatillo → Platillo).
- Las órdenes tienen subórdenes, y cada suborden tiene detalles (productos, platillos, extras).
- El frontend no usa librería de estado global — solo Context API para auth.
- No hay tests configurados actualmente en ninguno de los dos proyectos.
