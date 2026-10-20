import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/memory",
  testMatch: "untiled.fixture.spec.ts",
  workers: 1,
  timeout: 1_800_000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:65149",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "pnpm exec vite preview --mode memory-e2e --host 127.0.0.1 --port 65149 --strictPort",
    url: "http://127.0.0.1:65149/tests/fixtures/memory/untiled/index.html",
    reuseExistingServer: false,
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "../../.build-cache/web-memory/untiled-checkpoint/results.json" }],
  ],
  outputDir: "../../.build-cache/web-memory/untiled-checkpoint/artifacts",
});
