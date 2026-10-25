import { defineConfig, devices } from "@playwright/test";

// Live check: API on :8000 (KINSIGHT_DEMO=1) and the web build with NEXT_PUBLIC_MOCK=0 on :3200.
export default defineConfig({
  testDir: "./e2e-live",
  timeout: 40_000,
  webServer: { command: "set NEXT_PUBLIC_MOCK=0&& npm run build && npm start -- -p 3200", port: 3200, reuseExistingServer: true, timeout: 240_000 },
  use: { baseURL: "http://localhost:3200", ...devices["Desktop Chrome"] },
});
