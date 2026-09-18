/**
 * Ejecuta algo en el contexto de un restaurante concreto, sin depender de que venga de una
 * petición HTTP. Lo necesitan los trabajos que recorren la plataforma entera: sin esto no hay
 * `app.tenant_id` fijado y RLS no deja ver nada.
 */
export interface TenantScope {
  run<T>(tenantId: string, fn: () => Promise<T>): Promise<T>;
}
