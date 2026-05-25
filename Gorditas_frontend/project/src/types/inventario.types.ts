export interface RecibirProductoItem {
  idProducto: string;
  cantidad: number;
}

export interface AjustarInventarioDTO {
  cantidad: number;
  motivo?: string;
}

export interface InventarioResponse {
  productos: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  resumen: {
    total: number;
    stockBajo: number;
    stockAgotado: number;
  };
}
