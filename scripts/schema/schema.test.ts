import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildSchema } from "./build.ts";
import { outputs } from "./generate.ts";
import { boolean, list, names, record, text } from "./model.ts";
import type { Column } from "./model.ts";
import { proposal } from "./proposal.ts";
import { validate } from "./validate.ts";

const root = new URL("../../", import.meta.url);
const fixtureBytes = readFileSync(new URL("shared/schema/review-baseline.json", root));
const baseline = record(JSON.parse(fixtureBytes.toString("utf8")));
const key = (database: string, table: string) => `${database}.${table}`;

test("SCHEMA-01: frozen review fixture and unchanged SQL source hashes", () => {
  assert.equal(
    createHash("sha256").update(fixtureBytes).digest("hex"),
    "da90ad3cb441b646c078d3729c9a5c3272b621abfc0928ab1f009eff13cf6422",
  );
  for (const item of list(baseline.referenceSql)) {
    const source = record(item);
    assert.equal(
      createHash("sha256")
        .update(readFileSync(new URL(text(source.path), root)))
        .digest("hex"),
      source.sha256,
    );
  }
});

test("SCHEMA-02: all 17 tables, 146 columns and original notes survive conversion", () => {
  const schema = buildSchema();
  assert.equal(schema.tables.length, 17);
  assert.equal(schema.tables.flatMap((table) => table.columns).length, 146);
  assert.equal(schema.projectNote, baseline.projectNote);
  for (const item of list(baseline.tables)) {
    const expected = record(item);
    const table = schema.tables.find(
      (entry) =>
        key(entry.database, entry.name) === key(text(expected.database), text(expected.name)),
    );
    assert.ok(table);
    assert.equal(table.note, expected.note);
    const columns = list(expected.columns).map(record);
    assert.deepEqual(
      table.columns.map((column) => column.name),
      columns.map((column) => column.name),
    );
    for (const column of columns) {
      const actual: Column | undefined = table.columns.find((entry) => entry.name === column.name);
      assert.ok(actual);
      for (const attribute of ["type", "notNull", "note"] as const)
        assert.equal(actual[attribute], column[attribute]);
      if (boolean(column.primaryKey)) assert.ok(actual.primaryKey > 0);
      if (boolean(column.unique)) assert.ok(actual.unique);
    }
    for (const indexValue of list(expected.indexes)) {
      const index = record(indexValue);
      if (boolean(index.primaryKey)) {
        assert.deepEqual(
          table.columns.filter((column) => column.primaryKey > 0).map((column) => column.name),
          names(index.columns),
        );
      } else {
        assert.ok(
          table.indexes.some(
            (entry) =>
              JSON.stringify(entry.columns) === JSON.stringify(index.columns) &&
              entry.unique === index.unique,
          ),
        );
      }
    }
  }
  for (const item of list(baseline.groups)) {
    const group = record(item);
    const actual = schema.groups.find((entry) => entry.name === group.name);
    assert.ok(actual);
    for (const name of list(group.tables).map(text)) assert.ok(actual.tables.includes(name));
  }
});

test("SCHEMA-03: 11 relationships preserve endpoints, composite keys and actions", () => {
  const schema = buildSchema();
  assert.equal(schema.relationships.length, 11);
  for (const item of list(baseline.relationships)) {
    const expected = record(item);
    const endpoints = [
      key(text(expected.database), text(expected.table)) + "." + names(expected.columns).join(","),
      key(text(expected.targetDatabase), text(expected.targetTable)) +
        "." +
        names(expected.targetColumns).join(","),
    ].sort();
    const actual = schema.relationships.find(
      (relation) =>
        JSON.stringify(
          [
            key(relation.database, relation.table) + "." + relation.columns.join(","),
            key(relation.database, relation.targetTable) + "." + relation.targetColumns.join(","),
          ].sort(),
        ) === JSON.stringify(endpoints),
    );
    assert.ok(actual);
    assert.equal(actual.onDelete, expected.onDelete);
    assert.equal(actual.onUpdate, expected.onUpdate);
  }
  const removals = schema.tables.find((table) => table.name === "removals");
  assert.ok(removals);
  assert.ok(
    removals?.indexes.some(
      (index) =>
        index.unique &&
        index.partial &&
        index.sql?.includes("WHERE state IN ('staged','finalizing')"),
    ),
  );
  assert.ok(
    removals.sql?.includes("undo_operation_id IS NOT NULL AND undo_fingerprint IS NOT NULL"),
  );
  assert.equal(removals.columns.find((column) => column.name === "document_id")?.unique, false);
});

test("SCHEMA-04: missing identifiers, duplicate names and invalid references reject", () => {
  const schema = buildSchema();
  const table = schema.tables[0];
  const relation = schema.relationships[0];
  assert.ok(table && relation);
  table.name = "<unsafe>";
  assert.throws(() => validate(schema), /identifier/);
  const duplicate = buildSchema();
  duplicate.tables.push(structuredClone(duplicate.tables[0]!));
  assert.throws(() => validate(duplicate), /Duplicate/);
  const dangling = buildSchema();
  dangling.relationships.push({ ...relation, targetTable: "missing" });
  assert.throws(() => validate(dangling), /target/);
  const nonUnique = buildSchema();
  const viewLink = nonUnique.relationships.find(
    (entry) => entry.table === "local_view" && entry.targetTable === "drawings",
  );
  assert.ok(viewLink);
  viewLink.targetColumns = ["activity_order"];
  assert.throws(() => validate(nonUnique), /candidate key/);
  assert.throws(
    () => proposal({ tables: [], relationships: [{ ...relation, targetDatabase: "another" }] }),
    /Cross-file/,
  );
});

test("SCHEMA-05: generation is deterministic and committed outputs match", () => {
  const first = outputs();
  assert.deepEqual(first, outputs());
  for (const [path, content] of first)
    assert.equal(readFileSync(new URL(path, root), "utf8"), content);
  assert.match(first.get("docs/database/generated/catalog.svg") ?? "", /Per child: 0\.\.1 parent/);
  assert.match(
    first.get("docs/database/generated/dictionary.md") ?? "",
    /Current scope\/fencing state/,
  );
});
