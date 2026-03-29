import type { FormatInfo } from './types';
import { canUseCanvas, convertImageViaCanvas } from './converters/image';
import { convertViaFFmpeg } from './converters/ffmpeg';
import { convertDocument } from './converters/document';

export { buildFFmpegArgs } from './converters/ffmpeg';

export async function convertFile(
  file: File,
  inputFormat: FormatInfo,
  outputFormat: FormatInfo,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  if (
    inputFormat.category === 'image'
    && outputFormat.category === 'image'
    && canUseCanvas(outputFormat)
  ) {
    try {
      return await convertImageViaCanvas(file, outputFormat, onProgress);
    } catch {
      // Canvas failed (e.g. unsupported input), fall through to FFmpeg
    }
  }

  if (inputFormat.category === 'document' && outputFormat.category === 'document') {
    return convertDocument(file, inputFormat, outputFormat, onProgress);
  }

  return convertViaFFmpeg(file, inputFormat, outputFormat, onProgress);
}
