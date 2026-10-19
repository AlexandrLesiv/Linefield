import { defineConfig } from "@playwright/test";
import base from "./playwright.config.ts";
export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: "http://127.0.0.1:65144" },
  webServer: {
    command: "pnpm exec vite preview --host 127.0.0.1 --port 65144 --strictPort",
    url: "http://127.0.0.1:65144",
    reuseExistingServer: false,
  },
  reporter: [["list"], ["json", { outputFile: "test-results/manual-results.json" }]],
  outputDir: "test-results/manual-artifacts",
});
