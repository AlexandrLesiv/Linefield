import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
export default defineConfig({
  base: "./",
  root: path("."),
  server: {
    host: "127.0.0.1",
    port: 65404,
    strictPort: true,
    fs: { allow: [path("../../../../../")] },
  },
  build: {
    outDir: path("../../../../../.build-cache/img01/fixture"),
    emptyOutDir: true,
    rollupOptions: {
      input: { index: path("index.html"), probe: path("probe.ts") },
      output: { entryFileNames: "[name].js" },
    },
  },
  worker: { format: "es" },
});
