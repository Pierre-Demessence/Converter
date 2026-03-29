import type { FormatInfo } from './types';
import { canUseCanvas, convertImageViaCanvas } from './converters/image';
import { convertViaFFmpeg } from './converters/ffmpeg';
import { convertDocument } from './converters/document';
import { supportsOffscreenCanvas, convertImageInWorker } from './image-worker-client';

export { buildFFmpegArgs } from './converters/ffmpeg';

export async function convertFile(
  file: File,
  inputFormat: FormatInfo,
  outputFormat: FormatInfo,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  // Canvas-first for image→image when output supports it
  if (inputFormat.category === 'image' && canUseCanvas(outputFormat)) {
    try {
      // OffscreenCanvas worker keeps the main thread responsive for large images
      if (supportsOffscreenCanvas()) {
        return await convertImageInWorker(
          file, inputFormat.mimeType, outputFormat.mimeType, onProgress,
        );
      }
      return await convertImageViaCanvas(file, outputFormat, onProgress);
    } catch {
      // Canvas failed (e.g. unsupported input), fall through to FFmpeg
    }
  }

  // Route by converter hint (documents self-declare)
  if (outputFormat.converterHint === 'document' || inputFormat.converterHint === 'document') {
    return convertDocument(file, inputFormat, outputFormat, onProgress);
  }

  // Default: FFmpeg handles audio, video, and remaining images
  return convertViaFFmpeg(file, inputFormat, outputFormat, onProgress);
}
