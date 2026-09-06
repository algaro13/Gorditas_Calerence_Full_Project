export interface ProvisionInput {
  tenantId: string;
  admin: { zitadelUserId: string; email: string; nombre: string };
  mesas: Array<{ nombre: string }>;
  platillos: Array<{ nombre: string; precio: number }>;
  guisos: Array<{ nombre: string }>;
}

/** Siembra el catálogo inicial y el espejo del administrador dentro del contexto del tenant (una transacción). */
export interface TenantProvisioner {
  provision(input: ProvisionInput): Promise<void>;
}
