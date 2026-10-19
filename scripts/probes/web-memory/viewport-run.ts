import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { cullingCorpus, approximateR } from "./culling-corpus.ts";
import type { CullingRow } from "./culling-corpus.ts";
import { zoomCorpus } from "./zoom-corpus.ts";
import { numberFromBits } from "./oracle.ts";
import { fromNumber, subtractR } from "../regional/rational.ts";
import { viewportCorpus } from "./viewport-corpus.ts";

if (process.argv.length !== 2) throw Error("probe-accepts-no-arguments");
const root = new URL("../../../", import.meta.url);
const output = new URL(".build-cache/web-memory/", root);
await mkdir(output, { recursive: true });
const rows: CullingRow[] = [...viewportCorpus(), ...zoomCorpus(), ...cullingCorpus()];
if (rows.length > 16384) throw Error("bounded-corpus");
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
if (answers.length !== rows.length) throw Error("diagnostic-row-count");
let maximumProjectionError = 0;
let maximumNarrowingError = 0;
let maximumCoordinateMagnitude = 0;
let eligibleBounds = 0;
let culledBounds = 0;
let mismatches = 0;
let naiveDisagreements = 0;
let coordinateRejections = 0;
let inputRejections = 0;
const categories: Record<string, number> = {};
const observations = rows.map((row, index) => {
  const answer = answers[index];
  if (answer === undefined) throw Error("missing-row");
  if (!(row.expected === "C eligible" ? answer.startsWith("C eligible ") : answer === row.expected))
    mismatches += 1;
  if (answer === "C outside") culledBounds += 1;
  if (answer.startsWith("C eligible ")) {
    eligibleBounds += 1;
    const fields = answer.split(" ").slice(2);
    for (let coordinate = 0; coordinate < 2; coordinate += 1) {
      const original = fields[coordinate * 2];
      const narrow = fields[coordinate * 2 + 1];
      const exact = row.projected?.[coordinate];
      if (!original || !narrow || !exact) throw Error("invalid-projection");
      const f64 = numberFromBits(BigInt(original));
      const view = new DataView(new ArrayBuffer(4));
      view.setUint32(0, Number(narrow));
      const f32 = view.getFloat32(0);
      if (!Number.isFinite(f64) || !Number.isFinite(f32) || Math.abs(f64) >= 2 ** 21)
        throw Error("invalid-projection-envelope");
      maximumProjectionError = Math.max(
        maximumProjectionError,
        approximateR(subtractR(fromNumber(f64), exact)),
      );
      maximumNarrowingError = Math.max(
        maximumNarrowingError,
        approximateR(subtractR(fromNumber(f64), fromNumber(f32))),
      );
      maximumCoordinateMagnitude = Math.max(maximumCoordinateMagnitude, Math.abs(f64));
    }
  }
  if (row.naive !== undefined && row.naive !== row.expected) naiveDisagreements += 1;
  if (answer === "E CoordinateOverflow") coordinateRejections += 1;
  if (answer === "E InputBound") inputRejections += 1;
  categories[row.kind] = (categories[row.kind] ?? 0) + 1;
  return { ...row, answer };
});
const paths = [
  "experiments/web-memory/Cargo.toml",
  "experiments/web-memory/Cargo.lock",
  "scripts/probes/regional/dyadic.ts",
  "scripts/probes/regional/rational.ts",
];
for (const directory of ["experiments/web-memory/src", "scripts/probes/web-memory"])
  for (const name of (await readdir(new URL(directory, root))).sort())
    paths.push(`${directory}/${name}`);
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
  naiveDisagreements,
  coordinateRejections,
  inputRejections,
  eligibleBounds,
  culledBounds,
  maximumCoordinateMagnitude,
  maximumProjectionError,
  maximumNarrowingError,
};
const report = {
  kind: "synthetic pan/zoom numerical diagnostic, not E2E",
  recordedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  rust: spawnSync("rustc", ["--version"], { encoding: "utf8" }).stdout.trim(),
  base: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(),
  ...summary,
  sources,
  observations,
};
await writeFile(
  new URL("viewport-report.json", output),
  JSON.stringify(
    report,
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  ) + "\n",
);
process.stdout.write(
  JSON.stringify({ ...summary, report: ".build-cache/web-memory/viewport-report.json" }) + "\n",
);
if (mismatches > 0) process.exitCode = 1;
