import type { IdentityProvider, NewAdminAccount, NewStaffAccount } from '../../shared/application/ports/IdentityProvider';
import type { Logger } from '../../shared/application/ports/Logger';
import type { Role } from '../../shared/domain/Auth';
import { ExternalServiceError } from '../../shared/domain/DomainError';

export interface ZitadelConfig {
  apiUrl: string;
  pat: string;
  projectId: string;
  defaultOrgId: string;
  spaAppId: string;
}

type Json = Record<string, unknown>;

/**
 * Adaptador a la Management API (v1) y a los servicios v2 de Zitadel.
 * Referencias: proto/zitadel/management.proto, org/v2/org_service.proto, user/v2/user_service.proto (v4.17).
 */
export class ZitadelIdentityProvider implements IdentityProvider {
  private redirectQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly cfg: ZitadelConfig,
    private readonly logger: Logger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async call<T = Json>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, orgId?: string): Promise<T> {
    const res = await this.fetchImpl(`${this.cfg.apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.cfg.pat}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(orgId ? { 'x-zitadel-orgid': orgId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      this.logger.error('Zitadel respondió error', { method, path, status: res.status, body: text.slice(0, 500) });
      throw new ExternalServiceError('El proveedor de identidad rechazó la operación', 'ZITADEL', { status: res.status, path });
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  async createOrganizationWithAdmin(input: { name: string; admin: NewAdminAccount }): Promise<{ orgId: string; userId: string }> {
    const res = await this.call<{ organizationId: string; createdAdmins?: Array<{ userId: string }> }>('POST', '/v2/organizations', {
      name: input.name,
      admins: [
        {
          human: {
            profile: { givenName: input.admin.givenName, familyName: input.admin.familyName },
            // sendCode: Zitadel envía el correo de verificación con el SMTP activo
            email: { email: input.admin.email, sendCode: {} },
            password: { password: input.admin.password, changeRequired: false },
          },
          roles: ['ORG_OWNER'],
        },
      ],
    });
    const userId = res.createdAdmins?.[0]?.userId;
    if (!userId) throw new ExternalServiceError('Zitadel no devolvió el usuario administrador', 'ZITADEL');
    return { orgId: res.organizationId, userId };
  }

  async deleteOrganization(orgId: string): Promise<void> {
    await this.call('DELETE', `/v2/organizations/${orgId}`);
  }

  async grantProjectToOrganization(orgId: string): Promise<{ projectGrantId: string }> {
    const res = await this.call<{ grantId: string }>(
      'POST',
      `/management/v1/projects/${this.cfg.projectId}/grants`,
      { grantedOrgId: orgId, roleKeys: ['Admin', 'Encargado', 'Mesero', 'Despachador', 'Cocinero'] },
      this.cfg.defaultOrgId,
    );
    return { projectGrantId: res.grantId };
  }

  async createUser(input: NewStaffAccount): Promise<{ userId: string }> {
    const res = await this.call<{ userId: string }>('POST', '/v2/users/human', {
      organization: { orgId: input.orgId },
      profile: { givenName: input.givenName, familyName: input.familyName },
      email: { email: input.email, isVerified: true },
    });
    return { userId: res.userId };
  }

  async sendSetPasswordLink(userId: string): Promise<void> {
    await this.call('POST', `/v2/users/${userId}/password_reset`, {
      sendLink: { notificationType: 'NOTIFICATION_TYPE_Email' },
    });
  }

  async assignRole(input: { orgId: string; userId: string; projectGrantId: string; role: Role }): Promise<{ grantId: string }> {
    const res = await this.call<{ userGrantId: string }>(
      'POST',
      `/management/v1/users/${input.userId}/grants`,
      { projectId: this.cfg.projectId, projectGrantId: input.projectGrantId, roleKeys: [input.role] },
      input.orgId,
    );
    return { grantId: res.userGrantId };
  }

  async updateRole(input: { orgId: string; userId: string; grantId: string; role: Role }): Promise<void> {
    await this.call('PUT', `/management/v1/users/${input.userId}/grants/${input.grantId}`, { roleKeys: [input.role] }, input.orgId);
  }

  async isEmailVerified(userId: string): Promise<boolean> {
    const res = await this.call<{ user?: { human?: { email?: { isVerified?: boolean } } } }>('GET', `/v2/users/${userId}`);
    return res.user?.human?.email?.isVerified === true;
  }

  async resendEmailVerification(userId: string): Promise<void> {
    const res = await this.call<{ user?: { human?: { email?: { email?: string } } } }>('GET', `/v2/users/${userId}`);
    const email = res.user?.human?.email?.email;
    if (!email) throw new ExternalServiceError('El usuario no tiene correo registrado', 'ZITADEL');
    // Reponer el correo con sendCode vuelve a emitir el código de verificación.
    await this.call('POST', `/v2/users/${userId}/email`, { email, sendCode: {} });
  }

  async setUserActive(userId: string, active: boolean): Promise<void> {
    await this.call('POST', `/v2/users/${userId}/${active ? 'reactivate' : 'deactivate'}`, {});
  }

  async deleteUser(userId: string): Promise<void> {
    await this.call('DELETE', `/v2/users/${userId}`);
  }

  /** Read-modify-write serializado: la app SPA guarda la lista completa de URIs. */
  registerRedirectUris(input: { redirect: string[]; postLogout: string[] }): Promise<void> {
    const task = this.redirectQueue.then(() => this.doRegisterRedirectUris(input));
    this.redirectQueue = task.catch(() => undefined);
    return task;
  }

  private async doRegisterRedirectUris(input: { redirect: string[]; postLogout: string[] }): Promise<void> {
    const app = await this.call<{ app: { oidcConfig: Json } }>(
      'GET',
      `/management/v1/projects/${this.cfg.projectId}/apps/${this.cfg.spaAppId}`,
      undefined,
      this.cfg.defaultOrgId,
    );
    const oidc = app.app.oidcConfig;
    const current = (oidc.redirectUris as string[] | undefined) ?? [];
    const currentLogout = (oidc.postLogoutRedirectUris as string[] | undefined) ?? [];
    const redirectUris = Array.from(new Set([...current, ...input.redirect]));
    const postLogoutRedirectUris = Array.from(new Set([...currentLogout, ...input.postLogout]));
    if (redirectUris.length === current.length && postLogoutRedirectUris.length === currentLogout.length) return;

    await this.call(
      'PUT',
      `/management/v1/projects/${this.cfg.projectId}/apps/${this.cfg.spaAppId}/oidc_config`,
      {
        redirectUris,
        postLogoutRedirectUris,
        responseTypes: oidc.responseTypes,
        grantTypes: oidc.grantTypes,
        appType: oidc.appType,
        authMethodType: oidc.authMethodType,
        devMode: oidc.devMode,
        accessTokenType: oidc.accessTokenType,
        accessTokenRoleAssertion: oidc.accessTokenRoleAssertion,
        idTokenRoleAssertion: oidc.idTokenRoleAssertion,
        idTokenUserinfoAssertion: oidc.idTokenUserinfoAssertion,
        clockSkew: oidc.clockSkew,
        additionalOrigins: oidc.additionalOrigins,
        skipNativeAppSuccessPage: oidc.skipNativeAppSuccessPage,
        backChannelLogoutUri: oidc.backChannelLogoutUri,
        loginVersion: oidc.loginVersion,
      },
      this.cfg.defaultOrgId,
    );
  }
}
