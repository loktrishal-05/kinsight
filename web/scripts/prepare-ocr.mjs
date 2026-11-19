import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const output = new URL("../public/ocr/", import.meta.url);
await mkdir(output, { recursive: true });
const core = dirname(require.resolve("tesseract.js-core/package.json"));
const english = dirname(require.resolve("@tesseract.js-data/eng/package.json"));
const arabic = dirname(require.resolve("@tesseract.js-data/ara/package.json"));
const assets = {
  "worker.min.js": require.resolve("tesseract.js/dist/worker.min.js"),
  "LICENSE-tesseract-js.txt": require.resolve("tesseract.js/LICENSE.md"),
  "LICENSE-tesseract-core.txt": join(core, "LICENSE"),
  "eng.traineddata.gz": join(english, "4.0.0_best_int", "eng.traineddata.gz"),
  "ara.traineddata.gz": join(arabic, "4.0.0_best_int", "ara.traineddata.gz"),
  "tesseract-core-lstm.wasm.js": join(core, "tesseract-core-lstm.wasm.js"),
  "tesseract-core-simd-lstm.wasm.js": join(core, "tesseract-core-simd-lstm.wasm.js"),
  "tesseract-core-relaxedsimd-lstm.wasm.js": join(core, "tesseract-core-relaxedsimd-lstm.wasm.js"),
};
await Promise.all(Object.entries(assets).map(([name, source]) => copyFile(source, new URL(name, output))));
