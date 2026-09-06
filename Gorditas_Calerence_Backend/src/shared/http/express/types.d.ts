import type { AuthInfo } from '../../domain/Auth';
import type { TenantInfo } from '../../domain/Tenant';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthInfo;
      tenant?: TenantInfo;
      requestId?: string;
    }
  }
}

export {};
