import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import NavegacionInferior from './NavegacionInferior';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleDesktopSidebar = () => {
    setSidebarMinimized(!sidebarMinimized);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar para desktop */}
      <div className="hidden lg:block">
        <Sidebar 
          minimized={sidebarMinimized} 
          onToggleMinimized={toggleDesktopSidebar} 
        />
      </div>

      {/* El riel de iconos de la izquierda se sustituyo por la navegacion inferior: ocupaba
          70 de 375 px —un 19 %— y estaba en la zona peor para el pulgar. */}

      {/* Panel completo para móvil con overlay */}
      {sidebarOpen && (
        <>
          {/* Overlay que bloquea la vista */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={closeSidebar}
          />
          {/* Sidebar completo móvil */}
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar 
              minimized={false} 
              onToggleMinimized={closeSidebar}
              isMobile={true}
            />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          {/* El hueco de abajo reserva sitio a la barra: sin el, el ultimo control de cada
              pantalla quedaria debajo de ella y seria intocable. */}
          <div
            className="container mx-auto px-6 py-8"
            style={{ paddingBottom: 'calc(var(--hueco-nav, 1rem) + 1rem)' }}
          >
            {children}
          </div>
        </main>
      </div>

      <NavegacionInferior onAbrirMas={toggleSidebar} />
    </div>
  );
};

export default Layout;