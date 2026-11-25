const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_DIMENSION = 1280;
const TARGET_MAX_RAW_BYTES = 1_500_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file foto.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file foto.'));
    reader.readAsDataURL(file);
  });
}

function resizeImageDataUrlIfNeeded(dataUrl: string, mimeType: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;
      if (naturalWidth <= MAX_DIMENSION && naturalHeight <= MAX_DIMENSION) {
        resolve(dataUrl);
        return;
      }

      const scale = Math.min(MAX_DIMENSION / naturalWidth, MAX_DIMENSION / naturalHeight);
      const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
      const targetHeight = Math.max(1, Math.round(naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const outputType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      resolve(canvas.toDataURL(outputType, 0.86));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function prepareAdminImageDataUrl(file: File): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Pilih file foto berformat JPG, PNG, atau WebP.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Ukuran file foto mentah maksimal 10 MB.');
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  if (file.size <= TARGET_MAX_RAW_BYTES) {
    return resizeImageDataUrlIfNeeded(rawDataUrl, file.type);
  }
  return resizeImageDataUrlIfNeeded(rawDataUrl, 'image/jpeg');
}
