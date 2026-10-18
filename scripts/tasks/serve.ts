import { startPreview } from "./preview-server.ts";

if (process.argv.length > 2) throw new Error("Task preview accepts no arguments");
const { server, url } = await startPreview();
console.log(`Read-only Linefield task preview: ${url}`);
console.log("Only generated task pages are served; press Ctrl+C to stop.");
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close());
}
