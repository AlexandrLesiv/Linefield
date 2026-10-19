import { DatabaseSync } from "node:sqlite";
import { identifier, number, text } from "./model.ts";
import type { Index, Relationship, Table } from "./model.ts";

export function inspect(
  database: string,
  sources: string[],
): {
  tables: Table[];
  relationships: Relationship[];
} {
  identifier(database);
  using db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const source of sources) db.exec(source);
  const relationships: Relationship[] = [];
  const tables = db
    .prepare("SELECT name,sql FROM sqlite_schema WHERE type='table' ORDER BY name")
    .all()
    .map((row): Table => {
      const name = identifier(row.name);
      const indexes = db
        .prepare(`PRAGMA index_list('${name}')`)
        .all()
        .map((entry): Index => {
          const indexName = identifier(entry.name);
          const sql = db.prepare("SELECT sql FROM sqlite_schema WHERE name=?").get(indexName)?.sql;
          return {
            name: indexName,
            columns: db
              .prepare(`PRAGMA index_info('${indexName}')`)
              .all()
              .map((c) => identifier(c.name)),
            unique: number(entry.unique) === 1,
            primaryKey: entry.origin === "pk",
            partial: number(entry.partial) === 1,
            sql: sql === null ? null : text(sql),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "en"));
      const columns = db
        .prepare(`PRAGMA table_info('${name}')`)
        .all()
        .map((column) => ({
          name: identifier(column.name),
          type: text(column.type),
          notNull: number(column.notnull) === 1,
          primaryKey: number(column.pk),
          unique: indexes.some(
            (index) =>
              index.unique &&
              !index.partial &&
              index.columns.length === 1 &&
              index.columns[0] === column.name,
          ),
          note: "",
        }));
      const grouped = new Map<number, Relationship>();
      for (const fk of db.prepare(`PRAGMA foreign_key_list('${name}')`).all()) {
        const id = number(fk.id);
        let relation = grouped.get(id);
        if (!relation) {
          relation = {
            database,
            table: name,
            columns: [],
            targetTable: identifier(fk.table),
            targetColumns: [],
            onDelete: text(fk.on_delete),
            onUpdate: text(fk.on_update),
          };
          grouped.set(id, relation);
        }
        relation.columns.push(identifier(fk.from));
        relation.targetColumns.push(identifier(fk.to));
      }
      relationships.push(...grouped.values());
      if (db.prepare("SELECT strict FROM pragma_table_list WHERE name=?").get(name)?.strict !== 1)
        throw new Error("Expected STRICT reference table");
      return {
        database,
        name,
        columns,
        indexes,
        note: "",
        sql: text(row.sql),
        authority: "reference-sql",
      };
    });
  return { tables, relationships };
}
