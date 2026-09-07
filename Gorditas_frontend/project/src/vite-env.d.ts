/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_DOMAIN?: string;
  readonly VITE_APP_PLATFORM_HOST?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_ZITADEL_AUTHORITY?: string;
  readonly VITE_ZITADEL_CLIENT_ID?: string;
  readonly VITE_ZITADEL_PROJECT_ID?: string;
  readonly VITE_BRAND_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
