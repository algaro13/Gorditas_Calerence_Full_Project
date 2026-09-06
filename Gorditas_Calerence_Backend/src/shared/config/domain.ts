/**
 * Única fuente de verdad para construir URLs de la plataforma y de los tenants.
 * Ningún otro archivo debe escribir el dominio de forma literal (regla de ESLint).
 */
export const RESERVED_SLUGS = ['www', 'app', 'api', 'auth', 'admin', 'mail', 'docs', 'status', 'blog'] as const;

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export interface DomainConfig {
  appDomain: string;
  scheme: 'http' | 'https';
  /** Origen del frontend cuando no hay subdominios (desarrollo local). */
  localFrontendOrigin?: string;
}

export interface DomainUrls {
  appUrl(): string;
  apiUrl(): string;
  authUrl(): string;
  tenantUrl(slug: string): string;
  tenantCallbackUrl(slug: string): string;
  slugFromHost(host: string): string | null;
  isReservedSlug(slug: string): boolean;
  isValidSlug(slug: string): boolean;
  isLocal(): boolean;
}

export function createDomainUrls(cfg: DomainConfig): DomainUrls {
  const isLocal = cfg.appDomain === 'localhost' || cfg.appDomain.endsWith('.local') || cfg.appDomain.endsWith('.test');
  const base = (sub: string) => `${cfg.scheme}://${sub}.${cfg.appDomain}`;
  const localOrigin = cfg.localFrontendOrigin ?? 'http://localhost:5173';

  return {
    isLocal: () => isLocal,
    appUrl: () => (isLocal ? localOrigin : base('app')),
    apiUrl: () => (isLocal ? 'http://localhost:5000' : base('api')),
    authUrl: () => (isLocal ? 'http://localhost:8080' : base('auth')),
    tenantUrl: (slug) => (isLocal ? localOrigin : base(slug)),
    tenantCallbackUrl: (slug) => `${isLocal ? localOrigin : base(slug)}/callback`,
    isReservedSlug: (slug) => (RESERVED_SLUGS as readonly string[]).includes(slug),
    isValidSlug: (slug) => SLUG_PATTERN.test(slug) && !(RESERVED_SLUGS as readonly string[]).includes(slug),
    slugFromHost: (host) => {
      const hostname = host.split(':')[0].toLowerCase();
      const suffix = `.${cfg.appDomain}`;
      if (!hostname.endsWith(suffix)) return null;
      const slug = hostname.slice(0, -suffix.length);
      if (!SLUG_PATTERN.test(slug) || (RESERVED_SLUGS as readonly string[]).includes(slug)) return null;
      return slug;
    },
  };
}
