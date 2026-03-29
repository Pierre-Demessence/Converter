import type { FormatInfo } from '../types';

const CANVAS_OUTPUT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function canUseCanvas(outputFormat: FormatInfo): boolean {
  return CANVAS_OUTPUT_TYPES.has(outputFormat.mimeType);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export async function convertImageViaCanvas(
  file: File,
  outputFormat: FormatInfo,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  onProgress?.(10);

  const img = await loadImage(file);
  onProgress?.(40);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(img, 0, 0);
  onProgress?.(70);

  const quality = outputFormat.mimeType === 'image/png' ? undefined : 0.92;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
      outputFormat.mimeType,
      quality,
    );
  });

  onProgress?.(100);
  return blob;
}
