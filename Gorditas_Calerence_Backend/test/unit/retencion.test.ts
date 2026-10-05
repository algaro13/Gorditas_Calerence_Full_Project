import { describe, expect, it } from 'vitest';
import { RevisarInactividad } from '../../src/modules/plataforma/application/Retencion';
import type { DatosRestaurante } from '../../src/modules/plataforma/domain/resumen';
import { categoriaRetencion, faseRetencion, fechaDeArchivo, siguientePaso, type EstadoRetencion } from '../../src/modules/plataforma/domain/retencion';
import { FakeEnviador } from '../../src/infrastructure/correo/FakeEnviador';
import { createDomainUrls } from '../../src/shared/config/domain';
import type { Logger } from '../../src/shared/application/ports/Logger';
import type { TenantRepository } from '../../src/shared/application/ports/TenantRepository';
import type { AvisosEnviados } from '../../src/modules/billing/application/ports/AvisosEnviados';
import type { TenantInfo } from '../../src/shared/domain/Tenant';

const DIA = 86_400_000;
const AHORA = new Date('2026-10-05T12:00:00Z');
const hace = (d: number) => new Date(AHORA.getTime() - d * DIA);

function loggerMudo(): Logger {
  const log: Logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, child: () => log };
  return log;
}

const estado = (e: Partial<EstadoRetencion>): EstadoRetencion => ({
  categoria: 'prueba-sin-pago',
  diasSinUso: 0,
  archivadoAt: null,
  pausada: false,
  enviados: {},
  ...e,
});

describe('categoriaRetencion', () => {
  it('lo que paga o tiene plan dado nunca entra al ciclo', () => {
    expect(categoriaRetencion('pago', true)).toBe('protegida');
    expect(categoriaRetencion('pago-pendiente', true)).toBe('protegida');
    expect(categoriaRetencion('plan-sin-stripe', false)).toBe('protegida');
  });
  it('prueba sin pago y pago cancelado tienen plazos distintos', () => {
    expect(categoriaRetencion('prueba', false)).toBe('prueba-sin-pago');
    expect(categoriaRetencion('prueba-vencida', false)).toBe('prueba-sin-pago');
    expect(categoriaRetencion('cancelado', false)).toBe('prueba-sin-pago');
    expect(categoriaRetencion('cancelado', true)).toBe('pago-cancelado');
  });
});

describe('siguientePaso', () => {
  it('prueba sin pago: aviso a los 30, segundo a los 60, archivo a los 90', () => {
    expect(siguientePaso(estado({ diasSinUso: 29 }), AHORA)).toBeNull();
    expect(siguientePaso(estado({ diasSinUso: 30 }), AHORA)).toBe('inactividad-1');
    expect(siguientePaso(estado({ diasSinUso: 60, enviados: { 'inactividad-1': hace(30) } }), AHORA)).toBe('inactividad-2');
    expect(siguientePaso(estado({ diasSinUso: 90, enviados: { 'inactividad-1': hace(60), 'inactividad-2': hace(30) } }), AHORA)).toBe('archivado');
  });

  it('pago cancelado: doce meses de gracia', () => {
    const c = { categoria: 'pago-cancelado' as const };
    const enviados = { 'inactividad-1': hace(60), 'inactividad-2': hace(30) };
    expect(siguientePaso(estado({ ...c, diasSinUso: 364 }), AHORA)).toBeNull();
    expect(siguientePaso(estado({ ...c, diasSinUso: 365 }), AHORA)).toBe('inactividad-1');
    expect(siguientePaso(estado({ ...c, diasSinUso: 424, enviados }), AHORA)).toBeNull();
    expect(siguientePaso(estado({ ...c, diasSinUso: 425, enviados }), AHORA)).toBe('archivado');
  });

  it('nunca se salta un paso y deja 7 días entre uno y otro', () => {
    // 200 días sin uso y nada enviado: primero el aviso, no el archivo.
    expect(siguientePaso(estado({ diasSinUso: 200 }), AHORA)).toBe('inactividad-1');
    expect(siguientePaso(estado({ diasSinUso: 200, enviados: { 'inactividad-1': hace(6) } }), AHORA)).toBeNull();
    expect(siguientePaso(estado({ diasSinUso: 200, enviados: { 'inactividad-1': hace(7) } }), AHORA)).toBe('inactividad-2');
    expect(siguientePaso(estado({ diasSinUso: 200, enviados: { 'inactividad-1': hace(14), 'inactividad-2': hace(6) } }), AHORA)).toBeNull();
  });

  it('protegido, pausado o ya archivado: nada', () => {
    expect(siguientePaso(estado({ categoria: 'protegida', diasSinUso: 999 }), AHORA)).toBeNull();
    expect(siguientePaso(estado({ diasSinUso: 999, pausada: true }), AHORA)).toBeNull();
    expect(siguientePaso(estado({ diasSinUso: 999, archivadoAt: hace(1) }), AHORA)).toBeNull();
  });

  it('restaurado por el operador sin uso nuevo: no se vuelve a archivar al día siguiente', () => {
    const enviados = { 'inactividad-1': hace(60), 'inactividad-2': hace(30), archivado: hace(10) };
    expect(siguientePaso(estado({ diasSinUso: 100, enviados }), AHORA)).toBeNull();
    expect(faseRetencion({ archivadoAt: null, enviados }, AHORA)).toBe('en-uso');
  });
});

