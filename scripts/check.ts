import { validateCatalogSources } from "./catalog-source.ts";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const formatTargets = [
  ".zed/tasks.json",
  "package.json",
  "tsconfig.json",
  ".oxlintrc.json",
  ".oxfmtrc.json",
  "pnpm-workspace.yaml",
  "scripts",
  "shared/theme",
  "shared/diagrams",
  "shared/schema",
  "shared/localization",
  "apps/web/src",
  "apps/web/tests",
  "apps/web/package.json",
  "apps/web/tsconfig.json",
  "apps/web/vite.config.ts",
  "apps/web/playwright.config.ts",
  "apps/web/playwright.memory.config.ts",
  "apps/web/memory-policy.ts",
  "apps/web/index.html",
];

async function checkSourceSize(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const location = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "generated") {
      await checkSourceSize(location);
    } else if (entry.isFile() && /\.(ts|css|html|rs)$/.test(entry.name)) {
      // Trusted literal catalogue data is validated above and excluded by repository policy.
      if (relative(root, location).startsWith("shared/localization/")) continue;
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
  ["web-typecheck", "typescript/bin/tsc", ["--noEmit", "-p", "apps/web/tsconfig.json"]],
  [
    "lint",
    "oxlint/bin/oxlint",
    [
      "--deny-warnings",
      "scripts",
      "shared/theme",
      "shared/localization",
      "apps/web/src",
      "apps/web/tests",
    ],
  ],
  ["format", "oxfmt/bin/oxfmt", ["--check", ...formatTargets]],
];

try {
  await validateCatalogSources();
  for (const args of [
    ["scripts/localization.ts"],
    ["scripts/theme-resources.ts"],
    ["scripts/diagrams/generate.ts"],
    ["scripts/schema/generate.ts"],
    ["scripts/diagrams/generate.ts", "--check"],
    ["scripts/schema/generate.ts", "--check"],
    ["scripts/theme-validation.ts"],
    ["scripts/theme-resources.ts", "--check"],
    ["scripts/localization.ts", "--check"],
  ]) {
    const result = spawnSync(process.execPath, args, {
      cwd: root,
      stdio: "inherit",
      shell: false,
      timeout: 120_000,
    });
    if (result.error || result.status !== 0) throw Error(`Catalog check failed: ${args.join(" ")}`);
  }
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
  await checkSourceSize(join(root, "shared"));
  await checkSourceSize(join(root, "apps/web/src"));
  await checkSourceSize(join(root, "apps/web/tests"));
  await checkSourceSize(join(root, "apps/web/wasm/src"));
  await checkSourceSize(join(root, "crates/editor-engine/src"));
  console.log(JSON.stringify({ check: "script-source-size", status: "passed" }));
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : "Tooling check failed");
  process.exitCode = 1;
}
