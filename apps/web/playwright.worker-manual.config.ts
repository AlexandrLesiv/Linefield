import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/memory",
  workers: 1,
  fullyParallel: false,
  testMatch: ["pen.spec.ts", "rapid-strokes.spec.ts", "worker-manual*.spec.ts"],
  use: {
    baseURL: "http://127.0.0.1:65146",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  },
  webServer: {
    command: "pnpm exec vite preview --host 127.0.0.1 --port 65146 --strictPort",
    url: "http://127.0.0.1:65146",
    reuseExistingServer: false,
  },
  reporter: [["list"], ["json", { outputFile: "../../.build-cache/worker-manual/results.json" }]],
  outputDir: "../../.build-cache/worker-manual/artifacts",
});
