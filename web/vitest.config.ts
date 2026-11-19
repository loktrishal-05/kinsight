import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Floors sit just under today's numbers so coverage can only go up; raise them as tests are added.
    coverage: { provider: "v8", include: ["lib/**"], reporter: ["text-summary", "lcov"],
      thresholds: { statements: 60, branches: 58, functions: 50, lines: 60 } },
  },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } }, // same "@/..." paths as tsconfig
});
