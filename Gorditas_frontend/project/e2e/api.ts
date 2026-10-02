import type { Page } from '@playwright/test';
import { loadEnv } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * La API a la que hablan las pruebas que preparan o limpian datos sin pasar por la pantalla.
 *
 * Se resuelve igual que en la app (`src/config/app-config.ts`): `VITE_API_URL` del entorno, luego
 * de `.env.development` —`loadEnv` de Vite da la misma precedencia que el servidor de desarrollo—
 * y por último el mismo valor por omisión. `E2E_API_URL` la fuerza a mano.
 *
 * Antes cada prueba llevaba `http://localhost:5000` escrito. El día que el 5000 lo ocupó otro
 * proyecto y el backend se levantó en el 5001, la app funcionaba y cinco pruebas fallaban con
 * «Failed to fetch»: le hablaban a un servidor que no era el nuestro.
 */
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const API_URL = (
  process.env.E2E_API_URL ||
  loadEnv('development', raiz, 'VITE_').VITE_API_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '');

export interface RespuestaApi {
  estado: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cuerpo: any;
}

/** Llama a la API con el token que ya tiene la sesión. `ruta` empieza en `/`, sin el `/api`. */
export function llamarApi(page: Page, metodo: string, ruta: string, cuerpo?: unknown): Promise<RespuestaApi> {
  return page.evaluate(
    async ([base, m, r, c]) => {
      // El token lo guarda react-oidc-context en `localStorage`, bajo una llave que lleva el
      // emisor y el cliente.
      const llave = Object.keys(localStorage).find((k) => k.startsWith('oidc.user'));
      const token = llave ? JSON.parse(localStorage.getItem(llave)!).access_token : null;
      const res = await fetch(`${base}${r}`, {
        method: m as string,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: c === null ? undefined : JSON.stringify(c),
      });
      return { estado: res.status, cuerpo: await res.json() };
    },
    [API_URL, metodo, ruta, cuerpo ?? null] as const,
  );
}
