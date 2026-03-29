import type { FormatInfo } from '../types';

export const VIDEO_FORMATS: FormatInfo[] = [
  {
    extension: 'mp4', mimeType: 'video/mp4', category: 'video', label: 'MP4',
    codec: { video: { codec: 'libx264', args: ['-preset', 'fast', '-crf', '23'] } },
  },
  {
    extension: 'webm', mimeType: 'video/webm', category: 'video', label: 'WebM',
    codec: { video: { codec: 'libvpx-vp9', args: ['-crf', '30', '-b:v', '0'] } },
  },
  {
    extension: 'avi', mimeType: 'video/x-msvideo', category: 'video', label: 'AVI',
    codec: { video: { codec: 'mpeg4', args: ['-q:v', '5'] } },
  },
  {
    extension: 'mkv', mimeType: 'video/x-matroska', category: 'video', label: 'MKV',
    codec: { video: { codec: 'libx264', args: ['-preset', 'fast', '-crf', '23'] } },
  },
  {
    extension: 'mov', mimeType: 'video/quicktime', category: 'video', label: 'MOV',
    codec: { video: { codec: 'libx264', args: ['-preset', 'fast', '-crf', '23'] } },
  },
];
