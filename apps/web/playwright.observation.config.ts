import { defineConfig } from "@playwright/test";
import base from "./playwright.config.ts";
export default defineConfig({
  ...base,
  testMatch: "**/*.observation.spec.ts",
  testIgnore: [],
  use: { ...base.use, baseURL: "http://127.0.0.1:65168" },
  webServer: {
    command:
      "pnpm exec vite preview --outDir ../../.build-cache/m03-performance-site --host 127.0.0.1 --port 65168 --strictPort",
    url: "http://127.0.0.1:65168",
    reuseExistingServer: false,
  },
});
