import { defineConfig } from "@playwright/test";
const port = Number(process.env.LINEFIELD_FIXTURE_PORT ?? "65162");
export default defineConfig({
  testDir: "./tests/memory",
  testMatch: "**/*.fixture.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: `pnpm exec vite preview --mode memory-e2e --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/tests/fixtures/memory/index.html`,
    reuseExistingServer: false,
  },
  reporter: [["list"], ["json", { outputFile: "test-results/memory-fixtures.json" }]],
  outputDir: "test-results/memory-fixtures",
});
