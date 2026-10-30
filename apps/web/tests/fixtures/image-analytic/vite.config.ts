import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
export default defineConfig({
  base: "./",
  root: path("."),
  build: { outDir: path("../../../../../.build-cache/img02/analytic"), emptyOutDir: true },
});
