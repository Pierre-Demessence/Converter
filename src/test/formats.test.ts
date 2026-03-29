import { describe, it, expect } from 'vitest';
import { detectFormat, getOutputFormats, FORMATS } from '../lib/formats';

describe('detectFormat', () => {
  it('detects PNG from file extension', () => {
    const file = new File([''], 'photo.png', { type: 'image/png' });
    const result = detectFormat(file);
    expect(result).toEqual(expect.objectContaining({ extension: 'png', category: 'image' }));
  });

  it('normalizes .jpeg to jpg', () => {
    const file = new File([''], 'photo.jpeg', { type: 'image/jpeg' });
    const result = detectFormat(file);
    expect(result?.extension).toBe('jpg');
    expect(result?.label).toBe('JPEG');
  });

  it('handles uppercase extensions', () => {
    const file = new File([''], 'song.MP3', { type: 'audio/mpeg' });
    const result = detectFormat(file);
    expect(result?.extension).toBe('mp3');
  });

  it('detects video formats', () => {
    const file = new File([''], 'clip.mp4', { type: 'video/mp4' });
    const result = detectFormat(file);
    expect(result?.category).toBe('video');
  });

  it('detects document formats', () => {
    const file = new File([''], 'data.csv', { type: 'text/csv' });
    const result = detectFormat(file);
    expect(result?.category).toBe('document');
  });

  it('returns null for unsupported extensions', () => {
    const file = new File([''], 'readme.xyz');
    expect(detectFormat(file)).toBeNull();
  });

  it('returns null for files without extension', () => {
    const file = new File([''], 'Makefile');
    expect(detectFormat(file)).toBeNull();
  });
});

describe('getOutputFormats', () => {
  const png = FORMATS.find(f => f.extension === 'png')!;
  const svg = FORMATS.find(f => f.extension === 'svg')!;
  const mp3 = FORMATS.find(f => f.extension === 'mp3')!;
  const mp4 = FORMATS.find(f => f.extension === 'mp4')!;
  const json = FORMATS.find(f => f.extension === 'json')!;

  it('returns image formats for a PNG input (excluding SVG and PNG itself)', () => {
    const outputs = getOutputFormats(png);
    expect(outputs.some(f => f.extension === 'jpg')).toBe(true);
    expect(outputs.some(f => f.extension === 'webp')).toBe(true);
    expect(outputs.every(f => f.extension !== 'png')).toBe(true);
    expect(outputs.every(f => f.extension !== 'svg')).toBe(true);
  });

  it('SVG only converts to PNG, JPEG, WebP', () => {
    const outputs = getOutputFormats(svg);
    const extensions = outputs.map(f => f.extension).sort();
    expect(extensions).toEqual(['jpg', 'png', 'webp']);
  });

  it('returns audio formats for MP3 input', () => {
    const outputs = getOutputFormats(mp3);
    expect(outputs.every(f => f.category === 'audio')).toBe(true);
    expect(outputs.some(f => f.extension === 'wav')).toBe(true);
    expect(outputs.every(f => f.extension !== 'mp3')).toBe(true);
  });

  it('returns video formats for MP4 input', () => {
    const outputs = getOutputFormats(mp4);
    expect(outputs.every(f => f.category === 'video')).toBe(true);
    expect(outputs.some(f => f.extension === 'webm')).toBe(true);
  });

  it('returns CSV for JSON input', () => {
    const outputs = getOutputFormats(json);
    expect(outputs).toHaveLength(1);
    expect(outputs[0].extension).toBe('csv');
  });

  it('never includes the input format in the output list', () => {
    for (const fmt of FORMATS) {
      const outputs = getOutputFormats(fmt);
      expect(outputs.every(f => f.extension !== fmt.extension)).toBe(true);
    }
  });
});
