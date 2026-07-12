import { Configuration, LogLevel } from '@azure/msal-browser';

const clientId = 'fe1da7e9-2e49-470b-8ac4-5534f45d2a9b';
const tenantId = 'f126e948-b284-4332-ade2-6cffc98a879d';

// For External ID (CIAM) tenants, use the ciamlogin.com authority
const authority = `https://calerence.ciamlogin.com/${tenantId}`;

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority,
    knownAuthorities: ['calerence.ciamlogin.com'],
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};

export const tokenRequest = {
  scopes: [`${clientId}/.default`],
};
