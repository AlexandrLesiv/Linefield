import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const source = readFileSync(root + "crates/vector-engine/src/catalog/mod.rs", "utf8");
const strings = Object.fromEntries(
  [...source.matchAll(/pub const (\w+): &str =\s*r#"([\s\S]*?)"#;/g)].map((m) => [m[1], m[2]]),
);
const integer = (name: string) => {
  const found = source.match(new RegExp(`pub const ${name}: (?:u32|u64|usize) = (\\d+);`));
  if (!found?.[1]) throw Error(`Missing catalog constant ${name}`);
  return Number(found[1]);
};
const names = Object.keys(strings).filter((name) => name.startsWith("SQL_"));
if (names.length !== 25 || !strings.ID_PATTERN || !strings.DEFAULT_EN || !strings.DEFAULT_UK)
  throw Error("Incomplete catalog contract");
const camel = (name: string) =>
  name.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const sql = Object.fromEntries(names.map((name) => [camel(name.slice(4)), strings[name]]));
const output = `// Generated from crates/vector-engine/src/catalog/mod.rs. Do not edit.
export const catalogVersion = ${integer("VERSION")};
export const catalogLimits = Object.freeze(${JSON.stringify({ pageSize: integer("PAGE_SIZE"), titleBytes: integer("TITLE_BYTES"), titleScalars: integer("TITLE_SCALARS"), timestampMax: integer("TIMESTAMP_MAX") })});
export const catalogIdPattern = ${JSON.stringify(strings.ID_PATTERN)};
export const catalogDefaultNames = Object.freeze(${JSON.stringify({ en: strings.DEFAULT_EN, uk: strings.DEFAULT_UK })});
export const catalogSql = Object.freeze(${JSON.stringify(sql, null, 2)});
`;
const path = root + "apps/vector-editor/src/saving/catalog-generated.js";
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output) throw Error("Stale generated saving catalog contract");
} else writeFileSync(path, output);
