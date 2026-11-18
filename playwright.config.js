import { defineConfig } from "@playwright/test";

// Not Vite's default 4173: other projects' test servers run there, and reusing
// one of them tests the wrong site. Never reuse a server for the same reason.
const PORT = 4391;

export default defineConfig({
  testDir: "test/e2e",
  timeout: 60_000,
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
});
