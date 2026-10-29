import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve as resolvePath } from "node:path";
export async function storageServer() {
  const root = resolvePath("."),
    legacy = new Map();
  for (const name of ["worker.js", "admission.js", "database.js", "staging.js"])
    legacy.set(
      name,
      execFileSync("git", ["show", `1adb0b0:apps/vector-editor/src/saving/${name}`]),
    );
  const server = createServer(async (req, res) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    const path = new URL(req.url, "http://localhost").pathname;
    if (path === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end("<!doctype html><title>Saved library storage acceptance</title>");
      return;
    }
    const name = path.split("/").at(-1);
    if (
      ![
        "worker.js",
        "admission.js",
        "database.js",
        "staging.js",
        "pools.js",
        "catalog.js",
        "library-worker.js",
        "catalog-generated.js",
        "sqlite3.js",
        "sqlite3.wasm",
      ].includes(name)
    ) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("Content-Type", name.endsWith("wasm") ? "application/wasm" : "text/javascript");
    try {
      res.end(
        path.startsWith("/legacy/") && legacy.has(name)
          ? legacy.get(name)
          : await readFile(root + "/apps/vector-editor/public/saving/" + name),
      );
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((r) => server.close(r)),
  };
}
export async function clients(page, url) {
  await page.route("**/__save06_storage", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Isolated storage acceptance</title>",
    }),
  );
  await page.route("**/legacy/**", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").at(-1);
    const body = ["worker.js", "admission.js", "database.js", "staging.js"].includes(name)
      ? execFileSync("git", ["show", `1adb0b0:apps/vector-editor/src/saving/${name}`])
      : await readFile(resolvePath("apps/vector-editor/public/saving/" + name));
    await route.fulfill({
      status: 200,
      contentType: name.endsWith("wasm") ? "application/wasm" : "text/javascript",
      body,
    });
  });
  await page.goto(new URL("/__save06_storage", url).href);
  await page.evaluate(() => {
    globalThis.clients = [];
    globalThis.makeClient = (legacy = false) => {
      const worker = new Worker(
        legacy
          ? "/legacy/worker.js?sqlite3.dir=/legacy"
          : "/vector-editor/saving/worker.js?sqlite3.dir=/vector-editor/saving",
      );
      let serial = 0;
      const client = {
        worker,
        call: (kind, fields = {}) =>
          new Promise((resolve, reject) => {
            const id = ++serial;
            worker.onmessage = ({ data }) => {
              if (data.id !== id) return;
              if (data.error) reject(Error(data.error));
              else resolve(data.value);
            };
            worker.onerror = (e) => reject(Error(e.message));
            worker.postMessage({ ...fields, id, kind });
          }),
      };
      return globalThis.clients.push(client) - 1;
    };
  });
}
export const newClient = (page, legacy = false) => page.evaluate((old) => makeClient(old), legacy);
export const call = (page, index, kind, fields = {}) =>
  page.evaluate(
    ({ clientIndex, command, options }) => clients[clientIndex].call(command, options),
    {
      clientIndex: index,
      command: kind,
      options: fields,
    },
  );
export async function kill(page, index) {
  await page.evaluate((i) => clients[i].worker.terminate(), index);
}
