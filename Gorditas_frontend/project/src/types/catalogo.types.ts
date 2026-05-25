export interface CatalogListParams {
  page?: number;
  limit?: number;
  activo?: boolean;
  search?: string;
}

export interface CatalogResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
