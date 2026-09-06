export interface StoredFile {
  /** Ruta pública relativa (p. ej. /uploads/<tenantId>/logo.png). */
  url: string;
}

export interface UploadedImage {
  buffer: Buffer;
  mimeType: string;
  size: number;
}

/** Almacenamiento de archivos por tenant (disco local hoy; S3/R2 mañana). */
export interface FileStorage {
  /** Guarda un logo temporal (registro aún sin tenant). Devuelve su url temporal. */
  saveTemporaryLogo(file: UploadedImage): Promise<StoredFile>;
  /** Guarda el logo definitivo del tenant. */
  saveTenantLogo(tenantId: string, file: UploadedImage): Promise<StoredFile>;
  /** Mueve un logo temporal (por su url) a la carpeta del tenant. null si la url no es temporal válida. */
  promoteTemporaryLogo(tempUrl: string, tenantId: string): Promise<StoredFile | null>;
  /** true si la url apunta dentro de la carpeta del tenant. */
  isTenantUrl(url: string, tenantId: string): boolean;
}
