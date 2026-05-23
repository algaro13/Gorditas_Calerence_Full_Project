import { appSettings } from './config/app-settings';

// Repositories
import { OrdenRepository } from './repositories/orden.repository';
import { ProductoRepository } from './repositories/producto.repository';
import { UsuarioRepository } from './repositories/usuario.repository';
import { CatalogoRepository, GastoRepository } from './repositories/catalogo.repository';

// Services
import { AuthService } from './services/auth.service';
import { OrdenesService } from './services/ordenes.service';
import { InventarioService } from './services/inventario.service';
import { ReportesService } from './services/reportes.service';
import { CatalogosService } from './services/catalogos.service';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { OrdenesController } from './controllers/ordenes.controller';
import { InventarioController } from './controllers/inventario.controller';
import { ReportesController } from './controllers/reportes.controller';
import { CatalogosController } from './controllers/catalogos.controller';

// ─── Instantiate Repositories ──────────────────────────────────────────────────

const ordenRepo = new OrdenRepository();
const productoRepo = new ProductoRepository();
const usuarioRepo = new UsuarioRepository();
const catalogoRepo = new CatalogoRepository();
const gastoRepo = new GastoRepository();

// ─── Instantiate Services ──────────────────────────────────────────────────────

const authService = new AuthService(usuarioRepo, appSettings.jwt);
const ordenesService = new OrdenesService(ordenRepo, productoRepo);
const inventarioService = new InventarioService(productoRepo);
const reportesService = new ReportesService(ordenRepo, productoRepo, gastoRepo, catalogoRepo);
const catalogosService = new CatalogosService(catalogoRepo);

// ─── Instantiate Controllers ───────────────────────────────────────────────────

export const authController = new AuthController(authService);
export const ordenesController = new OrdenesController(ordenesService);
export const inventarioController = new InventarioController(inventarioService);
export const reportesController = new ReportesController(reportesService);
export const catalogosController = new CatalogosController(catalogosService);

// ─── Export config for modules that need it ────────────────────────────────────

export { appSettings };
