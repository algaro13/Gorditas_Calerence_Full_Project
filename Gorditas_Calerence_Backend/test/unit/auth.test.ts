import { describe, expect, it } from 'vitest';
import { authInfoFromPayload, rolesForOrg, CLAIM_ORG_ID, claimRolesForProject, CLAIM_ROLES_GENERIC } from '../../src/shared/http/express/authenticate';
import { primaryRoleOf } from '../../src/shared/domain/Auth';

const PROJECT = 'p1';

describe('rolesForOrg', () => {
  it('devuelve solo los roles de la organización del token', () => {
    const payload = {
      [claimRolesForProject(PROJECT)]: {
        Admin: { orgB: 'b.test' },
        Mesero: { orgA: 'a.test', orgB: 'b.test' },
        Cocinero: { orgA: 'a.test' },
      },
    };
    expect(rolesForOrg(payload, PROJECT, 'orgA').sort()).toEqual(['Cocinero', 'Mesero']);
    expect(rolesForOrg(payload, PROJECT, 'orgB').sort()).toEqual(['Admin', 'Mesero']);
  });

  it('ignora roles desconocidos y usa el claim genérico si no hay el del proyecto', () => {
    const payload = { [CLAIM_ROLES_GENERIC]: { Admin: { orgA: 'a' }, SuperUser: { orgA: 'a' } } };
    expect(rolesForOrg(payload, PROJECT, 'orgA')).toEqual(['Admin']);
  });

  it('sin claim de roles devuelve lista vacía', () => {
    expect(rolesForOrg({}, PROJECT, 'orgA')).toEqual([]);
  });
});

describe('authInfoFromPayload', () => {
  it('construye AuthInfo con rol principal por precedencia', () => {
    const info = authInfoFromPayload(
      {
        sub: 'u1',
        email: 'u1@test.local',
        given_name: 'Ana',
        family_name: 'López',
        [CLAIM_ORG_ID]: 'orgA',
        [claimRolesForProject(PROJECT)]: { Mesero: { orgA: 'a' }, Encargado: { orgA: 'a' } },
      },
      PROJECT,
    );
    expect(info).not.toBeNull();
    expect(info!.primaryRole).toBe('Encargado');
    expect(info!.name).toBe('Ana López');
    expect(info!.orgId).toBe('orgA');
  });

  it('devuelve null sin sub o sin organización', () => {
    expect(authInfoFromPayload({ sub: 'u1' }, PROJECT)).toBeNull();
    expect(authInfoFromPayload({ [CLAIM_ORG_ID]: 'orgA' }, PROJECT)).toBeNull();
  });
});

describe('primaryRoleOf', () => {
  it('Admin gana sobre cualquier otro', () => {
    expect(primaryRoleOf(['Cocinero', 'Admin'])).toBe('Admin');
    expect(primaryRoleOf([])).toBeNull();
  });
});
