import { defineConfig, devices } from "@playwright/test";

// Runs against the production build in mock mode (no backend needed). Desktop and phone viewports.
export default defineConfig({
  testDir: "./e2e",
  timeout: 40_000,
  expect: { timeout: 15_000 },
  workers: 2,
  retries: 1,
  webServer: { command: "npm run build && npm start -- -p 3100", port: 3100, reuseExistingServer: true, timeout: 240_000, env: { NEXT_DIST: ".next-e2e" } },
  use: { baseURL: "http://localhost:3100" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 5"] } },
  ],
});
