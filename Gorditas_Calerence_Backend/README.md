# Restaurant API

API REST para gestión de restaurante desarrollada con Node.js, Express, TypeScript y MongoDB.

## 🚀 Características

- **Gestión completa de restaurante**: Órdenes, inventario, catálogos y reportes
- **Autenticación JWT**: Sistema de autenticación seguro con roles
- **Base de datos MongoDB**: Usando Mongoose para modelado de datos
- **TypeScript**: Tipado estático para mayor robustez
- **Arquitectura modular**: Código organizado y mantenible
- **Validaciones**: Usando Joi para validación de datos
- **Seguridad**: Helmet, CORS y manejo de errores

## 📋 Requisitos

- Node.js 18+
- MongoDB 4.4+
- npm o yarn

## 🛠️ Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd restaurant-api
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

4. Editar el archivo `.env` con tus configuraciones:
```env
MONGODB_URI=mongodb://localhost:27017/mi_tienda_gorditas
JWT_SECRET=tu-jwt-secret-muy-seguro
PORT=5000
```

5. Construir el proyecto:
```bash
npm run build
```

6. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

## 📁 Estructura del Proyecto

```
src/
├── config/          # Configuración (database, app-settings)
├── controllers/     # Controladores HTTP (parsean request, formatean response)
├── services/        # Lógica de negocio y orquestación
├── repositories/    # Acceso a datos (Mongoose queries)
├── domain/          # Reglas de negocio puras (sin dependencias externas)
├── interfaces/      # Contratos TypeScript entre capas
├── middleware/      # Middlewares (auth, validación, errores)
├── models/          # Modelos de MongoDB (Mongoose schemas)
├── routes/          # Definición de rutas (solo routing + middleware)
├── types/           # Tipos TypeScript compartidos
├── utils/           # Utilidades y helpers
├── composition-root.ts  # Wiring de dependencias
└── server.ts        # Punto de entrada
```

### Arquitectura por capas

```
Routes → Controllers → Services → Repositories → MongoDB
                          ↓
                       Domain (reglas puras)
```

- **Routes**: Solo definen endpoints y aplican middleware
- **Controllers**: Extraen datos del request, delegan al service, formatean response HTTP
- **Services**: Contienen la lógica de negocio, reciben repositories por constructor
- **Repositories**: Abstraen las queries de Mongoose, implementan interfaces
- **Domain**: Funciones puras sin dependencias (transiciones de estatus, cálculos)

### Configuración

La app usa `appsettings.json` como fuente de configuración centralizada. Las variables de entorno sobreescriben los valores del archivo:

| Variable de entorno | Sección en appsettings.json | Descripción |
|---------------------|----------------------------|-------------|
| `MONGODB_URI` | `database.uri` | URI de MongoDB |
| `JWT_SECRET` | `jwt.secret` | Secreto para JWT |
| `JWT_EXPIRES_IN` | `jwt.expiresIn` | Duración del token (ej: "7d") |
| `PORT` | `server.port` | Puerto del servidor |

## 🔗 API Endpoints

### Autenticación
- `POST /api/v1/auth/login` - Iniciar sesión
- `GET /api/v1/auth/profile` - Obtener perfil del usuario

### Órdenes
- `GET /api/v1/ordenes` - Listar órdenes
- `POST /api/v1/ordenes/nueva` - Crear nueva orden
- `POST /api/v1/ordenes/:id/suborden` - Agregar suborden
- `POST /api/v1/ordenes/suborden/:id/platillo` - Agregar platillo
- `POST /api/v1/ordenes/:id/producto` - Agregar producto
- `PUT /api/v1/ordenes/:id/estatus` - Cambiar estatus

### Inventario
- `GET /api/v1/inventario` - Consultar inventario
- `POST /api/v1/inventario/recibir` - Recibir productos
- `PUT /api/v1/inventario/ajustar/:id` - Ajustar inventario

