import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";
export const policy =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
export function productionPolicy(mode: "production" | "e2e"): Plugin {
  return {
    name: "linefield-production-policy",
    apply: "build",
    async generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "THIRD-PARTY-NOTICES.txt",
        source: await readFile(
          new URL(`../../.build-cache/web-memory/${mode}/THIRD-PARTY-NOTICES.txt`, import.meta.url),
          "utf8",
        ),
      });
    },
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: policy },
        injectTo: "head-prepend",
      },
    ],
  };
}
