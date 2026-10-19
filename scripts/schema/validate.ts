import { identifier } from "./model.ts";
import type { Schema } from "./model.ts";

export function validate(schema: Schema): void {
  const tables = new Map(schema.tables.map((table) => [`${table.database}.${table.name}`, table]));
  if (tables.size !== schema.tables.length) throw new Error("Duplicate schema table");
  for (const table of schema.tables) {
    identifier(table.database);
    identifier(table.name);
    const names = new Set(table.columns.map((column) => identifier(column.name)));
    if (names.size !== table.columns.length) throw new Error("Duplicate schema column");
    for (const index of table.indexes) {
      identifier(index.name);
      if (index.columns.length === 0 || index.columns.some((name) => !names.has(name)))
        throw new Error("Invalid schema index columns");
    }
  }
  const keys = new Set<string>();
  for (const relation of schema.relationships) {
    const child = tables.get(`${relation.database}.${relation.table}`);
    const parent = tables.get(`${relation.database}.${relation.targetTable}`);
    if (
      !child ||
      !parent ||
      relation.columns.length === 0 ||
      relation.columns.length !== relation.targetColumns.length
    )
      throw new Error("Invalid schema relationship target");
    if (
      relation.columns.some((name) => !child.columns.some((column) => column.name === name)) ||
      relation.targetColumns.some((name) => !parent.columns.some((column) => column.name === name))
    )
      throw new Error("Invalid schema relationship columns");
    const targetKey = relation.targetColumns.join(",");
    const primaryKey = parent.columns
      .filter((column) => column.primaryKey > 0)
      .sort((a, b) => a.primaryKey - b.primaryKey)
      .map((column) => column.name)
      .join(",");
    const uniqueColumn =
      relation.targetColumns.length === 1 &&
      parent.columns.some((column) => column.name === relation.targetColumns[0] && column.unique);
    if (
      targetKey !== primaryKey &&
      !uniqueColumn &&
      !parent.indexes.some(
        (index) => index.unique && !index.partial && index.columns.join(",") === targetKey,
      )
    )
      throw new Error("Relationship target is not an unconditional candidate key");
    if (
      ![relation.onDelete, relation.onUpdate].every((action) =>
        ["RESTRICT", "CASCADE", "NO ACTION", "SET NULL", "SET DEFAULT"].includes(action),
      )
    )
      throw new Error("Invalid schema relationship action");
    const key = JSON.stringify(relation);
    if (keys.has(key)) throw new Error("Duplicate schema relationship");
    keys.add(key);
  }
  for (const group of schema.groups)
    if (group.tables.some((key) => !tables.has(key))) throw new Error("Invalid schema group");
}
