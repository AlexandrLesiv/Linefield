import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/memory",
  testMatch: "**/*.fixture.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  use: {
    baseURL: "http://127.0.0.1:65143",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "pnpm exec vite preview --mode memory-e2e --host 127.0.0.1 --port 65143 --strictPort",
    url: "http://127.0.0.1:65143/fixtures/memory/index.html",
    reuseExistingServer: false,
  },
  reporter: [["list"], ["json", { outputFile: "test-results/memory-fixtures.json" }]],
  outputDir: "test-results/memory-fixtures",
});
