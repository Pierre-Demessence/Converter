import type { FormatInfo } from '../types';
import { IMAGE_FORMATS } from './image';
import { AUDIO_FORMATS } from './audio';
import { VIDEO_FORMATS } from './video';
import { DOCUMENT_FORMATS } from './document';

export const FORMATS: FormatInfo[] = [
  ...IMAGE_FORMATS,
  ...AUDIO_FORMATS,
  ...VIDEO_FORMATS,
  ...DOCUMENT_FORMATS,
];

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
      formats = formats.filter(f => f.canvasOutput);
    } else {
      formats = formats.filter(f => f.extension !== 'svg');
    }
  }

  return formats;
}

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
