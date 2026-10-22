import { productionPolicy } from "./memory-policy.ts";
import { defineConfig } from "vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { fileURLToPath } from "node:url";
const root = new URL("../../", import.meta.url);
export default defineConfig(({ mode }) => {
  const fixtures = mode === "memory-e2e";
  const generated = new URL(`.build-cache/web-memory/${fixtures ? "e2e" : "production"}/`, root);
  return {
    worker: { format: "es" },
    plugins: [vanillaExtractPlugin(), productionPolicy(fixtures ? "e2e" : "production")],
    resolve: {
      alias: {
        "#preparation-bindings": fileURLToPath(new URL("linefield_web_preparation.js", generated)),
        "#preparation-wasm": fileURLToPath(new URL("linefield_web_preparation_bg.wasm", generated)),
        "#memory-bindings": fileURLToPath(new URL("linefield_web_memory.js", generated)),
        "#memory-wasm": fileURLToPath(new URL("linefield_web_memory_bg.wasm", generated)),
      },
    },
    server: { host: "127.0.0.1", strictPort: true },
    build: {
      target: "es2023",
      manifest: true,
      ...(fixtures
        ? {
            outDir: fileURLToPath(new URL(".build-cache/web-memory/e2e-site", root)),
            emptyOutDir: true,
            rollupOptions: {
              input: {
                calibration: fileURLToPath(
                  new URL("tests/fixtures/memory/index.html", import.meta.url),
                ),
                app: fileURLToPath(new URL("tests/fixtures/memory/app.html", import.meta.url)),
              },
            },
          }
        : {}),
    },
  };
});