describe('faseRetencion y fechaDeArchivo', () => {
  it('archivado hasta los 30 días; después, listo para borrar', () => {
    expect(faseRetencion({ archivadoAt: hace(29), enviados: {} }, AHORA)).toBe('archivado');
    expect(faseRetencion({ archivadoAt: hace(30), enviados: {} }, AHORA)).toBe('listo-para-borrar');
  });

  it('la fecha anunciada nunca es antes de lo que permiten los márgenes', () => {
    // Por plazo tocaría hace 110 días; con los dos márgenes, en 14.
    expect(fechaDeArchivo('prueba-sin-pago', hace(200), 'inactividad-1', AHORA)).toEqual(new Date(AHORA.getTime() + 14 * DIA));
    expect(fechaDeArchivo('prueba-sin-pago', hace(30), 'inactividad-1', AHORA)).toEqual(new Date(hace(30).getTime() + 90 * DIA));
  });
});

describe('RevisarInactividad', () => {
  function montar(datos: Partial<DatosRestaurante>[], admins: Record<string, string[]>) {
    const filas: DatosRestaurante[] = datos.map((d, i) => ({
      id: `t${i}`,
      slug: `r${i}`,
      nombre: `R${i}`,
      plan: 'trial',
      planStatus: 'trial',
      creadoEl: hace(100),
      trialEndsAt: hace(86),
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
      ...d,
    }));
    const archivados: string[] = [];
    const registrados: { tenantId: string; tipo: string }[] = [];
    const tenants = {
      setArchivado: async (id: string, at: Date | null) => {
        if (at) archivados.push(id);
        return { id, zitadelOrgId: null } as unknown as TenantInfo;
      },
    } as unknown as TenantRepository;
    const avisos = {
      registrar: async (tenantId: string, tipo: string) => {
        registrados.push({ tenantId, tipo });
      },
    } as unknown as AvisosEnviados;
    const enviador = new FakeEnviador();
    const uc = new RevisarInactividad(
      { restaurantes: async () => filas },
      tenants,
      avisos,
      async (id) => admins[id] ?? [],
      enviador,
      createDomainUrls({ appDomain: 'kustodela.com', scheme: 'https' }),
      { now: () => AHORA },
      'America/Mexico_City',
      loggerMudo(),
    );
    return { uc, enviador, archivados, registrados };
  }

  it('avisa, archiva y respeta a los protegidos y a los pausados', async () => {
    const { uc, enviador, archivados, registrados } = montar(
      [
        {}, // 100 días, nada enviado: primer aviso
        { enviadosRetencion: { 'inactividad-1': hace(60), 'inactividad-2': hace(30) } }, // se archiva
        { planStatus: 'active', tieneSuscripcionStripe: true, plan: 'basico' }, // paga
        { retencionPausada: true },
      ],
      { t0: ['a@r0.test'], t1: ['a@r1.test'], t2: ['a@r2.test'], t3: ['a@r3.test'] },
    );
    const r = await uc.ejecutar();

    expect(r).toMatchObject({ revisados: 4, avisos: 1, archivados: 1, fallidos: 0 });
    expect(archivados).toEqual(['t1']);
    expect(registrados).toEqual([
      { tenantId: 't0', tipo: 'inactividad-1' },
      { tenantId: 't1', tipo: 'archivado' },
    ]);
    expect(enviador.enviados.map((c) => c.para[0])).toEqual(['a@r0.test', 'a@r1.test']);
    expect(enviador.enviados[0].asunto).toContain('R0');
    expect(enviador.enviados[0].texto).toContain('https://r0.kustodela.com/');
  });

  it('sin a quién escribir, el ciclo avanza igual', async () => {
    const { uc, enviador, registrados } = montar([{}], {});
    const r = await uc.ejecutar();
    expect(r.sinDestinatario).toBe(1);
    expect(enviador.enviados).toHaveLength(0);
    expect(registrados).toEqual([{ tenantId: 't0', tipo: 'inactividad-1' }]);
  });

  it('si el correo falla no se registra, para reintentarlo mañana', async () => {
    const { uc, enviador, registrados } = montar([{}], { t0: ['a@r0.test'] });
    enviador.fallar = true;
    const r = await uc.ejecutar();
    expect(r.fallidos).toBe(1);
    expect(registrados).toHaveLength(0);
  });
});
