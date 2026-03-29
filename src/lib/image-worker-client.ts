let worker: Worker | null = null;
let workerSupported: boolean | null = null;

function getWorker(): Worker | null {
  if (workerSupported === false) return null;

  if (!worker) {
    try {
      worker = new Worker(
        new URL('./workers/image.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workerSupported = true;
    } catch {
      workerSupported = false;
      return null;
    }
  }
  return worker;
}

export function supportsOffscreenCanvas(): boolean {
  return typeof OffscreenCanvas !== 'undefined';
}

export async function convertImageInWorker(
  file: File,
  inputMime: string,
  outputMime: string,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  const w = getWorker();
  if (!w) throw new Error('Worker unavailable');

  const id = crypto.randomUUID();
  const fileBuffer = await file.arrayBuffer();

  return new Promise<Blob>((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.id !== id) return;

      switch (msg.type) {
        case 'progress':
          onProgress?.(msg.value);
          break;
        case 'result':
          w.removeEventListener('message', handler);
          resolve(new Blob([msg.buffer], { type: msg.mime }));
          break;
        case 'error':
          w.removeEventListener('message', handler);
          reject(new Error(msg.message));
          break;
      }
    };

    w.addEventListener('message', handler);
    w.postMessage(
      { cmd: 'convert', id, fileBuffer, mimeType: inputMime, outputMime },
      [fileBuffer],
    );
  });
}
