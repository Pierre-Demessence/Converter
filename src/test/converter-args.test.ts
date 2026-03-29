import { describe, it, expect } from 'vitest';
import { buildFFmpegArgs } from '../lib/converter';
import { FORMATS } from '../lib/formats';
import type { FormatInfo } from '../lib/types';

function find(ext: string): FormatInfo {
  const f = FORMATS.find(f => f.extension === ext);
  if (!f) throw new Error(`Format ${ext} not found`);
  return f;
}

describe('buildFFmpegArgs — audio codecs', () => {
  it('uses libmp3lame for mp3', () => {
    const args = buildFFmpegArgs('in.wav', 'out.mp3', find('mp3'));
    expect(args).toContain('-c:a');
    expect(args).toContain('libmp3lame');
    expect(args).toContain('-vn');
    expect(args[0]).toBe('-i');
    expect(args[1]).toBe('in.wav');
    expect(args[args.length - 1]).toBe('out.mp3');
  });

  it('uses libvorbis for ogg', () => {
    const args = buildFFmpegArgs('in.wav', 'out.ogg', find('ogg'));
    expect(args).toContain('libvorbis');
  });

  it('uses flac codec for flac', () => {
    const args = buildFFmpegArgs('in.wav', 'out.flac', find('flac'));
    expect(args).toContain('flac');
  });

  it('uses aac for aac output', () => {
    const args = buildFFmpegArgs('in.wav', 'out.aac', find('aac'));
    expect(args).toContain('aac');
    expect(args).toContain('192k');
  });

  it('uses aac for m4a output', () => {
    const args = buildFFmpegArgs('in.wav', 'out.m4a', find('m4a'));
    expect(args).toContain('aac');
  });

  it('uses pcm_s16le for wav output', () => {
    const args = buildFFmpegArgs('in.mp3', 'out.wav', find('wav'));
    expect(args).toContain('pcm_s16le');
  });

  it('strips video streams with -vn for all audio', () => {
    for (const ext of ['mp3', 'ogg', 'flac', 'aac', 'm4a', 'wav']) {
      const args = buildFFmpegArgs('in.wav', `out.${ext}`, find(ext));
      expect(args).toContain('-vn');
    }
  });
});

describe('buildFFmpegArgs — video codecs', () => {
  it('uses libx264 for mp4', () => {
    const args = buildFFmpegArgs('in.avi', 'out.mp4', find('mp4'));
    expect(args).toContain('libx264');
    expect(args).toContain('-preset');
    expect(args).toContain('fast');
  });

  it('uses libvpx-vp9 for webm', () => {
    const args = buildFFmpegArgs('in.mp4', 'out.webm', find('webm'));
    expect(args).toContain('libvpx-vp9');
  });

  it('uses mpeg4 for avi', () => {
    const args = buildFFmpegArgs('in.mp4', 'out.avi', find('avi'));
    expect(args).toContain('mpeg4');
  });

  it('uses libx264 for mkv', () => {
    const args = buildFFmpegArgs('in.mp4', 'out.mkv', find('mkv'));
    expect(args).toContain('libx264');
  });

  it('uses libx264 for mov', () => {
    const args = buildFFmpegArgs('in.mp4', 'out.mov', find('mov'));
    expect(args).toContain('libx264');
  });

  it('does NOT include -vn for video', () => {
    const args = buildFFmpegArgs('in.mp4', 'out.webm', find('webm'));
    expect(args).not.toContain('-vn');
  });
});

describe('buildFFmpegArgs — general structure', () => {
  it('always starts with -i <input>', () => {
    const args = buildFFmpegArgs('input.wav', 'output.mp3', find('mp3'));
    expect(args[0]).toBe('-i');
    expect(args[1]).toBe('input.wav');
  });

  it('always ends with -y <output>', () => {
    const args = buildFFmpegArgs('a.mp4', 'b.webm', find('webm'));
    const len = args.length;
    expect(args[len - 2]).toBe('-y');
    expect(args[len - 1]).toBe('b.webm');
  });

  it('produces minimal args for format without codec config', () => {
    const bare: FormatInfo = { extension: 'opus', mimeType: 'audio/opus', category: 'audio', label: 'OPUS' };
    const args = buildFFmpegArgs('in.opus', 'out.opus', bare);
    expect(args).toEqual(['-i', 'in.opus', '-y', 'out.opus']);
  });
});
