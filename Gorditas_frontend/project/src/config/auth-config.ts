import { WebStorageStateStore, type UserManagerSettings } from 'oidc-client-ts';

export const ZITADEL_AUTHORITY = (import.meta.env.VITE_ZITADEL_AUTHORITY || 'http://localhost:8080').replace(/\/+$/, '');
export const ZITADEL_CLIENT_ID = import.meta.env.VITE_ZITADEL_CLIENT_ID || '';
export const ZITADEL_PROJECT_ID = import.meta.env.VITE_ZITADEL_PROJECT_ID || '';

export const BASE_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  `urn:zitadel:iam:org:project:id:${ZITADEL_PROJECT_ID}:aud`,
  'urn:zitadel:iam:org:projects:roles',
  'urn:zitadel:iam:user:resourceowner',
];

export const ORG_SCOPE_PREFIX = 'urn:zitadel:iam:org:id:';

export function scopesForOrg(orgId: string): string {
  return [...BASE_SCOPES, `${ORG_SCOPE_PREFIX}${orgId}`].join(' ');
}

export const oidcConfig: UserManagerSettings = {
  authority: ZITADEL_AUTHORITY,
  client_id: ZITADEL_CLIENT_ID,
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: BASE_SCOPES.join(' '),
  automaticSilentRenew: true,
  loadUserInfo: false,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
};
