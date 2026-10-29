import { readFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = root + "apps/vector-editor/public/saving/";
mkdirSync(output, { recursive: true });
const vendor = root + ".build-cache/browser-storage/sqlite-wasm-3540100/jswasm/";
if (!existsSync(vendor + "sqlite3.js") || !existsSync(vendor + "sqlite3.wasm"))
  await import("./probes/browser-storage/acquire.ts");
const pinned = {
  "sqlite3.js": "cbee562f4d632cfed46a0572ecb315deea2e1728f29dd1a9fd7b7ca7186c9807",
  "sqlite3.wasm": "10fd727b37924755edc12c2f3ead0d54155d8f2d9f2abf6a1ef9b2b2597e0a51",
};
for (const [name, hash] of Object.entries(pinned)) {
  if (
    createHash("sha256")
      .update(readFileSync(vendor + name))
      .digest("hex") !== hash
  )
    throw Error("Pinned SQLite artifact mismatch");
  copyFileSync(vendor + name, output + name);
}
for (const name of ["worker.js", "admission.js", "database.js", "staging.js"])
  copyFileSync(root + "apps/vector-editor/src/saving/" + name, output + name);
