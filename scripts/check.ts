import { validateCatalogSources } from "./catalog-source.ts";
import { spawnSync } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
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
  "shared/tasks",
  "shared/localization",
  "apps/web/src",
  "apps/web/tests",
  "apps/web/package.json",
  "apps/web/tsconfig.json",
  "apps/web/vite.config.ts",
  "apps/web/playwright.config.ts",
  "apps/web/index.html",
];

async function checkSourceSize(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const location = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "generated") {
      await checkSourceSize(location);
    } else if (entry.isFile() && /\.(ts|css|html)$/.test(entry.name)) {
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
  for (const catalog of ["localization", "theme"]) {
    const generator =
      catalog === "theme" ? "scripts/theme-resources.ts" : "scripts/localization.ts";
    const generatedExists = await access(join(root, "shared", catalog, "generated")).then(
      () => true,
      (error: unknown) => {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
        throw error;
      },
    );
    if (!generatedExists) {
      const generated = spawnSync(process.execPath, [generator], {
        cwd: root,
        stdio: "inherit",
        shell: false,
        timeout: 120_000,
      });
      if (generated.error || generated.status !== 0) throw Error(`${catalog} bootstrap failed`);
    }
  }
  for (const args of [
    ["scripts/tasks/generate.ts", "--check"],
    ["--test", "scripts/tasks/*.test.ts"],
    ["scripts/diagrams/generate.ts", "--check"],
    ["scripts/schema/generate.ts", "--check"],
    [
      "--test",
      "scripts/diagrams/*.test.ts",
      "scripts/schema/*.test.ts",
      "scripts/probes/library-schema/constraints.test.ts",
    ],
    ["scripts/theme-validation.ts"],
    ["--test", "scripts/theme-validation.test.ts", "scripts/theme-resources/*.test.ts"],
    ["scripts/theme-resources.ts", "--check"],
    ["scripts/localization.ts", "--check"],
    ["--test", "scripts/localization/*.test.ts"],
    ["--test", "scripts/actions/*.test.ts"],
    ["--test", "scripts/probes/regional/*.test.ts"],
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
  console.log(JSON.stringify({ check: "script-source-size", status: "passed" }));
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : "Tooling check failed");
  process.exitCode = 1;
}
