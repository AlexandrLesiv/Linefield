import type { Schema } from "./model.ts";

function cell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ").replaceAll("<", "&lt;");
}
export function dictionary(schema: Schema): string {
  const lines = [
    "# Generated schema dictionary — v4.1",
    "",
    "Generated from reference SQL, shared annotations and the documentation-only jobs proposal. Do not edit this output.",
    "",
    "The 17-table/146-column/11-relationship shape is owner-approved by decisions 209/237. SQL constraints/constants, runtime mechanisms and implementation retain their separate review gates. No production migration is installed.",
    "",
    "[Overview](overview.svg) · [Drawing](drawing.svg) · [Catalog](catalog.svg) · [Jobs](jobs.svg)",
    "",
    "SQL reference tables are inspected in isolated in-memory SQLite databases. Jobs has no executable SQL definition and remains proposal-only. The resulting portable JSON is a generated review artifact for future shared tooling, not a new editor or persistence authority.",
    "",
    "All source column/table notes survive below. Physical details absent from the original diagram notation are retained by exact reference CREATE SQL and indexes. Rust still owns transitions, contiguous sample order, identity validation, same-scope exact-set membership and cross-file recovery.",
    "",
    "Failure preserves uncertain drawing bytes and recovery authority. Catalog publication cannot make separate drawing writes atomic; missing catalog authority does not authorize deletion. See [bootstrap contract](../empty-library-v1.md) and [removal contract](../deletion-v4/proposal.md) for trigger/state/outcome/invariant cases and test ownership.",
    "",
    "## Inputs",
    "",
    ...schema.sources.map((source) => `- \`${source.path}\` — SHA256 \`${source.sha256}\``),
    "",
  ];
  for (const table of schema.tables) {
    lines.push(`## ${table.database}.${table.name}`, "", `Authority: **${table.authority}**.`, "");
    if (table.note) lines.push(table.note, "");
    lines.push(
      "| Column | Type | Required | Keys | Preserved review note |",
      "| --- | --- | --- | --- | --- |",
    );
    for (const column of table.columns) {
      const keys = [
        column.primaryKey ? `PK position ${column.primaryKey}` : "",
        column.unique ? "unique" : "",
      ]
        .filter(Boolean)
        .join(", ");
      lines.push(
        `| ${column.name} | ${column.type} | ${column.notNull ? "yes" : "no"} | ${keys} | ${cell(column.note)} |`,
      );
    }
    lines.push("", "### Indexes", "");
    for (const index of table.indexes) {
      lines.push(
        `- \`${index.name}\`: (${index.columns.join(", ")}); unique=${index.unique}; primary=${index.primaryKey}; partial=${index.partial}.`,
      );
      if (index.sql) lines.push("", "```sql", index.sql, "```", "");
    }
    lines.push("", "### Foreign keys", "");
    for (const relation of schema.relationships.filter(
      (entry) => entry.database === table.database && entry.table === table.name,
    ))
      lines.push(
        `- (${relation.columns.join(", ")}) → ${relation.database}.${relation.targetTable} (${relation.targetColumns.join(", ")}); DELETE ${relation.onDelete}; UPDATE ${relation.onUpdate}. Same file only.`,
      );
    if (table.sql)
      lines.push("", "### Exact reference table SQL", "", "```sql", table.sql, "```", "");
    else
      lines.push(
        "",
        "No executable SQL exists for this proposal table. Its constraints are not verified by SQL introspection.",
        "",
      );
  }
  lines.push(
    "## Original review context",
    "",
    "The following source note is preserved verbatim as migration provenance. Its original pending-status wording is historical; current disposition appears above.",
    "",
    "```text",
    schema.projectNote.trim(),
    "```",
    "",
  );
  return lines.join("\n");
}
