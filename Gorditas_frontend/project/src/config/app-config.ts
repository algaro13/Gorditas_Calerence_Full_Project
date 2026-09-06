const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

export const appConfig = {
  brandName: import.meta.env.VITE_BRAND_NAME || 'Kustodela POS',
  apiBaseUrl,
  /** Origen del API sin el sufijo /api, para archivos servidos por el backend (logos). */
  assetsBaseUrl: apiBaseUrl.replace(/\/api$/, ''),
  pollingInterval: 8000,
};

/** URL absoluta de un archivo servido por el backend (por ejemplo `/uploads/<tenant>/logo.png`). */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  return `${appConfig.assetsBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}
