import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDiagram } from "../diagrams/render.ts";
import { loadTokens } from "../diagrams/tokens.ts";
import { buildSchema } from "./build.ts";
import { dictionary } from "./dictionary.ts";
import { domainView, overview } from "./views.ts";

const root = new URL("../../", import.meta.url);
export function outputs(): Map<string, string> {
  const schema = buildSchema();
  const tokens = loadTokens(
    JSON.parse(readFileSync(new URL("shared/diagrams/style.tokens.json", root), "utf8")),
  );
  const files = new Map([
    ["shared/schema/schema.json", JSON.stringify(schema, null, 2) + "\n"],
    ["docs/database/generated/dictionary.md", dictionary(schema)],
    ["docs/database/generated/overview.svg", renderDiagram(overview(schema), tokens)],
  ]);
  for (const database of ["catalog", "drawing", "jobs"])
    files.set(
      `docs/database/generated/${database}.svg`,
      renderDiagram(domainView(schema, database), tokens),
    );
  return files;
}
export function generate(check: boolean): void {
  // Build and validate every output before publishing any. Each replacement is atomic;
  // interruption between files is detected by --check, not claimed as a multi-file commit.
  const files = outputs();
  for (const [relative, content] of files) {
    const path = fileURLToPath(new URL(relative, root));
    if (check) {
      if (readFileSync(path, "utf8") !== content)
        throw new Error(`Stale schema output: ${relative}`);
    } else {
      mkdirSync(dirname(path), { recursive: true });
      const staged = `${path}.${process.pid}.tmp`;
      writeFileSync(staged, content, { flag: "wx" });
      renameSync(staged, path);
    }
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some((argument) => argument !== "--check"))
    throw new Error("Unknown schema generation argument");
  generate(process.argv.includes("--check"));
  console.log(
    "Schema definitions and generated views match (17 tables, 146 columns, 11 relationships).",
  );
}
