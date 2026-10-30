import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  server: {
    host: "127.0.0.1",
    port: 65383,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL("../../../../../", import.meta.url))] },
  },
  build: {
    outDir: fileURLToPath(new URL("../../../../../.build-cache/svg01/host", import.meta.url)),
    emptyOutDir: true,
  },
  worker: { format: "es" },
});
