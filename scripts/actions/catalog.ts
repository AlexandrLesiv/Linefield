import { readFile, realpath, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
export const actionIds = [
  "root-typecheck",
  "web-typecheck",
  "lint",
  "locales-check",
  "theme-resources-check",
] as const;
export type ActionId = (typeof actionIds)[number];
export interface Command {
  executable: string;
  arguments: string[];
  version: string;
}
export function parseAction(arguments_: readonly string[]): ActionId | null {
  if (arguments_.length !== 1) return null;
  return actionIds.find((id) => id === arguments_[0]) ?? null;
}
async function version(path: string, expected: string): Promise<string> {
  if ((await stat(path)).size > 65536) throw Error("tool-unavailable");
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== expected
  )
    throw Error("tool-unavailable");
  return expected;
}
export async function commandFor(root: string, id: ActionId): Promise<Command> {
  if (process.platform !== "darwin" && process.platform !== "linux")
    throw Error("unsupported-host");
  if (id === "root-typecheck" || id === "web-typecheck") {
    const manifest = join(root, "node_modules/typescript/package.json");
    const toolVersion = await version(manifest, "7.0.2");
    const require = createRequire(await realpath(manifest));
    const native = require.resolve(
      `@typescript/typescript-${process.platform}-${process.arch}/package.json`,
    );
    await version(native, toolVersion);
    return {
      executable: join(dirname(native), "lib/tsc"),
      arguments:
        id === "web-typecheck" ? ["--noEmit", "-p", "apps/web/tsconfig.json"] : ["--noEmit"],
      version: toolVersion,
    };
  }
  if (id === "lint")
    return {
      executable: process.execPath,
      arguments: [
        join(root, "node_modules/oxlint/bin/oxlint"),
        "--deny-warnings",
        "scripts",
        "shared/theme",
        "shared/localization",
        "apps/web/src",
        "apps/web/tests",
      ],
      version: await version(join(root, "node_modules/oxlint/package.json"), "1.88.0"),
    };
  return {
    executable: process.execPath,
    arguments: [
      join(root, id === "locales-check" ? "scripts/localization.ts" : "scripts/theme-resources.ts"),
      "--check",
    ],
    version: process.version,
  };
}
