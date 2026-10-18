import { createServer } from "node:http";
import type { Server } from "node:http";
import { outputs } from "./generate.ts";

export async function startPreview(extra = new Map<string, string>()): Promise<{
  server: Server;
  url: string;
}> {
  const pages = new Map<string, string>(extra);
  for (const [path, content] of await outputs()) {
    if (path.startsWith("docs/workflow/task-preview/"))
      pages.set(`/${path.split("/").at(-1)}`, content);
  }
  const server = createServer((request, response) => {
    const page = pages.get(request.url === "/" ? "/index.html" : (request.url ?? ""));
    if (request.method !== "GET" || page === undefined) {
      response.writeHead(404, {
        "Content-Type": "text/plain",
        "X-Content-Type-Options": "nosniff",
      });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(page);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No preview address");
  return { server, url: `http://127.0.0.1:${address.port}` };
}
