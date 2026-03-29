import type { FormatInfo } from '../types';

export const AUDIO_FORMATS: FormatInfo[] = [
  {
    extension: 'mp3', mimeType: 'audio/mpeg', category: 'audio', label: 'MP3',
    codec: { audio: { codec: 'libmp3lame', args: ['-q:a', '2'] }, stripVideo: true },
  },
  {
    extension: 'wav', mimeType: 'audio/wav', category: 'audio', label: 'WAV',
    codec: { audio: { codec: 'pcm_s16le', args: [] }, stripVideo: true },
  },
  {
    extension: 'ogg', mimeType: 'audio/ogg', category: 'audio', label: 'OGG',
    codec: { audio: { codec: 'libvorbis', args: ['-q:a', '6'] }, stripVideo: true },
  },
  {
    extension: 'flac', mimeType: 'audio/flac', category: 'audio', label: 'FLAC',
    codec: { audio: { codec: 'flac', args: [] }, stripVideo: true },
  },
  {
    extension: 'aac', mimeType: 'audio/aac', category: 'audio', label: 'AAC',
    codec: { audio: { codec: 'aac', args: ['-b:a', '192k'] }, stripVideo: true },
  },
  {
    extension: 'm4a', mimeType: 'audio/mp4', category: 'audio', label: 'M4A',
    codec: { audio: { codec: 'aac', args: ['-b:a', '192k'] }, stripVideo: true },
  },
];
