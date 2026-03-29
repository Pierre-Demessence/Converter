import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FORMATS } from '../lib/formats';

const PNG = FORMATS.find(f => f.extension === 'png')!;
const SVG = FORMATS.find(f => f.extension === 'svg')!;
const BMP = FORMATS.find(f => f.extension === 'bmp')!;
const MP3 = FORMATS.find(f => f.extension === 'mp3')!;
const WAV = FORMATS.find(f => f.extension === 'wav')!;
const JSON_FMT = FORMATS.find(f => f.extension === 'json')!;
const CSV_FMT = FORMATS.find(f => f.extension === 'csv')!;

// Spy on Canvas path
const mockToBlob = vi.fn<(cb: BlobCallback, type?: string, quality?: number) => void>();
const mockGetContext = vi.fn(() => ({
  drawImage: vi.fn(),
}));

// Mock getFFmpeg
const mockExec = vi.fn().mockResolvedValue(0);
const mockWriteFile = vi.fn().mockResolvedValue(true);
const mockReadFile = vi.fn().mockResolvedValue(new Uint8Array([0xDE, 0xAD]));
const mockDeleteFile = vi.fn().mockResolvedValue(true);
const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock('../lib/ffmpeg-manager', () => ({
  getFFmpeg: vi.fn(() => Promise.resolve({
    loaded: true,
    exec: mockExec,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    deleteFile: mockDeleteFile,
    on: mockOn,
    off: mockOff,
  })),
}));

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3]))),
}));

// Patch jsdom Canvas and Image for the Canvas conversion path
beforeEach(() => {
  vi.clearAllMocks();

  mockToBlob.mockImplementation((cb, type) => {
    cb(new Blob(['fake-image-data'], { type: type ?? 'image/png' }));
  });

  vi.stubGlobal('Image', class MockImage {
    width = 100;
    height = 100;
    naturalWidth = 100;
    naturalHeight = 100;
    private _src = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    get src() { return this._src; }
    set src(val: string) {
      this._src = val;
      setTimeout(() => this.onload?.(), 0);
    }
  });

  // Patch HTMLCanvasElement
  HTMLCanvasElement.prototype.getContext = mockGetContext as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toBlob = mockToBlob as unknown as typeof HTMLCanvasElement.prototype.toBlob;
});

describe('convertFile — routing logic', () => {
  it('uses document converter for JSON → CSV', async () => {
    const { convertFile } = await import('../lib/converter');
    const input = JSON.stringify([{ a: 1 }]);
    const file = new File([input], 'data.json', { type: 'application/json' });

    const result = await convertFile(file, JSON_FMT, CSV_FMT);
    expect(result).toBeInstanceOf(Blob);
    // FFmpeg should NOT be invoked
    expect(mockExec).not.toHaveBeenCalled();
  });

  it('uses FFmpeg for audio conversion (WAV → MP3)', async () => {
    const { convertFile } = await import('../lib/converter');
    const file = new File([new Uint8Array(100)], 'audio.wav', { type: 'audio/wav' });

    const result = await convertFile(file, WAV, MP3);
    expect(result).toBeInstanceOf(Blob);
    expect(mockExec).toHaveBeenCalled();

    const execArgs = mockExec.mock.calls[0][0] as string[];
    expect(execArgs).toContain('-c:a');
    expect(execArgs).toContain('libmp3lame');
  });

  it('falls through to FFmpeg when canvas fails for image → image', async () => {
    // Make canvas fail by throwing on getContext
    mockGetContext.mockReturnValueOnce(null as unknown as ReturnType<typeof mockGetContext>);

    const { convertFile } = await import('../lib/converter');
    const file = new File([new Uint8Array(100)], 'photo.bmp', { type: 'image/bmp' });

    const result = await convertFile(file, BMP, PNG);
    expect(result).toBeInstanceOf(Blob);
    expect(mockExec).toHaveBeenCalled();
  });

  it('does NOT use canvas for SVG output (not in CANVAS_OUTPUT_TYPES)', async () => {
    const { convertFile } = await import('../lib/converter');
    const file = new File([new Uint8Array(100)], 'photo.png', { type: 'image/png' });

    // SVG has no canvasOutput flag, so it goes to FFmpeg
    await convertFile(file, PNG, SVG);
    expect(mockExec).toHaveBeenCalled();
  });

  it('calls onProgress during FFmpeg conversion', async () => {
    const { convertFile } = await import('../lib/converter');
    const file = new File([new Uint8Array(100)], 'audio.wav', { type: 'audio/wav' });
    const progress: number[] = [];

    await convertFile(file, WAV, MP3, (p) => progress.push(p));

    expect(progress.length).toBeGreaterThan(0);
    expect(progress).toContain(5);
    expect(progress).toContain(100);
  });

  it('throws when FFmpeg returns non-zero exit code', async () => {
    mockExec.mockResolvedValueOnce(1);

    const { convertFile } = await import('../lib/converter');
    const file = new File([new Uint8Array(100)], 'audio.wav', { type: 'audio/wav' });

    await expect(convertFile(file, WAV, MP3)).rejects.toThrow('exit code');
  });

  it('cleans up FFmpeg files after successful conversion', async () => {
    const { convertFile } = await import('../lib/converter');
    const file = new File([new Uint8Array(100)], 'audio.wav', { type: 'audio/wav' });

    await convertFile(file, WAV, MP3);

    // deleteFile called twice: input + output cleanup
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);
  });

  it('cleans up FFmpeg files after failed conversion', async () => {
    mockExec.mockResolvedValueOnce(1);

    const { convertFile } = await import('../lib/converter');
    const file = new File([new Uint8Array(100)], 'audio.wav', { type: 'audio/wav' });

    await expect(convertFile(file, WAV, MP3)).rejects.toThrow();
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);
  });

  it('rejects unsupported document conversion (csv → csv)', async () => {
    const { convertFile } = await import('../lib/converter');
    const file = new File(['a,b\n1,2'], 'data.csv', { type: 'text/csv' });

    await expect(convertFile(file, CSV_FMT, CSV_FMT)).rejects.toThrow('Unsupported');
  });
});
