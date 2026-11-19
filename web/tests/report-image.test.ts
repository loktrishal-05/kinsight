import { beforeEach, expect, test, vi } from "vitest";
import { readReportImage, withReportOcr } from "../lib/report-image";

const { createWorker, recognize, terminate } = vi.hoisted(() => ({
  createWorker: vi.fn(), recognize: vi.fn(), terminate: vi.fn(),
}));
vi.mock("tesseract.js", () => ({ createWorker }));

function png(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new File([bytes], "synthetic.png");
}

beforeEach(() => {
  vi.resetAllMocks();
  createWorker.mockResolvedValue({ recognize, terminate });
  recognize.mockResolvedValue({ data: { text: "  CFTR SYNTHETIC REPORT\n" } });
});

test("valid PNG and JPEG headers reach local OCR", async () => {
  const jpeg = new File([new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 8, 8, 0, 40, 0, 60, 1,
  ])], "synthetic.jpg");
  const signal = new AbortController().signal;
  await expect(readReportImage(jpeg, "en", signal)).resolves.toBe("CFTR SYNTHETIC REPORT");
  await expect(readReportImage(png(60, 40), "ar", signal)).resolves.toBe("CFTR SYNTHETIC REPORT");
  expect(createWorker).toHaveBeenLastCalledWith(["ara", "eng"], 1, expect.objectContaining({
    workerPath: "/ocr/worker.min.js", langPath: "/ocr", cacheMethod: "none",
  }));
  expect(terminate).toHaveBeenCalledTimes(2);
});

test("rejects bad or oversized images before starting a worker", async () => {
  const signal = new AbortController().signal;
  const wrong = new File(["not PNG"], "synthetic.png");
  const truncated = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 20])], "synthetic.jpg");
  for (const file of [wrong, truncated]) {
    await expect(readReportImage(file, "en", signal)).rejects.toThrow("imageUnreadable");
  }
  const tooLarge = new File([new ArrayBuffer(10 * 1024 * 1024 + 1)], "synthetic.png");
  for (const file of [tooLarge, png(0, 200), png(4096, 4096), png(8193, 1)]) {
    await expect(readReportImage(file, "en", signal)).rejects.toThrow("imageLimit");
  }
  expect(createWorker).not.toHaveBeenCalled();
});

test("terminates the worker after an empty result or a cancelled recognition", async () => {
  const controller = new AbortController();
  recognize.mockResolvedValueOnce({ data: { text: " " } });
  await expect(readReportImage(png(60, 40), "en", controller.signal)).rejects.toThrow("imageUnreadable");
  const error = new DOMException("Attachment replaced", "AbortError");
  recognize.mockImplementationOnce(async () => {
    controller.abort(error);
    return { data: { text: "stale" } };
  });
  const result = withReportOcr("en", controller.signal, (read) => read(png(60, 40)));
  await expect(result).rejects.toBe(error);
  await expect(readReportImage(png(60, 40), "en", controller.signal)).rejects.toBe(error);
  expect(createWorker).toHaveBeenCalledTimes(2);
  expect(terminate).toHaveBeenCalledTimes(2);
});
