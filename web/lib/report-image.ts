const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 16_000_000;
const PNG_HEADER = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82];
const JPEG_FRAME = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function dimensions(bytes: Uint8Array): [number, number] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && PNG_HEADER.every((value, i) => value === bytes[i])) {
    return [view.getUint32(16), view.getUint32(20)];
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 3 < bytes.length && bytes[offset++] === 0xff) {
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 1) continue;
      if (marker === 0xda || marker === 0xd9 || offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (JPEG_FRAME.has(marker) && length >= 8) {
        return [view.getUint16(offset + 5), view.getUint16(offset + 3)];
      }
      offset += length;
    }
  }
  throw new Error("imageUnreadable");
}

export async function readReportImage(file: File, lang: string, signal: AbortSignal) {
  if (file.size > MAX_BYTES) throw new Error("imageLimit");
  const data = new Uint8Array(await file.arrayBuffer());
  const [width, height] = dimensions(data);
  if (!width || !height || width * height > MAX_PIXELS || Math.max(width, height) > 8192) {
    throw new Error("imageLimit");
  }
  const text = await withReportOcr(lang, signal, (recognize) => recognize(file));
  if (!text) throw new Error("imageUnreadable");
  return text;
}

type Recognize = (image: File | HTMLCanvasElement) => Promise<string>;

export async function withReportOcr<T>(lang: string, signal: AbortSignal, read: (recognize: Recognize) => Promise<T>) {
  signal.throwIfAborted();
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang === "ar" ? ["ara", "eng"] : "eng", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr",
    langPath: "/ocr",
    workerBlobURL: false,
    cacheMethod: "none",
  });
  let stop = () => {};
  const cancelled = new Promise<never>((_, reject) => { stop = () => reject(signal.reason); });
  try {
    signal.throwIfAborted();
    signal.addEventListener("abort", stop, { once: true });
    return await Promise.race([read(async (image) => {
      signal.throwIfAborted();
      const result = await worker.recognize(image);
      return result.data.text.trim();
    }), cancelled]);
  } finally {
    signal.removeEventListener("abort", stop);
    await worker.terminate();
  }
}
