import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../../", import.meta.url));
const generated = join(root, ".build-cache/web-memory/production");
const bytes = await readFile(join(generated, "linefield_web_memory_bg.wasm"));
const module = new WebAssembly.Module(bytes);
const commands = WebAssembly.Module.exports(module)
  .filter((item) => item.kind === "function" && item.name.startsWith("memory"))
  .map((item) => item.name)
  .sort();
const expected = [
  "memoryPanBegin",
  "memoryPanPreview",
  "memoryPanUpdate",
  "memoryPanEnd",
  "memoryPanStep",
  "memoryZoomStep",
  "memoryRotateStep",
  "memoryBegin",
  "memoryAppend",
  "memoryEnd",
  "memoryCancel",
  "memorySettings",
  "memoryUndo",
  "memoryRedo",
  "memoryScene",
  "memoryStrokeState",
  "memoryCreate",
  "memoryDispose",
  "memoryEnter",
  "memoryLeave",
  "memoryMapping",
  "memoryMetrics",
  "memoryPresented",
  "memoryRead",
  "memorySceneIds",
  "memorySuspend",
].sort();
if (commands.join() !== expected.join()) throw Error("Production command surface differs");
if (WebAssembly.Module.exports(module).some((item) => /fixture/i.test(item.name)))
  throw Error("Fixture Wasm export leaked");
const glue = await readFile(join(generated, "linefield_web_memory.js"), "utf8");
const declarations = await readFile(join(generated, "linefield_web_memory.d.ts"), "utf8");
if (/fixture/i.test(glue + declarations)) throw Error("Fixture glue leaked");
for (const name of [
  "Reply",
  "State",
  "Mapping",
  "SceneIds",
  "ScenePage",
  "StrokeState",
  "PanPreview",
]) {
  if (!declarations.includes(`export class ${name}`)) throw Error("Generated snapshot absent");
}
if (!glue.includes("getArrayU64FromWasm0") || !glue.includes(".slice()"))
  throw Error("Copied output glue changed");
const dist = join(root, "apps/web/dist");
const manifest = await readFile(join(dist, ".vite/manifest.json"), "utf8");
if (/fixtures|fixture/i.test(manifest)) throw Error("Fixture build input leaked");
for (const file of await readdir(join(dist, "assets"))) {
  const content = await readFile(join(dist, "assets", file));
  if (
    /fixtureNearExhaustion|fixtureFailNextMetrics|fixture-fail-pan-translation|Run boundary matrix|Run bounded calibration/.test(
      content.toString("utf8"),
    )
  )
    throw Error("Fixture control leaked into release asset");
}
const html = await readFile(join(dist, "index.html"), "utf8");
if (!html.includes("wasm-unsafe-eval") || html.includes("'unsafe-eval'"))
  throw Error("Production script policy differs");
console.log(
  JSON.stringify({
    check: "web-memory-release-boundary",
    status: "passed",
    commands,
    engineSha256: createHash("sha256").update(bytes).digest("hex"),
    generatedSnapshots: 7,
    caveat:
      "Static export/glue/asset validation; browser E2E and independent glue inspection remain separate",
  }),
);
