/** Error de la fase previa al redirect a Zitadel (resolución del restaurante). */
export class LoginError extends Error {
  constructor(
    public readonly code: 'NO_SLUG' | 'TENANT_NOT_FOUND' | 'NETWORK',
    message: string,
  ) {
    super(message);
    this.name = 'LoginError';
  }
}
