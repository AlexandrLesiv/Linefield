import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { list, record, text } from "./model.ts";
import type { Schema } from "./model.ts";
import { proposal } from "./proposal.ts";
import { inspect } from "./sql.ts";
import { validate } from "./validate.ts";

const root = new URL("../../", import.meta.url);
export const sqlFiles = {
  catalog: [
    "docs/database/empty-library-catalog-v1.sql",
    "docs/database/empty-library-removal-v1.sql",
  ],
  drawing: ["docs/database/empty-library-drawing-v1.sql"],
};
export function buildSchema(): Schema {
  const sources: Schema["sources"] = [];
  function read(path: string): string {
    const data = readFileSync(new URL(path, root), "utf8");
    sources.push({ path, sha256: createHash("sha256").update(data).digest("hex") });
    return data;
  }
  const annotations = record(JSON.parse(read("shared/schema/annotations.json")));
  const notes = record(annotations.tables);
  const proposed = proposal(JSON.parse(read("shared/schema/jobs-proposal.json")));
  if (proposed.tables.some((table) => table.database !== "jobs"))
    throw new Error("Only jobs may use proposal-only structure");
  const inspected = Object.entries(sqlFiles).map(([name, paths]) => inspect(name, paths.map(read)));
  const tables = [...inspected.flatMap((db) => db.tables), ...proposed.tables];
  if (Object.keys(notes).length !== tables.length) throw new Error("Annotation table drift");
  for (const table of tables) {
    const note = record(notes[`${table.database}.${table.name}`]);
    const columns = record(note.columns);
    if (Object.keys(columns).length !== table.columns.length)
      throw new Error("Annotation column drift");
    table.note = text(note.note);
    for (const column of table.columns) column.note = text(columns[column.name]);
  }
  const groups = list(annotations.groups).map((value) => {
    const group = record(value);
    return { name: text(group.name), tables: list(group.tables).map(text) };
  });
  const catalog = groups.find((group) => group.name === "Local library");
  if (!catalog) throw new Error("Missing library group");
  for (const table of tables.filter((entry) => entry.database === "catalog")) {
    const key = `${table.database}.${table.name}`;
    if (!catalog.tables.includes(key)) catalog.tables.push(key);
  }
  const schema: Schema = {
    version: "review-v4.1",
    sources,
    projectNote: text(annotations.projectNote),
    groups,
    tables,
    relationships: [...inspected.flatMap((db) => db.relationships), ...proposed.relationships],
  };
  validate(schema);
  return schema;
}
