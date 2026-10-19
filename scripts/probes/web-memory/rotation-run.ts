import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { rotationCorpus, coefficients } from "./rotation-corpus.ts";
import { geometryObservations } from "./rotation-geometry.ts";
import { rotationCulling } from "./rotation-culling.ts";

if (process.argv.length !== 2) throw Error("probe-accepts-no-arguments");
const root = new URL("../../../", import.meta.url);
const output = new URL(".build-cache/web-memory/", root);
await mkdir(output, { recursive: true });
const rows = [...rotationCorpus(), ...rotationCulling()];
const geometry = geometryObservations();
if (rows.length !== 16680) throw Error(`bounded-corpus-count: ${rows.length}`);
const answers: string[] = [];
for (let first = 0; first < rows.length; first += 4096) {
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
      input:
        rows
          .slice(first, first + 4096)
          .map((row) => row.input)
          .join("\n") + "\n",
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 1_048_576,
    },
  );
  if (run.error || run.status !== 0)
    throw Error(`candidate-failed: ${run.error?.message ?? run.stderr}`);
  answers.push(...run.stdout.trim().split("\n"));
}
if (answers.length !== rows.length) throw Error("row-count");
const categories: Record<string, number> = {};
let mismatches = 0;
let inverseDifferences = 0;
let rejections = 0;
const observations = rows.map((row, index) => {
  const answer = answers[index];
  if (answer !== row.expected) mismatches += 1;
  if (row.input.startsWith("I ") && answer !== answers[index - 1]) inverseDifferences += 1;
  if (answer?.startsWith("E ")) rejections += 1;
  categories[row.kind] = (categories[row.kind] ?? 0) + 1;
  return { ...row, answer };
});
const paths = [
  "experiments/web-memory/src/rotation.rs",
  "experiments/web-memory/src/viewport.rs",
  "experiments/web-memory/src/magnitude.rs",
  "experiments/web-memory/src/main.rs",
  "scripts/probes/web-memory/rotation-corpus.ts",
  "scripts/probes/web-memory/rotation-run.ts",
  "scripts/probes/web-memory/viewport-oracle.ts",
  "scripts/probes/web-memory/oracle.ts",
  "scripts/probes/regional/rational.ts",
  "scripts/probes/regional/dyadic.ts",
];
paths.push("scripts/probes/web-memory/rotation-geometry.ts");
paths.push(
  "scripts/probes/web-memory/rotation-culling.ts",
  "experiments/web-memory/src/rotation_culling.rs",
);
const sources = await Promise.all(
  paths.map(async (path) => ({
    path,
    sha256: createHash("sha256")
      .update(await readFile(new URL(path, root)))
      .digest("hex"),
  })),
);
const summary = {
  rows: rows.length,
  distinctInputs: new Set(rows.map((row) => row.input)).size,
  categories,
  mismatches,
  inverseDifferences,
  rejections,
};
await writeFile(
  new URL("rotation-report.json", output),
  JSON.stringify(
    {
      kind: "synthetic fixed-step rotation diagnostic, not E2E or performance",
      recordedAt: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      base: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(),
      coefficients,
      ...summary,
      geometry,
      sources,
      observations,
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(JSON.stringify(summary) + "\n");
if (mismatches > 0) process.exitCode = 1;
