/**
 * Errores de dominio/aplicación. La capa HTTP los traduce a códigos de estado.
 * Los mensajes son para el usuario final (español); `code` es estable para el frontend.
 */
export abstract class DomainError extends Error {
  abstract readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  protected constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends DomainError {
  readonly status = 404;
  constructor(message = 'Recurso no encontrado', code = 'NOT_FOUND', details?: unknown) {
    super(message, code, details);
  }
}

export class ConflictError extends DomainError {
  readonly status = 409;
  constructor(message = 'Conflicto con el estado actual', code = 'CONFLICT', details?: unknown) {
    super(message, code, details);
  }
}

export class ForbiddenError extends DomainError {
  readonly status = 403;
  constructor(message = 'No tienes permisos para esta acción', code = 'FORBIDDEN', details?: unknown) {
    super(message, code, details);
  }
}

export class UnauthorizedError extends DomainError {
  readonly status = 401;
  constructor(message = 'No autenticado', code = 'UNAUTHORIZED', details?: unknown) {
    super(message, code, details);
  }
}

export class ValidationError extends DomainError {
  readonly status = 400;
  constructor(message = 'Datos inválidos', code = 'VALIDATION', details?: unknown) {
    super(message, code, details);
  }
}

export class PaymentRequiredError extends DomainError {
  readonly status = 403;
  constructor(message: string, code: 'TRIAL_EXPIRED' | 'SUBSCRIPTION_INACTIVE' | 'USER_LIMIT_REACHED', details?: unknown) {
    super(message, code, details);
  }
}

export class ExternalServiceError extends DomainError {
  readonly status = 502;
  constructor(message = 'Error en un servicio externo', code = 'EXTERNAL_SERVICE', details?: unknown) {
    super(message, code, details);
  }
}

export class NoTenantContextError extends Error {
  constructor() {
    super('No tenant context');
    this.name = 'NoTenantContextError';
  }
}
