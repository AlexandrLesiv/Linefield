# Shared schema review definitions

Decision239 selects local generated native SVG, using the same shared style tokens as architecture
diagrams. The previous hosted toolchain is retired. This changes review presentation, not database
behavior or production implementation authority.

## Current review packet

- [Overview](generated/overview.svg), [catalog](generated/catalog.svg),
  [drawing](generated/drawing.svg), [jobs](generated/jobs.svg).
- [Generated dictionary](generated/dictionary.md) and [portable shared schema](../../shared/schema/schema.json).
- [Deletion v4.1 contract](deletion-v4/proposal.md) and [empty-library SQL scope](empty-library-v1.md).

The converted proposal preserves17 tables,146 columns and11 relationships. Fourteen catalog/drawing
tables are derived from unchanged reference SQL. Three jobs tables remain documentation-only;
there is no approved jobs migration hidden in the generator. Typed annotations retain descriptions,
conceptual links and review notes. DTCG tokens govern presentation, never SQL constraints.

## Authority and regeneration

Canonical inputs: empty-library-catalog-v1.sql, empty-library-drawing-v1.sql,
empty-library-removal-v1.sql and shared/schema input definitions/annotations. The generated schema
JSON is portable review data that future host tooling can consume; it is not an independent mutable
schema authority. Executable migrations remain subject to implementation approval and conformance.

Run pnpm schema:generate after input changes, pnpm schema:check for drift and pnpm schema:test for
semantic/SQL parity. Diagram styles come from shared/diagrams/style.tokens.json; change those once,
regenerate both architecture and schema views, and review layout/contrast. No network renderer.

Original approved schema bytes/layout and historical publication evidence are retrievable at Git
commit e08f304. Earlier approval hashes identify that revision, not a cleaned current document.
The old dictionary is historical and must not override the generated current dictionary. Do not
promote old fields or infer storage adoption from the changed review format. Storage experiments
still contain known failures; production durable library and engine remain separately gated.
