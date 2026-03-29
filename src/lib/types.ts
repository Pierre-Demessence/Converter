export type FileCategory = 'image' | 'audio' | 'video' | 'document';

export interface FormatInfo {
  extension: string;
  mimeType: string;
  category: FileCategory;
  label: string;
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
}
