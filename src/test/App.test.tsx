import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { convertFile } from '../lib/converter';

vi.mock('../lib/converter', () => ({ convertFile: vi.fn() }));

interface Deferred {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
}

const pending: Deferred[] = [];

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
});

beforeEach(() => {
  pending.length = 0;
  vi.mocked(convertFile).mockReset();
  vi.mocked(convertFile).mockImplementation(
    () => new Promise<Blob>((resolve, reject) => pending.push({ resolve, reject })),
  );
});

function wav(name: string, size?: number): File {
  const file = new File(['x'], name, { type: 'audio/wav' });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
}

function addFiles(container: HTMLElement, ...files: File[]) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(input, { target: { files } });
}

function pickMp3OnEveryCard() {
  for (const radio of screen.getAllByRole('radio', { name: 'MP3' })) fireEvent.click(radio);
}

async function settle(deferred: Deferred, blob = new Blob(['out'])) {
  await act(async () => {
    deferred.resolve(blob);
    await new Promise(r => setTimeout(r, 0));
  });
}

async function settleAll() {
  while (pending.length > 0) await settle(pending.shift()!);
}

describe('App job and batch state', () => {
  it('B1: a size-limit error survives picking a format and stays unconvertible', () => {
    const { container } = render(<App />);
    addFiles(container, wav('big.wav', 101 * 1024 * 1024));

    fireEvent.click(screen.getAllByRole('radio')[0]);

    expect(screen.getByRole('alert')).toHaveTextContent('too large');
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled();
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });

  it('B2: the picker is locked while converting and the download names the converted format', async () => {
    const { container } = render(<App />);
    addFiles(container, wav('a.wav'));
    fireEvent.click(screen.getByRole('radio', { name: 'MP3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Convert' }));

    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'OGG' }));

    await settle(pending[0]);

    expect(screen.getByRole('button', { name: /^Download MP3/ })).toBeInTheDocument();
  });

  it('B3: a batch starts at 0 processed even when another job is already done', async () => {
    const { container } = render(<App />);
    addFiles(container, wav('done.wav'));
    fireEvent.click(screen.getByRole('radio', { name: 'MP3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Convert' }));
    await settle(pending.shift()!);

    addFiles(container, wav('b.wav'), wav('c.wav'));
    for (const radio of screen.getAllByRole('radio', { name: 'MP3' })) {
      if (radio.getAttribute('aria-checked') !== 'true') fireEvent.click(radio);
    }
    fireEvent.click(screen.getByRole('button', { name: /^Convert All/ }));

    expect(screen.getByText(/0 of 2 processed/)).toBeInTheDocument();
    await settleAll();
  });

  it('B4: Convert All is disabled during a batch and each job converts once', async () => {
    const { container } = render(<App />);
    addFiles(container, wav('a.wav'), wav('b.wav'));
    pickMp3OnEveryCard();

    const convertAll = screen.getByRole('button', { name: /^Convert All/ });
    fireEvent.click(convertAll);
    expect(screen.getByRole('button', { name: /^Convert All/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^Convert All/ }));

    await settleAll();

    expect(convertFile).toHaveBeenCalledTimes(2);
  });

  it('B4: two clicks before React re-renders start each conversion once', async () => {
    const { container } = render(<App />);
    addFiles(container, wav('a.wav'), wav('b.wav'));
    pickMp3OnEveryCard();

    const convertAll = screen.getByRole('button', { name: /^Convert All/ });
    const convert = screen.getAllByRole('button', { name: 'Convert' })[0];
    act(() => {
      convertAll.click();
      convertAll.click();
      convert.click();
    });

    await settleAll();

    expect(convertFile).toHaveBeenCalledTimes(2);
  });
});
