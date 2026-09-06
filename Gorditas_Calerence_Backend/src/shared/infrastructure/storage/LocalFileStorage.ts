import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FileStorage, StoredFile, UploadedImage } from '../../application/ports/FileStorage';
import { ValidationError } from '../../domain/DomainError';

export const IMAGE_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Disco local bajo UPLOADS_DIR; servido por Express en /uploads. */
export class LocalFileStorage implements FileStorage {
  constructor(private readonly rootDir: string) {}

  private validate(file: UploadedImage): string {
    const ext = IMAGE_MIME_EXT[file.mimeType];
    if (!ext) throw new ValidationError('Formato no válido. Use JPG, PNG o WebP.', 'IMAGE_TYPE');
    if (file.size > MAX_IMAGE_BYTES) throw new ValidationError('La imagen no debe exceder 2MB', 'IMAGE_TOO_LARGE');
    return ext;
  }

  private async write(dirName: string, ext: string, buffer: Buffer): Promise<StoredFile> {
    const dir = path.join(this.rootDir, ...dirName.split('/'));
    await fs.mkdir(dir, { recursive: true });
    // Un solo logo por carpeta: elimina versiones con otra extensión
    for (const old of await fs.readdir(dir)) if (old.startsWith('logo.')) await fs.rm(path.join(dir, old), { force: true });
    await fs.writeFile(path.join(dir, `logo.${ext}`), buffer);
    return { url: `/uploads/${dirName}/logo.${ext}` };
  }

  saveTemporaryLogo(file: UploadedImage): Promise<StoredFile> {
    const ext = this.validate(file);
    return this.write(`tmp/${randomUUID()}`, ext, file.buffer);
  }

  saveTenantLogo(tenantId: string, file: UploadedImage): Promise<StoredFile> {
    const ext = this.validate(file);
    return this.write(tenantId, ext, file.buffer);
  }

  async promoteTemporaryLogo(tempUrl: string, tenantId: string): Promise<StoredFile | null> {
    const m = /^\/uploads\/tmp\/([A-Za-z0-9-]{8,64})\/logo\.(jpg|png|webp)$/.exec(tempUrl);
    if (!m) return null;
    const src = path.join(this.rootDir, 'tmp', m[1], `logo.${m[2]}`);
    try {
      const buffer = await fs.readFile(src);
      const stored = await this.write(tenantId, m[2], buffer);
      await fs.rm(path.join(this.rootDir, 'tmp', m[1]), { recursive: true, force: true });
      return stored;
    } catch {
      return null;
    }
  }

  isTenantUrl(url: string, tenantId: string): boolean {
    if (!SAFE_ID.test(tenantId)) return false;
    return new RegExp(`^/uploads/${tenantId}/logo\\.(jpg|png|webp)$`).test(url);
  }
}
