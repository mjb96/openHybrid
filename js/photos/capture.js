// @ts-check
// =============================================================================
// PHOTO CAPTURE (js/photos/capture.js)
//
// A camera photo is several megabytes; a progress photo needs to be legible, not
// archival. Downscaling BEFORE storage is what keeps a hundred photos inside a
// phone's quota, and why the stored blob is ~150–250 KB instead of 4 MB.
//
// `fitWithin` is pure so the geometry is testable without a canvas.
// =============================================================================

/**
 * @param {number} width @param {number} height @param {number} maxEdge
 * @returns {{ width: number, height: number }}
 */
export function fitWithin(width, height, maxEdge = 1200) {
  const w = Math.max(1, Math.round(Number(width) || 0));
  const h = Math.max(1, Math.round(Number(height) || 0));
  const limit = Math.max(1, Number(maxEdge) || 1200);
  if (w <= limit && h <= limit) return { width: w, height: h };
  const scale = limit / Math.max(w, h);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/**
 * Downscale an image file to a JPEG blob. Rejects with a readable message rather
 * than a DOM exception, because the caller surfaces it to the athlete.
 *
 * @param {File|Blob} file
 * @param {{ maxEdge?: number, quality?: number }} [options]
 * @returns {Promise<{ blob: Blob, width: number, height: number }>}
 */
export async function downscaleToJpeg(file, options = {}) {
  const maxEdge = options.maxEdge || 1200;
  const quality = options.quality || 0.82;
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new Error('That file is not an image.');
  }

  const bitmap = await loadBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This device could not prepare the image.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  if (typeof bitmap.close === 'function') bitmap.close();

  const blob = await new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') { resolve(null); return; }
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
  if (!blob) throw new Error('This device could not encode the image.');
  return { blob, width, height };
}

/** @param {File|Blob} file */
async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('That image could not be read.'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
