import { describe, expect, it } from 'vitest';
import { CLAIM_ORG_ID, claimRolesForProject, esOperadorPlataforma } from '../../src/shared/http/express/authenticate';
import { diasSinUso, resumir, situacion, tramo, type DatosRestaurante } from '../../src/modules/plataforma/domain/resumen';

const AHORA = new Date('2026-10-03T12:00:00Z');
const haceDias = (d: number) => new Date(AHORA.getTime() - d * 86_400_000);

function restaurante(r: Partial<DatosRestaurante>): DatosRestaurante {
  return {
    id: r.slug ?? 'x',
    slug: 'x',
    nombre: 'X',
    plan: 'trial',
    planStatus: 'trial',
    creadoEl: haceDias(5),
    trialEndsAt: new Date(AHORA.getTime() + 9 * 86_400_000),
    currentPeriodEnd: null,
    cancelAt: null,
    tieneSuscripcionStripe: false,
    activo: true,
    usuariosActivos: 1,
    ultimoAcceso: null,
    ultimaOrden: null,
    ordenes30d: 0,
    archivadoAt: null,
    retencionPausada: false,
    enviadosRetencion: {},
    ...r,
  };
}

describe('esOperadorPlataforma', () => {
  const PROYECTO = 'p1';
  const conRol = (orgDelRol: string, orgDelToken: string) => ({
    sub: 'u',
    [CLAIM_ORG_ID]: orgDelToken,
    [claimRolesForProject(PROYECTO)]: { Plataforma: { [orgDelRol]: 'x' } },
  });

  it('rol y token de la organización de la plataforma: sí', () => {
    expect(esOperadorPlataforma(conRol('plat', 'plat'), PROYECTO, 'plat', 'plat')).toBe(true);
  });

  it('el rol de otra organización no cuenta', () => {
    expect(esOperadorPlataforma(conRol('restaurante', 'restaurante'), PROYECTO, 'restaurante', 'plat')).toBe(false);
  });

  it('sin organización de plataforma configurada, nadie', () => {
    expect(esOperadorPlataforma(conRol('plat', 'plat'), PROYECTO, 'plat', undefined)).toBe(false);
  });
});

describe('situación, días sin uso y tramos', () => {
  it('cada situación', () => {
    expect(situacion({ planStatus: 'trial', trialEndsAt: haceDias(-1), tieneSuscripcionStripe: false }, AHORA)).toBe('prueba');
    expect(situacion({ planStatus: 'trial', trialEndsAt: haceDias(1), tieneSuscripcionStripe: false }, AHORA)).toBe('prueba-vencida');
    expect(situacion({ planStatus: 'active', trialEndsAt: null, tieneSuscripcionStripe: true }, AHORA)).toBe('pago');
    expect(situacion({ planStatus: 'past_due', trialEndsAt: null, tieneSuscripcionStripe: true }, AHORA)).toBe('pago-pendiente');
    expect(situacion({ planStatus: 'active', trialEndsAt: null, tieneSuscripcionStripe: false }, AHORA)).toBe('plan-sin-stripe');
    expect(situacion({ planStatus: 'canceled', trialEndsAt: null, tieneSuscripcionStripe: true }, AHORA)).toBe('cancelado');
  });

  it('días sin uso: lo más reciente entre orden y acceso; si nunca hubo, desde el alta', () => {
    expect(diasSinUso({ ultimoAcceso: haceDias(10), ultimaOrden: haceDias(3), creadoEl: haceDias(100) }, AHORA)).toBe(3);
    expect(diasSinUso({ ultimoAcceso: null, ultimaOrden: null, creadoEl: haceDias(40) }, AHORA)).toBe(40);
  });

  it('tramos', () => {
    expect([0, 7, 8, 30, 31, 90, 91].map(tramo)).toEqual(['hasta-7', 'hasta-7', 'de-8-a-30', 'de-8-a-30', 'de-31-a-90', 'de-31-a-90', 'mas-de-90']);
  });
});

describe('resumir', () => {
  const precios = { basico: 299, profesional: 599, empresarial: 999 };

  it('cuenta, suma el ingreso de las suscripciones vivas y calcula la conversión', () => {
    const r = resumir(
      [
        restaurante({ slug: 'a', plan: 'basico', planStatus: 'active', tieneSuscripcionStripe: true, trialEndsAt: null, ultimaOrden: haceDias(1) }),
        restaurante({ slug: 'b', plan: 'profesional', planStatus: 'past_due', tieneSuscripcionStripe: true, trialEndsAt: null, ultimoAcceso: haceDias(20) }),
        restaurante({ slug: 'c', plan: 'profesional', planStatus: 'active', tieneSuscripcionStripe: false, trialEndsAt: null }),
        restaurante({ slug: 'd', trialEndsAt: haceDias(30), creadoEl: haceDias(44) }),
        restaurante({ slug: 'e' }),
        restaurante({ slug: 'f', plan: 'basico', planStatus: 'canceled', tieneSuscripcionStripe: true, trialEndsAt: null, creadoEl: haceDias(200) }),
      ],
      precios,
      AHORA,
    );

    expect(r.total).toBe(6);
    expect(r.porSituacion).toEqual({ prueba: 1, 'prueba-vencida': 1, pago: 1, 'pago-pendiente': 1, cancelado: 1, 'plan-sin-stripe': 1 });
    expect(r.pagoPorPlan).toEqual({ basico: 1, profesional: 1, empresarial: 0 });
    // El plan sin Stripe no suma: no paga.
    expect(r.ingresoMensual).toBe(299 + 599);
    // Terminaron la prueba a, b, c, d y f; llegaron a pagar a, b y f.
    expect(r.conversion).toEqual({ terminaronPrueba: 5, pagaron: 3, porcentaje: 60 });
    // Los que más llevan sin uso, primero.
    expect(r.restaurantes[0].slug).toBe('f');
    expect(r.restaurantes.find((x) => x.slug === 'd')).toMatchObject({ diasSinUso: 44, tramo: 'de-31-a-90' });
  });

  it('sin pruebas terminadas, la conversión no se inventa', () => {
    expect(resumir([restaurante({})], precios, AHORA).conversion.porcentaje).toBeNull();
  });
});

describe('ResumenPlataforma', () => {
  it('registra en la bitácora antes de leer, con el correo de Zitadel si el token no lo trae', async () => {
    const { ResumenPlataforma } = await import('../../src/modules/plataforma/application/ResumenPlataforma');
    const pasos: string[] = [];
    const bitacora = { registrar: async (e: { operadorEmail: string; accion: string }) => void pasos.push(`bitácora:${e.accion}:${e.operadorEmail}`) };
    const lectura = { restaurantes: async () => (pasos.push('lectura'), []) };
    const uc = new ResumenPlataforma(lectura, bitacora, { now: () => AHORA }, {}, async () => 'op@cuadranova.com');

    await uc.ejecutar({ userId: 'u1', orgId: 'plat', roles: [], primaryRole: null, email: '', name: '', plataforma: true });
    expect(pasos).toEqual(['bitácora:ver-resumen:op@cuadranova.com', 'lectura']);
  });
});
