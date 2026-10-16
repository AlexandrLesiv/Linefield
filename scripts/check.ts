import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const formatTargets = [
  "package.json",
  "tsconfig.json",
  ".oxlintrc.json",
  ".oxfmtrc.json",
  "pnpm-workspace.yaml",
  "scripts",
];

async function checkSourceSize(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const location = join(directory, entry.name);
    if (entry.isDirectory()) {
      await checkSourceSize(location);
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      const source = await readFile(location, "utf8");
      const lines = source.split("\n").length - (source.endsWith("\n") ? 1 : 0);
      if (lines > 200) {
        throw new Error(`${relative(root, location)}: ${lines} physical lines (maximum 200)`);
      }
    }
  }
}

const checks: ReadonlyArray<readonly [string, string, readonly string[]]> = [
  ["typecheck", "typescript/bin/tsc", ["--noEmit"]],
  ["lint", "oxlint/bin/oxlint", ["--deny-warnings", "scripts"]],
  ["format", "oxfmt/bin/oxfmt", ["--check", ...formatTargets]],
];

try {
  for (const [name, executable, args] of checks) {
    const result = spawnSync(process.execPath, [join(root, "node_modules", executable), ...args], {
      cwd: root,
      stdio: "inherit",
      shell: false,
      timeout: 120_000,
    });
    if (result.error || result.status !== 0) {
      throw new Error(`${name} failed: ${result.error?.message ?? result.signal ?? result.status}`);
    }
    console.log(JSON.stringify({ check: name, status: "passed" }));
  }
  await checkSourceSize(join(root, "scripts"));
  console.log(JSON.stringify({ check: "script-source-size", status: "passed" }));
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : "Tooling check failed");
  process.exitCode = 1;
}
