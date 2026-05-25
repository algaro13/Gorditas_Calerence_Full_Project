export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  roles: string[];
}

export interface OrderStep {
  step: number;
  title: string;
  completed: boolean;
}

export interface MesaAgrupada {
  idMesa: number;
  nombreMesa: string;
  ordenes: any[];
  totalOrdenes: number;
  totalMonto: number;
  clientes: { [cliente: string]: any[] };
}
