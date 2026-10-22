import { defineConfig } from "@playwright/test";
import { testPort as port } from "./test-ports.ts";
export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/*.fixture.spec.ts", "**/*.observation.spec.ts"],
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  },
  webServer: {
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  outputDir: "test-results/artifacts",
});
