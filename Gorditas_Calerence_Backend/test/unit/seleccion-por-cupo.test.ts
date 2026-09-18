import { describe, expect, it } from 'vitest';
import { elegirPorCupo, type CandidatoACupo } from '../../src/modules/usuarios/domain/seleccion-por-cupo';
import type { Role } from '../../src/shared/domain/Auth';

const dia = (n: number) => new Date(2026, 0, n);

function miembro(nombre: string, role: Role, lastSeenAt: Date | null, activo = true): CandidatoACupo {
  return { id: nombre, nombre, role, activo, lastSeenAt };
}

describe('A quién le toca cuando el restaurante excede su cupo', () => {
  it('no elige a nadie si cabe', () => {
    const gente = [miembro('Ana', 'Admin', dia(1)), miembro('Beto', 'Mesero', dia(2))];
    expect(elegirPorCupo(gente, 2)).toEqual({ elegidos: [], quedanDeMas: 0 });
    expect(elegirPorCupo(gente, 5).elegidos).toHaveLength(0);
  });

  it('empieza por quien lleva más tiempo sin entrar', () => {
    const gente = [
      miembro('Ana', 'Admin', dia(20)),
      miembro('Beto', 'Mesero', dia(3)),
      miembro('Carla', 'Mesero', dia(10)),
    ];
    const { elegidos, quedanDeMas } = elegirPorCupo(gente, 2);
    expect(elegidos.map((m) => m.nombre)).toEqual(['Beto']);
    expect(quedanDeMas).toBe(0);
  });

  it('quien nunca entró va primero', () => {
    const gente = [
      miembro('Ana', 'Admin', dia(20)),
      miembro('Beto', 'Mesero', dia(1)),
      miembro('Carla', 'Mesero', null),
    ];
    expect(elegirPorCupo(gente, 2).elegidos.map((m) => m.nombre)).toEqual(['Carla']);
  });

  it('a igualdad, el orden es estable: el aviso y el vencimiento tienen que coincidir', () => {
    const gente = [
      miembro('Ana', 'Admin', dia(20)),
      miembro('Zoe', 'Mesero', null),
      miembro('Beto', 'Mesero', null),
    ];
    const primera = elegirPorCupo(gente, 2).elegidos.map((m) => m.nombre);
    const segunda = elegirPorCupo([...gente].reverse(), 2).elegidos.map((m) => m.nombre);
    expect(primera).toEqual(['Beto']);
    expect(segunda).toEqual(primera);
  });

  it('ignora a los ya desactivados: no ocupan plaza', () => {
    const gente = [
      miembro('Ana', 'Admin', dia(20)),
      miembro('Beto', 'Mesero', dia(1), false),
      miembro('Carla', 'Mesero', dia(2)),
    ];
    expect(elegirPorCupo(gente, 2).elegidos).toHaveLength(0);
  });

  it('nunca toca al último administrador activo, aunque sea el más inactivo', () => {
    const gente = [
      miembro('Ana', 'Admin', dia(1)), // la que menos entra, pero es la única Admin
      miembro('Beto', 'Mesero', dia(20)),
      miembro('Carla', 'Mesero', dia(30)),
    ];
    const { elegidos } = elegirPorCupo(gente, 2);
    expect(elegidos.map((m) => m.nombre)).toEqual(['Beto']);
  });

  it('la protección redirige la elección: se va otro, y el restaurante igual cabe', () => {
    // Ana es la que menos entra Y la única Admin. Se va Beto en su lugar, y con eso basta:
    // con cupos reales (3 o más) proteger al último Admin nunca deja plazas de más.
    const gente = [miembro('Ana', 'Admin', dia(1)), miembro('Beto', 'Mesero', dia(2))];
    const { elegidos, quedanDeMas } = elegirPorCupo(gente, 1);
    expect(elegidos.map((m) => m.nombre)).toEqual(['Beto']);
    expect(quedanDeMas).toBe(0);
  });

  it('el caso en que sí sobraría una plaza es la guarda de último recurso', () => {
    // Solo ocurre con cupo 0, que ningún plan tiene. Se prueba para que la guarda no se pierda
    // en una refactorización: antes que dejar un restaurante sin quien lo administre, se
    // prefiere que siga excedido.
    const gente = [miembro('Ana', 'Admin', dia(1))];
    const { elegidos, quedanDeMas } = elegirPorCupo(gente, 0);
    expect(elegidos).toHaveLength(0);
    expect(quedanDeMas).toBe(1);
  });

  it('con varios Admin sí puede quitar a los sobrantes, dejando uno', () => {
    const gente = [
      miembro('Ana', 'Admin', dia(1)),
      miembro('Bea', 'Admin', dia(2)),
      miembro('Cris', 'Admin', dia(3)),
    ];
    const { elegidos, quedanDeMas } = elegirPorCupo(gente, 1);
    expect(elegidos.map((m) => m.nombre)).toEqual(['Ana', 'Bea']);
    expect(quedanDeMas).toBe(0);
  });
});
