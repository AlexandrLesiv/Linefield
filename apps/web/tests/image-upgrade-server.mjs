import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
export async function imageUpgradeServer(initial) {
  let root = resolve(initial);
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".wasm": "application/wasm",
    ".json": "application/json",
  };
  const server = createServer(async (request, response) => {
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    response.setHeader("Cache-Control", "no-store");
    let name = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (name.includes("..")) {
      response.writeHead(400).end();
      return;
    }
    if (name.endsWith("/")) name += "index.html";
    try {
      let bytes;
      try {
        bytes = await readFile(root + name);
      } catch {
        name = "/index.html";
        bytes = await readFile(root + name);
      }
      response.setHeader("Content-Type", types[extname(name)] || "application/octet-stream");
      response.end(bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    switchRoot(next) {
      root = resolve(next);
    },
    close: () => new Promise((done) => server.close(done)),
  };
}
