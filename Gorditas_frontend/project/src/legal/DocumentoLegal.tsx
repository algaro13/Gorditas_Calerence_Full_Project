import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { ES_BORRADOR, fechaDeVersion } from './datos';

/** Un dato de ejemplo se resalta mientras el documento sea borrador, para que no pase inadvertido. */
export const Dato: React.FC<{ children: string }> = ({ children }) =>
  children.startsWith('[') ? <mark className="rounded bg-yellow-200 px-1 text-gray-900">{children}</mark> : <>{children}</>;

export const Seccion: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <section className="space-y-3">
    <h2 className="text-titulo font-bold text-gray-900">{titulo}</h2>
    {children}
  </section>
);

/** Marco común del aviso de privacidad y de los términos: legible en teléfono y sin sesión. */
const DocumentoLegal: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => {
  useEffect(() => {
    document.title = `${titulo} · Cuadranova`;
    window.scrollTo(0, 0);
  }, [titulo]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex min-h-[44px] items-center gap-2">
            <ChefHat className="h-6 w-6 text-orange-500" />
            <span className="text-titulo font-bold text-gray-900">Cuadranova</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 text-cuerpo leading-relaxed text-gray-700">
        <div>
          <h1 className="text-pantalla font-bold text-gray-900">{titulo}</h1>
          <p className="mt-1 text-meta text-gray-500">Versión del {fechaDeVersion()}</p>
        </div>
        {ES_BORRADOR && (
          <p role="note" className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-yellow-900">
            Borrador pendiente de revisión legal. Los datos resaltados son de ejemplo.
          </p>
        )}
        {children}
      </main>
      <footer className="border-t bg-white">
        <nav className="mx-auto flex max-w-3xl flex-wrap gap-x-6 px-4 py-4 text-cuerpo" aria-label="Documentos legales">
          <Link to="/privacidad" className="inline-flex min-h-[44px] items-center text-orange-700 underline">
            Aviso de privacidad
          </Link>
          <Link to="/terminos" className="inline-flex min-h-[44px] items-center text-orange-700 underline">
            Términos del servicio
          </Link>
        </nav>
      </footer>
    </div>
  );
};

export default DocumentoLegal;
