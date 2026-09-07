/**
 * Resolución del restaurante (tenant) a partir del host.
 * El dominio nunca se escribe en el código: viene de VITE_APP_DOMAIN.
 */
export const APP_DOMAIN = (import.meta.env.VITE_APP_DOMAIN || 'localhost').toLowerCase();
export const RESERVED_SLUGS = ['www', 'app', 'api', 'auth', 'admin', 'mail', 'docs', 'status', 'blog'] as const;
/** Subdominio de la plataforma (landing y registro); configurable si `app` ya está ocupado. */
export const PLATFORM_HOST = (import.meta.env.VITE_APP_PLATFORM_HOST || 'app').toLowerCase();
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
export const DEV_SLUG_KEY = 'devTenantSlug';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export function isLocalHost(hostname: string = window.location.hostname): boolean {
  return LOCAL_HOSTS.includes(hostname) || APP_DOMAIN === 'localhost';
}

export function isReservedSlug(slug: string): boolean {
  return slug === PLATFORM_HOST || (RESERVED_SLUGS as readonly string[]).includes(slug);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !isReservedSlug(slug);
}

/** Slug desde `<slug>.<APP_DOMAIN>`; null para el host de la plataforma o slugs reservados. */
export function slugFromHost(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (!host.endsWith(`.${APP_DOMAIN}`)) return null;
  const sub = host.slice(0, -(APP_DOMAIN.length + 1));
  if (!sub || sub.includes('.')) return null;
  return isValidSlug(sub) ? sub : null;
}

function readDevSlug(): string | null {
  try {
    const v = localStorage.getItem(DEV_SLUG_KEY);
    return v && isValidSlug(v) ? v : null;
  } catch {
    return null;
  }
}

export function setDevTenantSlug(slug: string | null): void {
  try {
    if (slug && isValidSlug(slug)) localStorage.setItem(DEV_SLUG_KEY, slug);
    else localStorage.removeItem(DEV_SLUG_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Slug del restaurante actual: subdominio en producción, `devTenantSlug` en local. */
export function getTenantSlug(): string | null {
  const fromHost = slugFromHost(window.location.hostname);
  if (fromHost) return fromHost;
  return isLocalHost() ? readDevSlug() : null;
}

/** URL pública de un restaurante. En local todo vive en el mismo origen. */
export function tenantUrl(slug: string): string {
  if (isLocalHost()) return window.location.origin;
  return `${window.location.protocol}//${slug}.${APP_DOMAIN}`;
}

/** Host de la plataforma (landing y registro). */
export function appUrl(): string {
  if (isLocalHost()) return window.location.origin;
  return `${window.location.protocol}//${PLATFORM_HOST}.${APP_DOMAIN}`;
}

/** Texto de la dirección que verá el usuario, sin protocolo. */
export function tenantHostLabel(slug: string): string {
  return `${slug}.${APP_DOMAIN}`;
}
