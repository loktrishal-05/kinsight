import { defineConfig, devices } from "@playwright/test";

// Runs against the production build in mock mode (no backend needed). Desktop and phone viewports.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  webServer: { command: "npm run build && npm start -- -p 3100", port: 3100, reuseExistingServer: true, timeout: 180_000 },
  use: { baseURL: "http://localhost:3100" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 5"] } },
  ],
});
