import type { FormatInfo } from '../types';

export const IMAGE_FORMATS: FormatInfo[] = [
  { extension: 'png', mimeType: 'image/png', category: 'image', label: 'PNG', canvasOutput: true },
  { extension: 'jpg', mimeType: 'image/jpeg', category: 'image', label: 'JPEG', canvasOutput: true },
  { extension: 'webp', mimeType: 'image/webp', category: 'image', label: 'WebP', canvasOutput: true },
  { extension: 'gif', mimeType: 'image/gif', category: 'image', label: 'GIF' },
  { extension: 'bmp', mimeType: 'image/bmp', category: 'image', label: 'BMP' },
  { extension: 'avif', mimeType: 'image/avif', category: 'image', label: 'AVIF' },
  { extension: 'ico', mimeType: 'image/x-icon', category: 'image', label: 'ICO' },
  { extension: 'tiff', mimeType: 'image/tiff', category: 'image', label: 'TIFF' },
  { extension: 'svg', mimeType: 'image/svg+xml', category: 'image', label: 'SVG' },
];
