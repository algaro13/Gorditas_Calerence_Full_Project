import { describe, expect, it } from 'vitest';
import { createDomainUrls, RESERVED_SLUGS } from '../../src/shared/config/domain';
import { accessBlockReason } from '../../src/shared/domain/Tenant';
import { toApi } from '../../src/shared/utils/serialize';
import { multiply, sum, toMoney } from '../../src/shared/domain/Money';
import { formatDateKey } from '../../src/shared/utils/dates';

describe('DomainUrls', () => {
  const urls = createDomainUrls({ appDomain: 'ejemplo.mx', scheme: 'https' });

  it('construye URLs de plataforma y de tenant', () => {
    expect(urls.appUrl()).toBe('https://app.ejemplo.mx');
    expect(urls.apiUrl()).toBe('https://api.ejemplo.mx');
    expect(urls.authUrl()).toBe('https://auth.ejemplo.mx');
    expect(urls.tenantUrl('tacos-el-guero')).toBe('https://tacos-el-guero.ejemplo.mx');
    expect(urls.tenantCallbackUrl('demo')).toBe('https://demo.ejemplo.mx/callback');
  });

  it('extrae el slug del host y rechaza reservados', () => {
    expect(urls.slugFromHost('demo.ejemplo.mx')).toBe('demo');
    expect(urls.slugFromHost('demo.ejemplo.mx:443')).toBe('demo');
    expect(urls.slugFromHost('app.ejemplo.mx')).toBeNull();
    expect(urls.slugFromHost('otro.dominio.com')).toBeNull();
    expect(urls.slugFromHost('sub.demo.ejemplo.mx')).toBeNull();
    for (const r of RESERVED_SLUGS) expect(urls.isValidSlug(r)).toBe(false);
    expect(urls.isValidSlug('a')).toBe(false);
    expect(urls.isValidSlug('-mal')).toBe(false);
    expect(urls.isValidSlug('gorditas-calerence')).toBe(true);
  });

  it('en local todo apunta a localhost', () => {
    const local = createDomainUrls({ appDomain: 'localhost', scheme: 'http', localFrontendOrigin: 'http://localhost:5173' });
    expect(local.isLocal()).toBe(true);
    expect(local.tenantUrl('demo')).toBe('http://localhost:5173');
  });
});

describe('accessBlockReason', () => {
  const now = new Date('2026-09-06T12:00:00Z');
  it('permite active, past_due y trial vigente', () => {
    expect(accessBlockReason({ planStatus: 'active', trialEndsAt: null }, now)).toBeNull();
    expect(accessBlockReason({ planStatus: 'past_due', trialEndsAt: null }, now)).toBeNull();
    expect(accessBlockReason({ planStatus: 'trial', trialEndsAt: new Date('2026-09-07T00:00:00Z') }, now)).toBeNull();
  });
  it('bloquea trial vencido y suscripciones canceladas', () => {
    expect(accessBlockReason({ planStatus: 'trial', trialEndsAt: new Date('2026-09-01T00:00:00Z') }, now)).toBe('TRIAL_EXPIRED');
    expect(accessBlockReason({ planStatus: 'canceled', trialEndsAt: null }, now)).toBe('SUBSCRIPTION_INACTIVE');
    expect(accessBlockReason({ planStatus: 'expired', trialEndsAt: null }, now)).toBe('SUBSCRIPTION_INACTIVE');
  });
});

describe('toApi', () => {
  class Decimal {
    constructor(private v: string) {}
    toString() {
      return this.v;
    }
  }
  it('renombra id, convierte Decimal y bigint y aplana joins', () => {
    const row = { id: 3, nombre: 'Agua', costo: new Decimal('15.50'), total: 5n, tipoProducto: { id: 1, nombre: 'Bebidas' }, extras: [{ id: 'x', importe: new Decimal('2') }] };
    const out = toApi<Record<string, unknown>>(row, { 'tipoProducto.nombre': 'nombreTipoProducto' });
    expect(out).toEqual({ _id: 3, nombre: 'Agua', costo: 15.5, total: 5, nombreTipoProducto: 'Bebidas', extras: [{ _id: 'x', importe: 2 }] });
  });
  it('conserva fechas y nulos', () => {
    const d = new Date();
    expect(toApi({ id: 'a', fecha: d, notas: null })).toEqual({ _id: 'a', fecha: d, notas: null });
  });
});

describe('Money', () => {
  it('redondea a dos decimales', () => {
    expect(toMoney('19.999')).toBe(20);
    expect(multiply(0.1, 3)).toBe(0.3);
    expect(sum([0.1, 0.2])).toBe(0.3);
  });
});

describe('formatDateKey', () => {
  it('usa la zona horaria del negocio', () => {
    // 2026-09-06T03:30Z son las 21:30 del 5 de septiembre en Ciudad de México (UTC-6)
    expect(formatDateKey(new Date('2026-09-06T03:30:00Z'), 'America/Mexico_City')).toBe('2026-09-05');
    expect(formatDateKey(new Date('2026-09-06T03:30:00Z'), 'UTC')).toBe('2026-09-06');
  });
});
