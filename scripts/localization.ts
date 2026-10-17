import { catalog as sourceCatalog } from "../shared/localization/catalog.ts";
import { en } from "../shared/localization/en.ts";
import { uk } from "../shared/localization/uk.ts";
import { fileURLToPath } from "node:url";
import { parse } from "./localization/schema.ts";
import { generate } from "./localization/generate.ts";
import { synchronize } from "./localization/files.ts";
const root = new URL("../shared/localization/", import.meta.url);
try {
  if (process.argv.slice(2).some((arg) => arg !== "--check"))
    throw Error("Usage: node scripts/localization.ts [--check]");
  const { catalog, translations } = parse(sourceCatalog, { en, uk });
  await synchronize(
    fileURLToPath(new URL("generated/", root)),
    generate(catalog, translations),
    process.argv.includes("--check"),
  );
  console.log(
    JSON.stringify({
      check: "localization",
      status: "passed",
      messages: Object.keys(catalog.messages).length,
    }),
  );
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : "Localization failed");
  process.exitCode = 1;
}
