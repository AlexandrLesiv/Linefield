import { spawnSync } from "node:child_process";
import { mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
function run(command: string, args: string[], cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error || result.status !== 0)
    throw Error("Vector editor build failed", { cause: result.error });
}
run(process.execPath, [root + "scripts/localization.ts"]);
run(process.execPath, [root + "scripts/vector-editor-boundary.ts", "--check"]);
run(process.execPath, [root + "scripts/vector-editor-save-boundary.ts", "--check"]);
run(process.execPath, [root + "scripts/svg-export-boundary.ts", "--check"]);
run("cargo", [
  "build",
  "--locked",
  "--package",
  "linefield-vector-engine",
  "--target",
  "wasm32-unknown-unknown",
  "--profile",
  "vector-editor",
  "--features",
  "svg-export",
]);
mkdirSync(root + "apps/vector-editor/public", { recursive: true });
copyFileSync(
  root + "target/wasm32-unknown-unknown/vector-editor/vector_core.wasm",
  root + "apps/vector-editor/public/core.wasm",
);
run(process.execPath, [
  root + "node_modules/typescript/bin/tsc",
  "--project",
  "apps/vector-editor/tsconfig.json",
]);
run(process.execPath, [root + "scripts/build-save-storage.ts"]);
run(
  process.execPath,
  [root + "apps/web/node_modules/vite/bin/vite.js", "build"],
  root + "apps/vector-editor",
);
