import type { FileCategory } from './types';

const MB = 1024 * 1024;

const SIZE_LIMITS: Record<FileCategory, number> = {
  image: 50 * MB,
  audio: 100 * MB,
  video: 200 * MB,
  document: 10 * MB,
};

export function checkFileSize(
  file: File,
  category: FileCategory,
): string | null {
  const limit = SIZE_LIMITS[category];
  if (file.size > limit) {
    const limitMB = limit / MB;
    return `File is too large (${formatMB(file.size)}). Maximum for ${category} files is ${limitMB} MB.`;
  }
  return null;
}

function formatMB(bytes: number): string {
  return `${(bytes / MB).toFixed(1)} MB`;
}
