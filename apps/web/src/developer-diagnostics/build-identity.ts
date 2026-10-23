import engine from "#memory-wasm?url";
import preparation from "#preparation-wasm?url";
import { safeBuild } from "./schema.ts";
function basename(url: string): string {
  try {
    return new URL(url, import.meta.url).pathname.split("/").at(-1) ?? "unavailable";
  } catch {
    return "unavailable";
  }
}
// Only the validated emitted asset basenames leave this module; never paths or URLs.
export const buildIdentity = safeBuild({
  app: basename(import.meta.url),
  engine: basename(engine),
  preparation: basename(preparation),
});
