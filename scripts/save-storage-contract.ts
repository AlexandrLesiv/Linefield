import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const source = readFileSync(root + "crates/vector-engine/src/save_storage_sql.rs", "utf8");
const entries = [...source.matchAll(/pub const (\w+): &str =\s*r#"([\s\S]*?)"#;/g)];
if (entries.length !== 88) throw Error("Incomplete storage contract");
const camel = (name: string) =>
  name.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const statements = Object.fromEntries(entries.map((m) => [camel(m[1]!), m[2]]));
const output = `// Generated from crates/vector-engine/src/save_storage_sql.rs. Do not edit.\nconst storageSql = Object.freeze(${JSON.stringify(statements, null, 2)});\n`;
const owner = `// Generated from shared Rust asset-owner contract. Do not edit.\nexport const assetOwnerLockPrefix = ${JSON.stringify(statements.assetOwnerLockPrefix)};\n`;
for (const [relative, content] of [
  ["apps/vector-editor/src/saving/chunk-generated.js", output],
  ["apps/vector-editor/src/saving/asset-owner-contract.ts", owner],
]) {
  if (!relative || !content) throw Error("Missing storage contract output");
  const path = root + relative;
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== content) throw Error("Stale storage SQL contract");
  } else writeFileSync(path, content);
}
