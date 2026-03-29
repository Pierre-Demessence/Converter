export type FileCategory = 'image' | 'audio' | 'video' | 'document';

export interface CodecConfig {
  /** Audio codec name and extra FFmpeg args (e.g. libmp3lame). */
  audio?: { codec: string; args: string[] };
  /** Video codec name and extra FFmpeg args (e.g. libx264). */
  video?: { codec: string; args: string[] };
  /** Strip video streams with -vn; set true for audio-only output formats. */
  stripVideo?: boolean;
}

export interface FormatInfo {
  extension: string;
  mimeType: string;
  category: FileCategory;
  label: string;
  /** True only for raster formats exportable via Canvas API (PNG, JPEG, WebP). */
  canvasOutput?: boolean;
  /** Routes to a specialised converter instead of FFmpeg (e.g. 'document' for JSON/CSV). */
  converterHint?: 'canvas' | 'ffmpeg' | 'document';
  /** FFmpeg codec metadata; must define audio and/or video for media formats. */
  codec?: CodecConfig;
}

export interface ConversionJob {
  id: string;
  file: File;
  inputFormat: FormatInfo;
  outputFormat: FormatInfo | null;
  status: 'idle' | 'converting' | 'done' | 'error';
  progress: number;
  outputBlob: Blob | null;
  error: string | null;
  /** 'validation' errors are permanent (e.g. file too large); 'conversion' errors are retryable. */
  errorKind?: 'validation' | 'conversion';
}