### Reportes
- `GET /api/v1/reportes/ventas` - Reporte de ventas
- `GET /api/v1/reportes/inventario` - Reporte de inventario
- `GET /api/v1/reportes/gastos` - Reporte de gastos
- `GET /api/v1/reportes/productos-vendidos` - Productos más vendidos

### Catálogos (CRUD)
- `GET /api/v1/catalogos/{modelo}` - Listar
- `POST /api/v1/catalogos/{modelo}` - Crear
- `PUT /api/v1/catalogos/{modelo}/:id` - Actualizar
- `DELETE /api/v1/catalogos/{modelo}/:id` - Eliminar

**Modelos disponibles**: `guiso`, `tipoproducto`, `producto`, `tipoplatillo`, `platillo`, `tipousuario`, `usuario`, `tipoorden`, `mesa`, `tipogasto`

## 🔒 Roles y Permisos

### Admin
- Acceso completo a todas las funcionalidades

### Encargado
- Gestión de catálogos, inventario y reportes
- No puede eliminar registros críticos

### Mesero
- Crear y editar órdenes en estatus "Recepcion"

### Despachador
- Surtir órdenes y marcar productos como entregados

### Cocinero
- Ver órdenes en preparación

## 📊 Modelos de Datos

### Catálogos Maestros
- **Guisos**: Tipos de guisos disponibles
- **TipoProducto**: Categorías de productos
- **Productos**: Inventario de productos
- **TipoPlatillo**: Tipos de platillos
- **Platillos**: Platillos del menú
- **TipoUsuario**: Roles de usuarios
- **Usuarios**: Usuarios del sistema
- **TipoOrden**: Tipos de orden (mesa, para llevar, etc.)
- **Mesas**: Mesas del restaurante
- **TipoGasto**: Categorías de gastos

### Transaccionales
- **Ordenes**: Órdenes principales
- **Subordenes**: Subórdenes para organizar platillos
- **OrdenDetalleProducto**: Productos en órdenes
- **OrdenDetallePlatillo**: Platillos en subórdenes
- **Gastos**: Registro de gastos

## 🧪 Testing

```bash
npm test
```

## 🗄️ Migraciones de Base de Datos

El proyecto usa `migrate-mongo` para controlar cambios al schema de MongoDB.

### ¿Cuándo crear una migración?

- Cuando agregas un campo nuevo a documentos existentes y necesitas un valor default
- Cuando renombras un campo
- Cuando cambias el tipo de dato de un campo
- Cuando necesitas crear o eliminar índices
- Cuando mueves datos entre colecciones

**NO necesitas migración** si solo agregas un campo nuevo al schema de Mongoose sin afectar documentos existentes.

### Comandos

```bash
# Ver estado de migraciones (cuáles están aplicadas/pendientes)
npm run migrate:status

# Aplicar todas las migraciones pendientes
npm run migrate:up

# Revertir la última migración
npm run migrate:down

# Crear una nueva migración
npm run migrate:create -- "descripcion-del-cambio"
```

### Convención de nombres

Formato: `YYYYMMDD-descripcion-kebab-case.js`

Ejemplos:
- `20260523-baseline.js`
- `20260601-agregar-telefono-a-usuarios.js`
- `20260615-renombrar-campo-fecha.js`

### Ejemplo de migración

```javascript
module.exports = {
  async up(db) {
    await db.collection('usuarios').updateMany(
      { telefono: { $exists: false } },
      { $set: { telefono: '' } }
    );
  },

  async down(db) {
    await db.collection('usuarios').updateMany(
      {},
      { $unset: { telefono: '' } }
    );
  },
};
```

### Auto-migración al startup

Se puede habilitar en `appsettings.json`:

```json
{
  "database": {
    "runMigrationsOnStart": true
  }
}
```

⚠️ **Recomendación**: Mantener en `false` para producción. Ejecutar migraciones manualmente antes del deploy.

## 📝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para más detalles.

## 🤝 Soporte

Para soporte, envía un email a [tu-email@ejemplo.com] o crea un issue en GitHub.