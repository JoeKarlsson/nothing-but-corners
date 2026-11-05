import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "test/e2e",
  timeout: 60_000,
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:4173",
    channel: "chrome",
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "python3 -m http.server 4173",
    url: "http://localhost:4173",
    reuseExistingServer: true,
  },
});
