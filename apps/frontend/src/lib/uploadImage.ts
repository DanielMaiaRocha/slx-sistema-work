import { fetchApi } from './api';

/**
 * Downscale + re-encode an image in the browser before upload.
 * A modern phone photo is 3–12 MB; this brings it to a few hundred KB,
 * which is what makes 100+ photos per inspection actually uploadable.
 * If anything goes wrong (e.g. HEIC that the browser can't decode), the
 * original file is returned and Cloudinary handles the conversion.
 */
export async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.8
): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
      const scale = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    // Only use the compressed version if it's actually smaller.
    if (blob && blob.size < file.size) return blob;
    return file;
  } catch {
    return file;
  }
}

// ─── Concurrency gate ────────────────────────────────────────────────────────
// Selecting 100 photos at once must NOT fire 100 parallel compress+upload jobs:
// that spikes memory (100 simultaneous bitmaps) and floods a mobile connection,
// which is exactly what we're fixing. Process a few at a time instead.
const MAX_CONCURRENT = 3;
let active = 0;
const waiters: Array<() => void> = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

/**
 * Compress (images only) and upload a single file to the backend, returning the
 * stored URL. Concurrency-limited, and retries with exponential backoff so a
 * transient mobile-network blip doesn't lose the photo.
 */
export async function uploadFileImmediate(
  file: File,
  opts: { retries?: number } = {}
): Promise<string> {
  const retries = opts.retries ?? 3;
  const isImage = file.type.startsWith('image/');

  return withSlot(async () => {
    const payload = isImage ? await compressImage(file) : file;
    const name = isImage
      ? file.name.replace(/\.[^.]+$/, '') + '.jpg'
      : file.name || 'upload';

    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const fd = new FormData();
        fd.append('file', payload, name);
        const res = await fetchApi('/upload', { method: 'POST', body: fd });
        if (!res?.url) throw new Error('Resposta de upload sem URL');
        return res.url as string;
      } catch (e) {
        lastErr = e;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Falha no upload');
  });
}
