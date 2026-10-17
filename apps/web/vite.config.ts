import { defineConfig } from "vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
export default defineConfig({
  plugins: [vanillaExtractPlugin()],
  server: { host: "127.0.0.1", strictPort: true },
  build: { target: "es2023" },
});
