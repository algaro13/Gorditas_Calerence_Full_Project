import { describe, expect, it } from 'vitest';
import { avisoQueToca, correoFinDePrueba } from '../../src/modules/billing/domain/aviso-prueba';

const AHORA = new Date('2026-10-03T18:00:00Z');
const enDias = (d: number) => new Date(AHORA.getTime() + d * 86_400_000);

describe('avisoQueToca', () => {
  it('con más de 3 días por delante, ninguno', () => {
    expect(avisoQueToca({ planStatus: 'trial', trialEndsAt: enDias(3.5) }, AHORA)).toBeNull();
  });

  it('a 3 días o menos, el de «termina»', () => {
    expect(avisoQueToca({ planStatus: 'trial', trialEndsAt: enDias(3) }, AHORA)).toBe('prueba-por-vencer');
    expect(avisoQueToca({ planStatus: 'trial', trialEndsAt: enDias(0.1) }, AHORA)).toBe('prueba-por-vencer');
  });

  it('vencida hace 7 días o menos, el de «terminó»; más, ninguno', () => {
    expect(avisoQueToca({ planStatus: 'trial', trialEndsAt: enDias(0) }, AHORA)).toBe('prueba-vencida');
    expect(avisoQueToca({ planStatus: 'trial', trialEndsAt: enDias(-7) }, AHORA)).toBe('prueba-vencida');
    expect(avisoQueToca({ planStatus: 'trial', trialEndsAt: enDias(-7.5) }, AHORA)).toBeNull();
  });

  it('quien ya no está en prueba no recibe nada', () => {
    expect(avisoQueToca({ planStatus: 'active', trialEndsAt: enDias(1) }, AHORA)).toBeNull();
    expect(avisoQueToca({ planStatus: 'canceled', trialEndsAt: enDias(-1) }, AHORA)).toBeNull();
    expect(avisoQueToca({ planStatus: 'trial', trialEndsAt: null }, AHORA)).toBeNull();
  });
});

describe('correoFinDePrueba', () => {
  const datos = {
    nombreRestaurante: 'Gorditas <Doña> & Hijos',
    // 01:30 UTC del 26 de octubre es todavía el 25 en Ciudad de México.
    trialEndsAt: new Date('2026-10-26T01:30:00Z'),
    urlPlanes: 'https://dona.kustodela.com/planes',
    timeZone: 'America/Mexico_City',
  };

  it('«termina»: la fecha del negocio, el enlace y los planes', () => {
    const c = correoFinDePrueba('prueba-por-vencer', datos);
    expect(c.asunto).toBe('Tu prueba de Kustodela POS termina el 25 de octubre de 2026');
    expect(c.texto).toContain('termina el 25 de octubre de 2026');
    expect(c.texto).toContain('https://dona.kustodela.com/planes');
    expect(c.texto).toContain('Básico: $299 MXN al mes, hasta 3 usuarios');
    expect(c.texto).toContain('Empresarial: $999 MXN al mes, usuarios ilimitados');
    expect(c.html).toContain('href="https://dona.kustodela.com/planes"');
  });

  it('«terminó»: dice que los datos están intactos', () => {
    const c = correoFinDePrueba('prueba-vencida', datos);
    expect(c.asunto).toContain('terminó');
    expect(c.texto).toContain('Tus datos están intactos');
  });

  it('el nombre del restaurante no rompe el HTML', () => {
    const c = correoFinDePrueba('prueba-por-vencer', datos);
    expect(c.html).toContain('Gorditas &lt;Doña&gt; &amp; Hijos');
    expect(c.html).not.toContain('<Doña>');
  });
});
