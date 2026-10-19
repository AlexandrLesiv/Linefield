import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { matrix } from "./matrix.ts";
if (process.argv.length !== 2) throw Error("probe-accepts-no-arguments");
const sources = [];
for (const name of ["dyadic.ts", "arithmetic.ts", "fixtures.ts", "matrix.ts", "run.ts"]) {
  const bytes = await readFile(new URL(name, import.meta.url));
  sources.push({
    path: `scripts/probes/regional/${name}`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
const report = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  architecture: process.arch,
  sources,
  ...matrix(),
};
const output = JSON.stringify(report, null, 2) + "\n";
if (Buffer.byteLength(output) > 1_048_576) throw Error("probe-report-limit");
process.stdout.write(output);
