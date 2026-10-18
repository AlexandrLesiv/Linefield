import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { inverseMatrix } from "./inverse.ts";
if (process.argv.length !== 2) throw Error("probe-accepts-no-arguments");
const sources = [];
for (const name of [
  "dyadic.ts",
  "rational.ts",
  "inverse.ts",
  "inverse.test.ts",
  "inverse-run.ts",
]) {
  sources.push({
    path: `scripts/probes/regional/${name}`,
    sha256: createHash("sha256")
      .update(await readFile(new URL(name, import.meta.url)))
      .digest("hex"),
  });
}
const report = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  sources,
  rows: inverseMatrix(),
};
const output = JSON.stringify(report, null, 2) + "\n";
if (Buffer.byteLength(output) > 1_048_576) throw Error("probe-report-limit");
process.stdout.write(output);
