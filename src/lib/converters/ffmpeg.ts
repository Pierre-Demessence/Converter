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

/** Build FFmpeg CLI args from format codec metadata. Formats without codec config produce a stream-copy command. */
export function buildFFmpegArgs(
  inputName: string,
  outputName: string,
  outputFormat: FormatInfo,
): string[] {
  const args = ['-i', inputName];
  const codec = outputFormat.codec;

  if (codec?.audio) {
    args.push('-c:a', codec.audio.codec, ...codec.audio.args);
  }

  if (codec?.video) {
    args.push('-c:v', codec.video.codec, ...codec.video.args);
  }

  if (codec?.stripVideo) {
    args.push('-vn');
  }

  args.push('-y', outputName);
  return args;
}
