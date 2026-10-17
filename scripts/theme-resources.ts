import { fileURLToPath } from "node:url";
import { resolved } from "../shared/theme/resolve.ts";
import { synchronize } from "./localization/files.ts";
import { generateThemeResources } from "./theme-resources/generate.ts";

try {
  if (process.argv.slice(2).some((argument) => argument !== "--check"))
    throw Error("Usage: node scripts/theme-resources.ts [--check]");
  const outputs = generateThemeResources(resolved);
  await synchronize(
    fileURLToPath(new URL("../shared/theme/generated/", import.meta.url)),
    outputs,
    process.argv.includes("--check"),
  );
  console.log(
    JSON.stringify({
      check: "theme-resources",
      status: "passed",
      files: Object.keys(outputs).length,
    }),
  );
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : "Theme generation failed");
  process.exitCode = 1;
}
