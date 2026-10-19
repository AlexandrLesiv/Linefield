import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { instrumentProxy } from "./instrument.ts";

export async function startServer() {
  const instrumented = await instrumentProxy();
  const sources = new URL("./", import.meta.url);
  const vendor = new URL(
    "../../../.build-cache/browser-storage/sqlite-wasm-3540100/jswasm/",
    import.meta.url,
  );
  const server = createServer(async (request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'",
    );
    try {
      if (path === "/") {
        response.setHeader("Content-Type", "text/html");
        response.end("<!doctype html><title>Synthetic storage probe</title>");
        return;
      }
      if (path === "/config.js") {
        response.setHeader("Content-Type", "text/javascript");
        response.end(`export const channel = ${JSON.stringify(instrumented.channel)};`);
        return;
      }
      const name = path.split("/").at(-1) ?? "";
      const allowed = path.startsWith("/vendor/")
        ? ["sqlite3.js", "sqlite3.wasm", "sqlite3-opfs-async-proxy.js"]
        : [
            "worker.js",
            "harness.js",
            "scenarios.js",
            "fault.js",
            "pool-worker.js",
            "pool-scenarios.js",
          ];
      if (!allowed.includes(name)) throw new Error("Not served");
      response.setHeader(
        "Content-Type",
        name.endsWith(".wasm") ? "application/wasm" : "text/javascript",
      );
      response.end(
        name === "sqlite3-opfs-async-proxy.js"
          ? instrumented.served
          : await readFile(new URL(name, path.startsWith("/vendor/") ? vendor : sources)),
      );
    } catch {
      response.statusCode = 404;
      response.end("Not found");
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(65149, "127.0.0.1", resolve);
  });
  return server;
}
