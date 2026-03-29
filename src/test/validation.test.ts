import { describe, it, expect } from 'vitest';
import { checkFileSize } from '../lib/validation';

function fakeFile(size: number): File {
  return { size } as unknown as File;
}

describe('checkFileSize', () => {
  it('accepts image under 50 MB', () => {
    expect(checkFileSize(fakeFile(49 * 1024 * 1024), 'image')).toBeNull();
  });

  it('rejects image over 50 MB', () => {
    const result = checkFileSize(fakeFile(51 * 1024 * 1024), 'image');
    expect(result).toContain('too large');
    expect(result).toContain('50 MB');
  });

  it('accepts audio under 100 MB', () => {
    expect(checkFileSize(fakeFile(99 * 1024 * 1024), 'audio')).toBeNull();
  });

  it('rejects audio over 100 MB', () => {
    expect(checkFileSize(fakeFile(101 * 1024 * 1024), 'audio')).toContain('100 MB');
  });

  it('accepts video under 200 MB', () => {
    expect(checkFileSize(fakeFile(199 * 1024 * 1024), 'video')).toBeNull();
  });

  it('rejects video over 200 MB', () => {
    expect(checkFileSize(fakeFile(201 * 1024 * 1024), 'video')).toContain('200 MB');
  });

  it('accepts document under 10 MB', () => {
    expect(checkFileSize(fakeFile(9 * 1024 * 1024), 'document')).toBeNull();
  });

  it('rejects document over 10 MB', () => {
    expect(checkFileSize(fakeFile(11 * 1024 * 1024), 'document')).toContain('10 MB');
  });

  it('rejects file at exact limit', () => {
    const limit = 50 * 1024 * 1024;
    expect(checkFileSize(fakeFile(limit), 'image')).toBeNull();
    expect(checkFileSize(fakeFile(limit + 1), 'image')).toContain('too large');
  });
});
