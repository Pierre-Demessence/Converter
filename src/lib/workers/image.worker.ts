interface ConvertMessage {
  cmd: 'convert';
  id: string;
  fileBuffer: ArrayBuffer;
  mimeType: string;
  outputMime: string;
}

interface ProgressMessage {
  type: 'progress';
  id: string;
  value: number;
}

interface ResultMessage {
  type: 'result';
  id: string;
  buffer: ArrayBuffer;
  mime: string;
}

interface ErrorMessage {
  type: 'error';
  id: string;
  message: string;
}

type WorkerOutMessage = ProgressMessage | ResultMessage | ErrorMessage;

self.onmessage = async (e: MessageEvent<ConvertMessage>) => {
  const { cmd, id, fileBuffer, mimeType, outputMime } = e.data;
  if (cmd !== 'convert') return;

  const send = (msg: WorkerOutMessage) => self.postMessage(msg);

  try {
    send({ type: 'progress', id, value: 10 });

    const blob = new Blob([fileBuffer], { type: mimeType });
    const bitmap = await createImageBitmap(blob);
    send({ type: 'progress', id, value: 40 });

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas context unavailable');

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    send({ type: 'progress', id, value: 70 });

    const quality = outputMime === 'image/png' ? undefined : 0.92;
    const outputBlob = await canvas.convertToBlob({ type: outputMime, quality });
    const buffer = await outputBlob.arrayBuffer();

    send({ type: 'progress', id, value: 100 });
    self.postMessage(
      { type: 'result', id, buffer, mime: outputMime } satisfies ResultMessage,
      { transfer: [buffer] },
    );
  } catch (err) {
    send({ type: 'error', id, message: err instanceof Error ? err.message : String(err) });
  }
};
