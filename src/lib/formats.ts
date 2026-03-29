import type { FormatInfo } from './types';

export const FORMATS: FormatInfo[] = [
  // Images
  { extension: 'png', mimeType: 'image/png', category: 'image', label: 'PNG' },
  { extension: 'jpg', mimeType: 'image/jpeg', category: 'image', label: 'JPEG' },
  { extension: 'webp', mimeType: 'image/webp', category: 'image', label: 'WebP' },
  { extension: 'gif', mimeType: 'image/gif', category: 'image', label: 'GIF' },
  { extension: 'bmp', mimeType: 'image/bmp', category: 'image', label: 'BMP' },
  { extension: 'avif', mimeType: 'image/avif', category: 'image', label: 'AVIF' },
  { extension: 'ico', mimeType: 'image/x-icon', category: 'image', label: 'ICO' },
  { extension: 'tiff', mimeType: 'image/tiff', category: 'image', label: 'TIFF' },
  { extension: 'svg', mimeType: 'image/svg+xml', category: 'image', label: 'SVG' },

  // Audio
  { extension: 'mp3', mimeType: 'audio/mpeg', category: 'audio', label: 'MP3' },
  { extension: 'wav', mimeType: 'audio/wav', category: 'audio', label: 'WAV' },
  { extension: 'ogg', mimeType: 'audio/ogg', category: 'audio', label: 'OGG' },
  { extension: 'flac', mimeType: 'audio/flac', category: 'audio', label: 'FLAC' },
  { extension: 'aac', mimeType: 'audio/aac', category: 'audio', label: 'AAC' },
  { extension: 'm4a', mimeType: 'audio/mp4', category: 'audio', label: 'M4A' },

  // Video
  { extension: 'mp4', mimeType: 'video/mp4', category: 'video', label: 'MP4' },
  { extension: 'webm', mimeType: 'video/webm', category: 'video', label: 'WebM' },
  { extension: 'avi', mimeType: 'video/x-msvideo', category: 'video', label: 'AVI' },
  { extension: 'mkv', mimeType: 'video/x-matroska', category: 'video', label: 'MKV' },
  { extension: 'mov', mimeType: 'video/quicktime', category: 'video', label: 'MOV' },

  // Documents
  { extension: 'json', mimeType: 'application/json', category: 'document', label: 'JSON' },
  { extension: 'csv', mimeType: 'text/csv', category: 'document', label: 'CSV' },
];

export function getAcceptString(): string {
  const extensions = FORMATS.flatMap(f =>
    f.extension === 'jpg' ? ['.jpg', '.jpeg'] : [`.${f.extension}`],
  );
  return extensions.join(',');
}

export function getFormatsByCategory(): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const f of FORMATS) {
    (grouped[f.category] ??= []).push(f.label);
  }
  return grouped;
}

export function detectFormat(file: File): FormatInfo | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  const normalized = ext === 'jpeg' ? 'jpg' : ext;
  return FORMATS.find(f => f.extension === normalized) ?? null;
}

export function getOutputFormats(inputFormat: FormatInfo): FormatInfo[] {
  let formats = FORMATS.filter(
    f => f.category === inputFormat.category && f.extension !== inputFormat.extension,
  );

  if (inputFormat.category === 'image') {
    if (inputFormat.extension === 'svg') {
      // SVG can only convert to Canvas-supported raster formats
      formats = formats.filter(f => ['png', 'jpg', 'webp'].includes(f.extension));
    } else {
      // Raster images cannot convert TO SVG
      formats = formats.filter(f => f.extension !== 'svg');
    }
  }

  return formats;
}
