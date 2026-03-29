import type { FormatInfo } from './types';
import { getFFmpeg } from './ffmpeg-manager';
import { fetchFile } from '@ffmpeg/util';

const CANVAS_OUTPUT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function convertFile(
  file: File,
  inputFormat: FormatInfo,
  outputFormat: FormatInfo,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  // Image → Image via Canvas when output is natively supported
  if (
    inputFormat.category === 'image'
    && outputFormat.category === 'image'
    && CANVAS_OUTPUT_TYPES.has(outputFormat.mimeType)
  ) {
    try {
      return await convertImageViaCanvas(file, outputFormat, onProgress);
    } catch {
      // Canvas failed (e.g. unsupported input), fall through to FFmpeg
    }
  }

  // Document → Document
  if (inputFormat.category === 'document' && outputFormat.category === 'document') {
    return convertDocument(file, inputFormat, outputFormat, onProgress);
  }

  // Everything else via FFmpeg
  return convertViaFFmpeg(file, inputFormat, outputFormat, onProgress);
}

// ---------------------------------------------------------------------------
// Canvas-based image conversion
// ---------------------------------------------------------------------------

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

async function convertImageViaCanvas(
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

// ---------------------------------------------------------------------------
// FFmpeg-based conversion (audio, video, and image fallback)
// ---------------------------------------------------------------------------

// Serialize FFmpeg operations to avoid filesystem collisions
let ffmpegQueue = Promise.resolve<unknown>(undefined);

function enqueueFFmpeg<T>(fn: () => Promise<T>): Promise<T> {
  const result = ffmpegQueue.then(fn);
  ffmpegQueue = result.then(() => {}, () => {});
  return result;
}

async function convertViaFFmpeg(
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

// ---------------------------------------------------------------------------
// Document conversion
// ---------------------------------------------------------------------------

async function convertDocument(
  file: File,
  inputFormat: FormatInfo,
  outputFormat: FormatInfo,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  onProgress?.(20);

  const text = await file.text();
  onProgress?.(50);

  let result: string;

  if (inputFormat.extension === 'json' && outputFormat.extension === 'csv') {
    result = jsonToCsv(text);
  } else if (inputFormat.extension === 'csv' && outputFormat.extension === 'json') {
    result = csvToJson(text);
  } else {
    throw new Error(`Unsupported: ${inputFormat.label} → ${outputFormat.label}`);
  }

  onProgress?.(100);
  return new Blob([result], { type: outputFormat.mimeType });
}

function jsonToCsv(jsonStr: string): string {
  const data: unknown = JSON.parse(jsonStr);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('JSON must be a non-empty array of objects');
  }

  const headers = Object.keys(data[0] as Record<string, unknown>);

  const escape = (val: unknown): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = (data as Record<string, unknown>[]).map(
    row => headers.map(h => escape(row[h])).join(','),
  );

  return [headers.map(escape).join(','), ...rows].join('\n');
}

function csvToJson(csv: string): string {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV needs a header row and at least one data row');
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });

  return JSON.stringify(rows, null, 2);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}
