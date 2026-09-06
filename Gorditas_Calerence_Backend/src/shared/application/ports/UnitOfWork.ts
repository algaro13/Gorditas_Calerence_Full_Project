/**
 * Unidad de trabajo: ejecuta `fn` dentro de una transacción ligada al tenant actual.
 * La capa de aplicación no sabe cómo se implementa (Prisma + SET LOCAL app.tenant_id).
 * Llamadas anidadas reutilizan la transacción en curso.
 */
export interface UnitOfWork {
  run<T>(fn: () => Promise<T>, opts?: { timeoutMs?: number }): Promise<T>;
}
