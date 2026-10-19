import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { corpus } from "./corpus.ts";
import { numberFromBits } from "./oracle.ts";
import { absolute, approximate, decode, subtract } from "../regional/dyadic.ts";
import { contained, radialResidual } from "./paint-reference.ts";

if (process.argv.length !== 2) throw Error("probe-accepts-no-arguments");
const root = new URL("../../../", import.meta.url);
const output = new URL(".build-cache/web-memory/", root);
await mkdir(output, { recursive: true });
const rows = corpus();
const run = spawnSync(
  "cargo",
  [
    "run",
    "--release",
    "--manifest-path",
    "experiments/web-memory/Cargo.toml",
    "--target-dir",
    ".build-cache/web-memory/target",
  ],
  {
    cwd: root,
    input: rows.map((row) => row.input).join("\n") + "\n",
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 1_048_576,
  },
);
if (run.error || run.status !== 0)
  throw Error(`candidate-failed: ${run.error?.message ?? run.stderr}`);
const answers = run.stdout.trim().split("\n");
if (answers.length !== rows.length) throw Error("diagnostic-row-count");
let maximumF32Error = 0;
let normalizationMismatches = 0;
let hulls = 0;
let containments = 0;
let containmentMismatches = 0;
let conservativeHulls = 0;
let maximumRadialResidual = 0;
const observations = rows.map((row, index) => {
  const answer = answers[index];
  if (!answer) throw Error("missing-row");
  if (row.expected !== undefined && row.expected !== answer) normalizationMismatches += 1;
  if (answer === "P contained") containments += 1;
  if (row.input.startsWith("P ")) {
    if (!contained(row.input) && answer === "P contained") containmentMismatches += 1;
    if (contained(row.input) && answer.startsWith("P hull")) conservativeHulls += 1;
  }
  if (answer.startsWith("P hull")) {
    hulls += 1;
    maximumRadialResidual = Math.max(maximumRadialResidual, radialResidual(row.input, answer));
    const fields = answer.split(" ").slice(2);
    for (let at = 0; at < fields.length; at += 2) {
      const original = fields[at];
      const narrowed = fields[at + 1];
      if (!original || !narrowed) throw Error("malformed-paint-observation");
      const view = new DataView(new ArrayBuffer(4));
      view.setUint32(0, Number(narrowed));
      const f32 = view.getFloat32(0);
      const f64 = numberFromBits(BigInt(original));
      if (!Number.isFinite(f64) || !Number.isFinite(f32)) throw Error("nonfinite-paint-candidate");
      maximumF32Error = Math.max(
        maximumF32Error,
        approximate(absolute(subtract(decode(f64), decode(f32)))),
      );
    }
  }
  return { ...row, answer };
});
const paths = [
  "experiments/web-memory/Cargo.toml",
  "experiments/web-memory/Cargo.lock",
  ...["main.rs", "exact.rs", "paint.rs"].map((name) => `experiments/web-memory/src/${name}`),
  ...["run.ts", "corpus.ts", "oracle.ts", "paint-reference.ts"].map(
    (name) => `scripts/probes/web-memory/${name}`,
  ),
  "scripts/probes/regional/dyadic.ts",
  "scripts/probes/regional/rational.ts",
];
const sources = await Promise.all(
  paths.map(async (path) => ({
    path,
    sha256: createHash("sha256")
      .update(await readFile(new URL(path, root)))
      .digest("hex"),
  })),
);
const report = {
  kind: "synthetic numerical diagnostic, not E2E",
  recordedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  rust: spawnSync("rustc", ["--version"], { encoding: "utf8" }).stdout.trim(),
  base: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(),
  rows: rows.length,
  normalizationMismatches,
  containmentMismatches,
  conservativeHulls,
  maximumRadialResidual,
  hulls,
  containments,
  maximumF32Error,
  sources,
  observations,
};
await writeFile(new URL("report.json", output), JSON.stringify(report, null, 2) + "\n");
process.stdout.write(
  JSON.stringify({
    rows: rows.length,
    normalizationMismatches,
    containmentMismatches,
    conservativeHulls,
    maximumRadialResidual,
    hulls,
    containments,
    maximumF32Error,
    report: ".build-cache/web-memory/report.json",
  }) + "\n",
);
if (normalizationMismatches > 0 || containmentMismatches > 0) process.exitCode = 1;
