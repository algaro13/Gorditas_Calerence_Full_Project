import { randomUUID } from 'node:crypto';
import type { IdentityProvider, NewAdminAccount, NewStaffAccount } from '../../shared/application/ports/IdentityProvider';
import type { Role } from '../../shared/domain/Auth';

export interface FakeOrg {
  id: string;
  name: string;
  projectGrantId?: string;
  users: Map<string, { email: string; givenName: string; familyName: string; active: boolean; role?: Role; grantId?: string }>;
}

/** Proveedor de identidad en memoria para pruebas y desarrollo sin Zitadel. */
export class FakeIdentityProvider implements IdentityProvider {
  readonly orgs = new Map<string, FakeOrg>();
  readonly redirectUris = new Set<string>();
  readonly postLogoutUris = new Set<string>();
  readonly passwordLinksSent: string[] = [];
  readonly deletedUsers: string[] = [];
  private seq = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}-${randomUUID().slice(0, 8)}`;
  }

  async createOrganizationWithAdmin(input: { name: string; admin: NewAdminAccount }): Promise<{ orgId: string; userId: string }> {
    const orgId = this.nextId('org');
    const userId = this.nextId('user');
    const org: FakeOrg = { id: orgId, name: input.name, users: new Map() };
    org.users.set(userId, { email: input.admin.email, givenName: input.admin.givenName, familyName: input.admin.familyName, active: true });
    this.orgs.set(orgId, org);
    return { orgId, userId };
  }

  async deleteOrganization(orgId: string): Promise<void> {
    this.orgs.delete(orgId);
  }

  async grantProjectToOrganization(orgId: string): Promise<{ projectGrantId: string }> {
    const org = this.requireOrg(orgId);
    org.projectGrantId = org.projectGrantId ?? this.nextId('grant');
    return { projectGrantId: org.projectGrantId };
  }

  async createUser(input: NewStaffAccount): Promise<{ userId: string }> {
    const org = this.requireOrg(input.orgId);
    const userId = this.nextId('user');
    org.users.set(userId, { email: input.email, givenName: input.givenName, familyName: input.familyName, active: true });
    return { userId };
  }

  async sendSetPasswordLink(userId: string): Promise<void> {
    this.passwordLinksSent.push(userId);
  }

  async assignRole(input: { orgId: string; userId: string; projectGrantId: string; role: Role }): Promise<{ grantId: string }> {
    const user = this.requireUser(input.orgId, input.userId);
    user.role = input.role;
    user.grantId = user.grantId ?? this.nextId('ugrant');
    return { grantId: user.grantId };
  }

  async updateRole(input: { orgId: string; userId: string; grantId: string; role: Role }): Promise<void> {
    this.requireUser(input.orgId, input.userId).role = input.role;
  }

  async setUserActive(userId: string, active: boolean): Promise<void> {
    for (const org of this.orgs.values()) {
      const u = org.users.get(userId);
      if (u) u.active = active;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    for (const org of this.orgs.values()) org.users.delete(userId);
    this.deletedUsers.push(userId);
  }

  async registerRedirectUris(input: { redirect: string[]; postLogout: string[] }): Promise<void> {
    input.redirect.forEach((u) => this.redirectUris.add(u));
    input.postLogout.forEach((u) => this.postLogoutUris.add(u));
  }

  private requireOrg(orgId: string): FakeOrg {
    const org = this.orgs.get(orgId);
    if (!org) throw new Error(`FakeIdentityProvider: org ${orgId} no existe`);
    return org;
  }

  private requireUser(orgId: string, userId: string) {
    const user = this.requireOrg(orgId).users.get(userId);
    if (!user) throw new Error(`FakeIdentityProvider: usuario ${userId} no existe en ${orgId}`);
    return user;
  }
}
