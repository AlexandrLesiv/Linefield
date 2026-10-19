import { boolean, identifier, list, names, record, text } from "./model.ts";
import type { Relationship, Table } from "./model.ts";

export function proposal(value: unknown): { tables: Table[]; relationships: Relationship[] } {
  const input = record(value);
  const tables = list(input.tables).map((item): Table => {
    const table = record(item);
    const name = identifier(table.name);
    const indexes = list(table.indexes).map((indexValue, i) => {
      const index = record(indexValue);
      return {
        name: `${name}_review_${i}`,
        columns: names(index.columns),
        unique: boolean(index.unique),
        primaryKey: boolean(index.primaryKey),
        partial: false,
        sql: null,
      };
    });
    const columns = list(table.columns).map((columnValue) => {
      const column = record(columnValue);
      const columnName = identifier(column.name);
      const type = text(column.type);
      if (!["INTEGER", "BLOB", "TEXT", "REAL"].includes(type))
        throw new Error("Invalid proposal column type");
      const composite =
        indexes.find((index) => index.primaryKey)?.columns.indexOf(columnName) ?? -1;
      return {
        name: columnName,
        type,
        notNull: boolean(column.notNull),
        primaryKey: boolean(column.primaryKey) ? 1 : composite + 1,
        unique: boolean(column.unique),
        note: text(column.note),
      };
    });
    return {
      database: identifier(table.database),
      name,
      columns,
      indexes,
      note: text(table.note),
      sql: null,
      authority: "proposal-only",
    };
  });
  const relationships = list(input.relationships).map((item): Relationship => {
    const relation = record(item);
    const database = identifier(relation.database);
    if (database !== identifier(relation.targetDatabase))
      throw new Error("Cross-file SQL relationship rejected");
    return {
      database,
      table: identifier(relation.table),
      columns: names(relation.columns),
      targetTable: identifier(relation.targetTable),
      targetColumns: names(relation.targetColumns),
      onDelete: text(relation.onDelete),
      onUpdate: text(relation.onUpdate),
    };
  });
  return { tables, relationships };
}
