import type { FormatInfo } from '../types';
import { getFFmpeg } from '../ffmpeg-manager';
import { fetchFile } from '@ffmpeg/util';

let ffmpegQueue = Promise.resolve<unknown>(undefined);

function enqueueFFmpeg<T>(fn: () => Promise<T>): Promise<T> {
  const result = ffmpegQueue.then(fn);
  ffmpegQueue = result.then(() => {}, () => {});
  return result;
}

export async function convertViaFFmpeg(
  file: File,
  inputFormat: FormatInfo,
  outputFormat: FormatInfo,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  return enqueueFFmpeg(async () => {
    onProgress?.(5);

    const ffmpeg = await getFFmpeg();
    onProgress?.(15);

    const uid = crypto.randomUUID().slice(0, 8);
    const inputName = `in_${uid}.${inputFormat.extension}`;
    const outputName = `out_${uid}.${outputFormat.extension}`;

    const cleanup = async () => {
      try { await ffmpeg.deleteFile(inputName); } catch { /* noop */ }
      try { await ffmpeg.deleteFile(outputName); } catch { /* noop */ }
    };

    await ffmpeg.writeFile(inputName, await fetchFile(file));
    onProgress?.(20);

    const args = buildFFmpegArgs(inputName, outputName, outputFormat);

    const progressHandler = ({ progress }: { progress: number }) => {
      onProgress?.(20 + Math.min(progress, 1) * 70);
    };
    ffmpeg.on('progress', progressHandler);

    let exitCode: number;
    try {
      exitCode = await ffmpeg.exec(args);
    } catch (err) {
      await cleanup();
      throw err;
    } finally {
      ffmpeg.off('progress', progressHandler);
    }

    if (exitCode !== 0) {
      await cleanup();
      throw new Error(`Conversion failed (FFmpeg exit code ${exitCode})`);
    }

    onProgress?.(92);

    const data = await ffmpeg.readFile(outputName);
    await cleanup();

    onProgress?.(100);

    const buffer = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data.slice();
    return new Blob([buffer], { type: outputFormat.mimeType });
  });
}

export function buildFFmpegArgs(
  inputName: string,
  outputName: string,
  outputFormat: FormatInfo,
): string[] {
  const args = ['-i', inputName];

  if (outputFormat.category === 'audio') {
    switch (outputFormat.extension) {
      case 'mp3':
        args.push('-c:a', 'libmp3lame', '-q:a', '2');
        break;
      case 'ogg':
        args.push('-c:a', 'libvorbis', '-q:a', '6');
        break;
      case 'flac':
        args.push('-c:a', 'flac');
        break;
      case 'aac':
      case 'm4a':
        args.push('-c:a', 'aac', '-b:a', '192k');
        break;
      case 'wav':
        args.push('-c:a', 'pcm_s16le');
        break;
    }
    args.push('-vn');
  }

  if (outputFormat.category === 'video') {
    switch (outputFormat.extension) {
      case 'mp4':
        args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
        break;
      case 'webm':
        args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0');
        break;
      case 'avi':
        args.push('-c:v', 'mpeg4', '-q:v', '5');
        break;
      case 'mkv':
      case 'mov':
        args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
        break;
    }
  }

  args.push('-y', outputName);
  return args;
}
