import { writeNotices } from "./notices.ts";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../../", import.meta.url));
const fixtures = process.argv.includes("--fixtures");
const mode = fixtures ? "e2e" : "production";
const output = join(root, ".build-cache/web-memory", mode);
const target = join(root, "target/web-memory", mode);
const local = join(root, ".build-cache/tools/bin/wasm-bindgen");
const cli = existsSync(local) ? local : "wasm-bindgen";
function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, CARGO_TARGET_DIR: target },
    encoding: "utf8",
    shell: false,
    timeout: 300_000,
  });
  if (result.status !== 0 || result.error) throw Error(result.stderr || "Runtime build failed");
  return result.stdout.trim();
}
if (run(cli, ["--version"]) !== "wasm-bindgen 0.2.129")
  throw Error("wasm-bindgen 0.2.129 required");
await mkdir(output, { recursive: true });
run("cargo", [
  "build",
  "--locked",
  "--release",
  "--target",
  "wasm32-unknown-unknown",
  "-p",
  "linefield-web-memory",
  "-p",
  "linefield-web-preparation",
  ...(fixtures ? ["--features", "linefield-web-memory/e2e-fixtures"] : []),
]);
run(cli, [
  join(target, "wasm32-unknown-unknown/release/linefield_web_memory.wasm"),
  "--target",
  "web",
  "--out-dir",
  output,
]);
run(cli, [
  join(target, "wasm32-unknown-unknown/release/linefield_web_preparation.wasm"),
  "--target",
  "web",
  "--out-dir",
  output,
]);
const canvas = join(root, "apps/web/node_modules/canvaskit-wasm");
const wasm = await readFile(join(canvas, "bin/canvaskit.wasm"));
const hash = createHash("sha256").update(wasm).digest("hex");
if (hash !== "bd669c88bd033eaf62d673103a42231a737c6d12e4cc99f8548b2784b5772430") {
  throw Error("CanvasKit asset differs from approved stock 0.41.1");
}
await copyFile(join(canvas, "LICENSE"), join(output, "CANVASKIT-LICENSE"));
const engine = await readFile(join(output, "linefield_web_memory_bg.wasm"));
const preparation = await readFile(join(output, "linefield_web_preparation_bg.wasm"));
await writeFile(
  join(output, "build.json"),
  JSON.stringify(
    {
      mode,
      rust: run("rustc", ["--version"]),
      wasmBindgen: "0.2.129",
      canvasKit: "0.41.1",
      engineSha256: createHash("sha256").update(engine).digest("hex"),
      preparationSha256: createHash("sha256").update(preparation).digest("hex"),
      canvasSha256: hash,
    },
    null,
    2,
  ) + "\n",
);
await writeNotices(
  root,
  output,
  run("cargo", [
    "metadata",
    "--locked",
    "--offline",
    "--format-version",
    "1",
    "--filter-platform",
    "wasm32-unknown-unknown",
  ]),
);
console.log(JSON.stringify({ action: "web-memory-build", mode, status: "passed" }));
