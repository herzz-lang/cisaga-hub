import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB binary limit
export const UPLOAD_FILENAME_REGEX = /^umkm-[a-zA-Z0-9_-]+\.(jpg|png|webp)$/;
export const UPLOAD_URL_PATH_REGEX = /^\/uploads\/umkm-[a-zA-Z0-9_-]+\.(jpg|png|webp)$/;

const DATA_URL_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

export type AllowedImageExt = 'jpg' | 'png' | 'webp';

export interface DecodedImageUpload {
  ext: AllowedImageExt;
  contentType: string;
  buffer: Buffer;
}

export function detectImageMagicBytes(buffer: Buffer): { ext: AllowedImageExt; contentType: string } | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: 'png', contentType: 'image/png' };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { ext: 'webp', contentType: 'image/webp' };
  }

  return null;
}

export function decodeValidatedImageDataUrl(dataUrl: string): DecodedImageUpload {
  if (typeof dataUrl !== 'string') {
    throw new Error('Format file gambar tidak valid.');
  }

  const trimmed = dataUrl.trim();
  const match = DATA_URL_REGEX.exec(trimmed);
  if (!match) {
    throw new Error('Hanya file gambar JPG, PNG, atau WebP yang diperbolehkan.');
  }

  const base64Body = match[2];
  const estimatedBytes = Math.ceil((base64Body.length * 3) / 4);
  if (estimatedBytes > MAX_UPLOAD_BYTES + 64) {
    throw new Error('Ukuran foto maksimal 2 MB.');
  }

  const buffer = Buffer.from(base64Body, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran foto harus antara 1 byte hingga 2 MB.');
  }

  const detected = detectImageMagicBytes(buffer);
  if (!detected) {
    throw new Error('Isi file tidak dikenali sebagai foto JPG, PNG, atau WebP yang valid.');
  }

  return {
    ext: detected.ext,
    contentType: detected.contentType,
    buffer,
  };
}

export function saveValidatedImageUpload(
  dataUrl: string,
  uploadsDir = path.resolve(process.cwd(), '.data', 'uploads')
): { url: string; filename: string; contentType: string; sizeBytes: number } {
  const decoded = decodeValidatedImageDataUrl(dataUrl);
  const resolvedBase = path.resolve(uploadsDir);
  fs.mkdirSync(resolvedBase, { recursive: true });

  const filename = `umkm-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${decoded.ext}`;
  const targetPath = path.resolve(resolvedBase, filename);
  if (!targetPath.startsWith(resolvedBase + path.sep)) {
    throw new Error('Path upload tidak valid.');
  }

  const tmpPath = `${targetPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, decoded.buffer);
  fs.renameSync(tmpPath, targetPath);

  return {
    url: `/uploads/${filename}`,
    filename,
    contentType: decoded.contentType,
    sizeBytes: decoded.buffer.length,
  };
}

export function resolveSafeUploadFilePath(
  filename: string,
  uploadsDir = path.resolve(process.cwd(), '.data', 'uploads')
): { filePath: string; contentType: string } | null {
  if (typeof filename !== 'string' || !UPLOAD_FILENAME_REGEX.test(filename)) {
    return null;
  }

  const resolvedBase = path.resolve(uploadsDir);
  const targetPath = path.resolve(resolvedBase, filename);
  if (!targetPath.startsWith(resolvedBase + path.sep)) {
    return null;
  }

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType =
    ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  return { filePath: targetPath, contentType };
}
