# Schema sources and review

Schema content is authored in SQL and shared data, with generated native SVG available
for local visual review. Agents read the source definitions; generated exports are not
tracked or treated as an independent schema authority.

- [Shared schema source guide](../../shared/schema/README.md), annotations and proposal data.
- [Catalog reference SQL](empty-library-catalog-v1.sql), [drawing SQL](empty-library-drawing-v1.sql)
  and [removal SQL](empty-library-removal-v1.sql).
- [Constraints and receipts](constraints.md), [regional coordinates](regional-coordinates.md)
  and [removal scope](removal.md).
- [Empty-library bootstrap proposal](empty-library.md) and [document format](document-format.md).

The reviewed combined model has 17 tables, 146 columns and 11 relationships. Fourteen
catalog/drawing tables derive from reference SQL; three jobs tables remain documentation-only.
Reference SQL is not an adopted production migration. Generated dictionaries and schema views
must agree with SQL/shared annotations; they do not grant implementation authority.

Current storage adoption is blocked. Follow the [durable-library scope](../reviews/durable-library-scope.md)
and [browser storage proposal](../architecture/browser-storage.md). Material semantic changes
need owner review; changing presentation must not change constraints, approvals or failure gates.
