import { exportJWK, generateKeyPair, SignJWT, type JSONWebKeySet } from 'jose';
import type { Role } from '../../src/shared/domain/Auth';
import { CLAIM_ORG_ID, claimRolesForProject } from '../../src/shared/http/express/authenticate';

export interface TestKeys {
  privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
  jwks: JSONWebKeySet;
  kid: string;
}

export async function createTestKeys(): Promise<TestKeys> {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const kid = 'test-key-1';
  return { privateKey, kid, jwks: { keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] } };
}

export interface TokenInput {
  userId: string;
  orgId: string;
  /** roles por organización: { Admin: { [orgId]: 'dominio' } }; por defecto se asignan a `orgId`. */
  roles?: Role[];
  rolesForOtherOrg?: { orgId: string; roles: Role[] };
  /** `null` omite el claim, como hacen los tokens de acceso reales de Zitadel. */
  email?: string | null;
  name?: string | null;
  issuer?: string;
  audience?: string;
  projectId?: string;
  expiresIn?: string;
  omitOrgClaim?: boolean;
}

export async function tokenFor(keys: TestKeys, input: TokenInput): Promise<string> {
  const issuer = input.issuer ?? process.env.ZITADEL_ISSUER!;
  const audience = input.audience ?? process.env.ZITADEL_AUDIENCE!;
  const projectId = input.projectId ?? process.env.ZITADEL_PROJECT_ID!;

  const rolesClaim: Record<string, Record<string, string>> = {};
  for (const r of input.roles ?? []) rolesClaim[r] = { ...(rolesClaim[r] ?? {}), [input.orgId]: `${input.orgId}.test` };
  if (input.rolesForOtherOrg) {
    for (const r of input.rolesForOtherOrg.roles) {
      rolesClaim[r] = { ...(rolesClaim[r] ?? {}), [input.rolesForOtherOrg.orgId]: `${input.rolesForOtherOrg.orgId}.test` };
    }
  }

  const email = input.email === null ? null : (input.email ?? `${input.userId}@test.local`);
  const name = input.name === null ? null : (input.name ?? `Usuario ${input.userId}`);
  const payload: Record<string, unknown> = {
    ...(email ? { email } : {}),
    ...(name ? { name } : {}),
    [claimRolesForProject(projectId)]: rolesClaim,
  };
  if (!input.omitOrgClaim) payload[CLAIM_ORG_ID] = input.orgId;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: keys.kid })
    .setSubject(input.userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(input.expiresIn ?? '1h')
    .sign(keys.privateKey);
}
