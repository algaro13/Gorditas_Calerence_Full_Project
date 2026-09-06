import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider as OidcProvider } from 'react-oidc-context';
import { oidcConfig } from './config/auth-config';
import App from './App.tsx';
import './index.css';

// Tras el retorno de Zitadel se limpian code/state de la URL; la ruta /callback decide a dónde ir.
const onSigninCallback = () => {
  window.history.replaceState({}, document.title, '/callback');
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OidcProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
      <App />
    </OidcProvider>
  </StrictMode>
);
