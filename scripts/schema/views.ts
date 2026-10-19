import type { Diagram, DiagramElement } from "../diagrams/render.ts";
import type { Schema, Table } from "./model.ts";

const width = 1696;
function label(x: number, y: number, text: string, style = "body"): DiagramElement {
  return { tag: "text", attrs: { x, y, class: style }, text };
}
function panel(x: number, y: number, panelWidth: number, height: number): DiagramElement {
  return {
    tag: "rect",
    attrs: {
      x,
      y,
      width: panelWidth,
      height,
      rx: "{diagram.size.cardRadius}",
      fill: "{diagram.color.panel}",
      stroke: "{diagram.color.divider}",
      "stroke-width": "{diagram.size.border}",
    },
  };
}
function tableCard(table: Table, x: number, y: number, height: number): DiagramElement[] {
  return [
    panel(x, y, 760, height),
    label(x + 24, y + 40, `${table.database}.${table.name}`, "section"),
    label(
      x + 24,
      y + 69,
      table.authority === "reference-sql"
        ? "REFERENCE SQL · STRICT · not production"
        : "PROPOSAL ONLY · no executable jobs schema",
      "meta",
    ),
    ...table.columns.flatMap((column, i) => {
      const flags = [
        column.primaryKey ? `PK${column.primaryKey}` : "",
        column.unique ? "U" : "",
        column.notNull ? "required" : "nullable",
      ]
        .filter(Boolean)
        .join(" · ");
      return [
        label(x + 24, y + 112 + i * 32, column.name),
        label(x + 455, y + 112 + i * 32, column.type, "meta"),
        label(x + 535, y + 112 + i * 32, flags, "meta"),
      ];
    }),
  ];
}
function frame(title: string, height: number, elements: DiagramElement[]): Diagram {
  return {
    width,
    height,
    title,
    description:
      "Generated schema review. SQL owns reference structure; Rust owns semantic validation and cross-file coordination. The companion dictionary includes every source note, constraint, index and relationship. No production implementation is approved by this image.",
    elements: [
      { tag: "rect", attrs: { x: 0, y: 0, width, height, fill: "{diagram.color.canvas}" } },
      label(72, 72, title, "title"),
      label(
        72,
        112,
        "V4.1 shape approved · reference constraints remain proposals · NOT IMPLEMENTED",
        "body",
      ),
      ...elements,
      label(
        72,
        height - 40,
        "Generated from shared/schema inputs · full notes and SQL details: dictionary.md · no cross-file SQL foreign keys",
        "meta",
      ),
    ],
  };
}
export function domainView(schema: Schema, database: string): Diagram {
  const tables = schema.tables.filter((table) => table.database === database);
  const elements: DiagramElement[] = [];
  let y = 160;
  for (let i = 0; i < tables.length; i += 2) {
    const row = tables.slice(i, i + 2);
    const height = Math.max(...row.map((table) => 112 + table.columns.length * 32));
    row.forEach((table, index) => elements.push(...tableCard(table, 72 + index * 792, y, height)));
    y += height + 32;
  }
  elements.push(label(72, y + 32, "Foreign-key relationships", "section"));
  y += 66;
  for (const relation of schema.relationships.filter((entry) => entry.database === database)) {
    const child = tables.find((table) => table.name === relation.table);
    if (!child) throw new Error("Missing relationship child");
    const nullable = relation.columns.some(
      (name) => !child.columns.find((column) => column.name === name)?.notNull,
    );
    const key = relation.columns.join(",");
    const unique =
      child.indexes.some(
        (index) => index.unique && !index.partial && index.columns.join(",") === key,
      ) ||
      child.columns
        .filter((column) => column.primaryKey > 0)
        .map((column) => column.name)
        .join(",") === key;
    elements.push(
      panel(72, y, 1552, 146),
      label(96, y + 36, relation.table, "node"),
      label(1100, y + 36, relation.targetTable, "node"),
      { tag: "path", attrs: { d: `M650 ${y + 30}H1050`, class: "edge" } },
      label(96, y + 67, relation.columns.join(" + "), "meta"),
      label(1100, y + 67, relation.targetColumns.join(" + "), "meta"),
      label(
        96,
        y + 102,
        `Per child: ${nullable ? "0..1" : "1"} parent · per parent: ${unique ? "0..1" : "0..many"} children`,
        "body",
      ),
      label(
        96,
        y + 128,
        `Same file · DELETE ${relation.onDelete} · UPDATE ${relation.onUpdate} · ${database === "jobs" ? "proposed SQL" : "reference SQL"}`,
        "meta",
      ),
    );
    y += 170;
  }
  return frame(`${database[0]?.toUpperCase()}${database.slice(1)} schema`, y + 88, elements);
}
export function overview(schema: Schema): Diagram {
  const elements: DiagramElement[] = [];
  for (const [index, database] of ["drawing", "catalog", "jobs"].entries()) {
    const tables = schema.tables.filter((table) => table.database === database);
    const x = 72 + index * 528;
    elements.push(
      panel(x, 172, 496, 660),
      label(x + 24, 218, database, "section"),
      label(
        x + 24,
        252,
        `${tables.length} tables · ${tables.flatMap((table) => table.columns).length} columns`,
        "body",
      ),
    );
    tables.forEach((table, i) => elements.push(label(x + 24, 306 + i * 40, table.name, "node")));
    elements.push(
      label(
        x + 24,
        782,
        database === "jobs"
          ? "Proposal only; future export scope"
          : "Reference DDL; no installed migration",
        "meta",
      ),
    );
  }
  elements.push(
    label(
      72,
      900,
      "Three separate files · shared identity is a logical link, never a cross-file SQL FK",
      "section",
    ),
    label(
      72,
      944,
      "Drawing: portable metadata and artwork authority. Catalog: repairable projection and local lifecycle authority.",
      "body",
    ),
    label(
      72,
      980,
      "Jobs: immutable source capture and destination grants. File updates do not form one atomic transaction.",
      "body",
    ),
    label(
      72,
      1030,
      "17 tables · 146 columns · 11 same-file relationships. Failure preserves uncertain sources; no destructive guessing.",
      "body",
    ),
  );
  return frame("Library schema boundaries", 1140, elements);
}
