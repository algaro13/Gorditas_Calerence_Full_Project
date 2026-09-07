import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Callback from './pages/Callback';
import SinRestaurante from './pages/SinRestaurante';
import Plans from './pages/Plans';
import BillingSuccess from './pages/BillingSuccess';
import Onboarding from './pages/Onboarding';
import Landing from './pages/Landing';
import Configuracion from './pages/Configuracion';
import Dashboard from './pages/Dashboard';
import NuevaOrden from './pages/NuevaOrden';
import SurtirOrden from './pages/SurtirOrden';
import EditarOrden from './pages/EditarOrden';
import Despachar from './pages/Despachar';
import RecibirProducto from './pages/RecibirProducto';
import Cobrar from './pages/Cobrar';
import Catalogos from './pages/Catalogos';
import Reportes from './pages/Reportes';
import Inventario from './pages/Inventario';
import { getTenantSlug } from './config/tenant-host';

const Spinner: React.FC = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
  </div>
);

const AuthenticatedApp: React.FC = () => {
  const { user, loading, isAuthenticated, tenantMissing } = useAuth();

  if (loading) return <Spinner />;
  if (isAuthenticated && tenantMissing) return <Navigate to="/sin-restaurante" replace />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <Routes>
        {/* Dashboard - Only Admin and Encargado */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Encargado']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Nueva Orden - Admin, Encargado, Mesero */}
        <Route
          path="/nueva-orden"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Encargado', 'Mesero']}>
              <NuevaOrden />
            </ProtectedRoute>
          }
        />

        {/* Editar Orden - Admin, Encargado, Mesero */}
        <Route
          path="/editar-orden"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Encargado', 'Mesero']}>
              <EditarOrden />
            </ProtectedRoute>
          }
        />

        {/* Surtir Orden - Admin, Encargado, Despachador, Cocinero */}
        <Route
          path="/surtir-orden"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Encargado', 'Despachador', 'Cocinero']}>
              <SurtirOrden />
            </ProtectedRoute>
          }
        />

        {/* Despachar - Admin, Encargado, Mesero, Despachador */}
        <Route
          path="/despachar"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Encargado', 'Mesero', 'Despachador']}>
              <Despachar />
            </ProtectedRoute>
          }
        />

        {/* Recibir Productos - Admin, Encargado */}
        <Route
          path="/recibir-productos"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Encargado']}>
              <RecibirProducto />
            </ProtectedRoute>
          }
        />

        {/* Cobrar - Admin, Encargado, Mesero */}
        <Route
          path="/cobrar"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Encargado', 'Mesero']}>
              <Cobrar />
            </ProtectedRoute>
          }
        />

        {/* Catálogos - Admin, Encargado, Mesero, Despachador */}
        <Route
          path="/catalogos"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Encargado', 'Mesero', 'Despachador']}>
              <Catalogos />
            </ProtectedRoute>
          }
        />

        {/* Reportes - Admin, Encargado */}
        <Route
          path="/reportes"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Encargado']}>
              <Reportes />
            </ProtectedRoute>
          }
        />

        {/* Inventario - Admin, Encargado */}
        <Route
          path="/inventario"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Encargado']}>
              <Inventario />
            </ProtectedRoute>
          }
        />

        {/* Configuración - Admin y Encargado (el API restringe la escritura a Admin) */}
        <Route
          path="/configuracion"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Encargado']}>
              <Configuracion />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const BasicProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAuthenticated, tenantMissing } = useAuth();

  if (loading) return <Spinner />;
  if (isAuthenticated && tenantMissing) return <Navigate to="/sin-restaurante" replace />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/sin-restaurante" element={<SinRestaurante />} />
          <Route path="/landing" element={<Landing />} />
          {/* En el host de la plataforma (o el dominio a secas) la raíz es la página de venta.
              En el subdominio de un restaurante la raíz sigue siendo el POS. */}
          {getTenantSlug() === null && <Route path="/" element={<Landing />} />}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route
            path="/planes"
            element={
              <BasicProtectedRoute>
                <Plans />
              </BasicProtectedRoute>
            }
          />
          <Route
            path="/*"
            element={
              <BasicProtectedRoute>
                <AuthenticatedApp />
              </BasicProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
