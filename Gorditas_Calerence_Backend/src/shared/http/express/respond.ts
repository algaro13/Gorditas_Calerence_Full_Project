import type { Response } from 'express';

/** Sobre de respuesta que el frontend ya consume: { success, data, message }. */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
  code?: string;
  [extra: string]: unknown;
}

export function createResponse<T>(success: boolean, data: T | null, message?: string, extra?: Record<string, unknown>): ApiResponse<T> {
  return { success, data, ...(message !== undefined ? { message } : {}), ...(extra ?? {}) };
}

export function sendOk<T>(res: Response, data: T, message?: string, status = 200): void {
  res.status(status).json(createResponse(true, data, message));
}

export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendOk(res, data, message, 201);
}

export function sendError(res: Response, status: number, message: string, code?: string, details?: unknown): void {
  res.status(status).json({ success: false, data: null, message, ...(code ? { code } : {}), ...(details !== undefined ? { details } : {}) });
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function paginationOf(page: number, limit: number, total: number): Pagination {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

export function parsePagination(query: Record<string, unknown>, defaults = { page: 1, limit: 50, maxLimit: 200 }): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number.parseInt(String(query.page ?? defaults.page), 10) || defaults.page);
  const limit = Math.min(defaults.maxLimit, Math.max(1, Number.parseInt(String(query.limit ?? defaults.limit), 10) || defaults.limit));
  return { page, limit, skip: (page - 1) * limit };
}
