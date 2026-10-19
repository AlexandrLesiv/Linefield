import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:65142",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  },
  webServer: { command: "pnpm dev", url: "http://127.0.0.1:65142", reuseExistingServer: true },
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  outputDir: "test-results/artifacts",
});
