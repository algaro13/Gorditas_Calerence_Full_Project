import multer from 'multer';
import type { RequestHandler } from 'express';
import { IMAGE_MIME_EXT, MAX_IMAGE_BYTES } from '../../infrastructure/storage/LocalFileStorage';

/** Una imagen en memoria (campo `image`), 2 MB, JPEG/PNG/WebP. El error se traduce en errorHandler. */
export function singleImageUpload(field = 'image'): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (IMAGE_MIME_EXT[file.mimetype]) cb(null, true);
      else cb(Object.assign(new Error('Formato no válido. Use JPG, PNG o WebP.'), { status: 400, code: 'IMAGE_TYPE' }));
    },
  });
  return upload.single(field);
}
