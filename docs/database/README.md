# Current status: S02 v3 approved

Owner approved hosted Version8 and the exact local DBML/defaults snapshot on 2026-10-17
(decision209). [Approval scope](../reviews/S02-v3-approval-2026-10-17.md).
Source files and hosted review notes retain their pre-approval wording to preserve the exact
reviewed artifact; quality/S02-v3-review.json records current approval and source hashes.
No runtime implementation or precision guarantees follow from schema approval.
Older pending status below is superseded by this record.

# Current review: S02 v3 regional coordinates

PENDING OWNER REVIEW, NOT IMPLEMENTED. [Grouped DBML](review.dbml) and
[change summary, defaults, constraints and cases](schema-v3.md).
14 tables, 122 columns, 8 same-file references; three SQLite databases.
The v3 amendment includes saved viewport centers as well as samples/stroke placement.
The prior v2 approval applies only to its original snapshot; exact previous local DBML/layout
is preserved in [history](history/s02-v2/README.md). Older status notes below are historical.
Hosted v3 publication and validation are recorded in quality/S02-v3-review.json.

Current OWNER-APPROVED v2 proposal (decision 181; [approval scope](../reviews/S02-v2-approval-2026-10-16.md)): [S02 consolidated v2](../reviews/S02-consolidated-v2.md) and [schema delta](schema-v2.md). Current DBML replaces rename receipts with command receipts and adds incarnation/mutation fields: 14 tables, 116 columns, 8 references. Historical approvals below apply only to their exact earlier versions. Hosted publication status is recorded in ../../quality/S02-v2-review.json.

# S02 database proposal

Status: table structure approved by the owner on 2026-10-16; operational contracts and implementation remain pending. See [scoped approval](../reviews/S02-table-structure-approval-2026-10-16.md). Canonical individual DBML files:

- [catalog.dbml](catalog.dbml) — device-local library index, local tool/view preferences and proposed lifecycle records.
- [drawing.dbml](drawing.dbml) — one SQLite file per drawing: header, tools, ordered strokes and sample rows; private atomic rename receipts.
- [jobs.dbml](jobs.dbml) — durable export jobs, immutable sources and native destination grants.
- [Dictionary](dictionary.md) and [constraints](constraints.md) — meaning, nullability, units, integrity and pending bounds.
- [Review brief](../reviews/S02-database-interfaces-v1.md) — choices and implementation gates.

Each DBML file represents a separate SQLite database. Same-file Ref lines are real proposed foreign
keys. Document IDs across files are logical references validated by Rust; they are not SQL FKs.
The combined review DBML uses namespaces purely to distinguish files in dbdocs.

**Versioning:** retain DBML and actual exported layout in the repository. Do not invent a tool layout
file or claim a screenshot is editable layout. Hash the exact source sent to the service, record
the service URL/version/date. The owner selected hosted dbdocs viewing; do not retain local rendered diagram files. Online schema is a
review copy; local files remain source of truth. Physical migration DDL becomes executable authority
only after approval and implementation.

**Service authorization:** on 2026-10-16 the owner approved schema-only use of dbdiagram.io and then
explicitly approved publishing schema definitions/explanatory notes to a private dbdocs project.
No drawing data, credentials, account invitations, public sharing or live database connection is authorized.
Publication/visibility verification is recorded in the review evidence, not inferred from defaults.

DB1-A retains three databases with conservative authority-loss recovery. DB2-A selects persistent activity ordering; the catalog amendment adds activity_highwater and replaces the timestamp sort field with activity_order (105 fields total). DB3-A selects multiple bounded rename receipts; DB4-B selects Rust default-name formatting. See [batch decision record](../reviews/S02-db-batch-1.md). Concrete bounds/coordination/ABI remain pending.

Current official tooling recommends the unified dbdiagram CLI; the older dbdocs CLI is deprecated.
Official dbdiagram 0.6.3 is now installed locally in the root package.json by explicit owner request. Validation and authenticated private publication passed; CI publishing and enforced credential isolation remain pending. See [CLI security](cli-security.md).
[Vendor quickstart](https://docs.dbdiagram.io/dbdocs/),
[access control](https://docs.dbdiagram.io/access-control/).

## Conceptual relationships

A library indexes many drawings. A drawing owns ordered strokes; each stroke owns ordered samples
and references a tool. Device-local preferences attach to the catalog drawing identity, not to
portable stroke appearance. Export jobs reference immutable snapshots; snapshot source identity
does not confer ownership of the live drawing. Rename receipts share the drawing transaction
so a lost reply can be resolved without applying the rename again.

Native exports reconstruct allowlisted current data in a fresh SQLite file. Internal recovery
copies may retain private service metadata and are never presented as sanitized exports.

## Hosted review and approval

[Private dbdocs project](https://dbdocs.io/AlexandrLesiv/Linefield-S02-proposal-v1), table structure
approved against Version 3: 14 tables, 104 fields, 8 same-file relationships.
[Combined source](review.dbml), [editable layout](review.dbdiagram),
[presentation limits](diagram-presentation.md) and [approval record](../reviews/S02-table-structure-approval-2026-10-16.md).
A subsequent status-only publication records approval without changing the table definitions.
Sharing was verified private/invited-only. Local PNG/SVG/screenshots were removed at owner request;
use dbdocs for visual review and source hashes for reproducibility.

## Approval status convention

Use the project note to distinguish APPROVED table structure, PENDING REVIEW interface/recovery
decisions and NOT IMPLEMENTED runtime work. Future schema changes are pending until the owner
approves their exact version. Labels/notes document approval; they do not enforce access or gates.

## Selected amendment awaiting concrete schema review

DB9-A / decision 167 selects database incarnation plus existing content/metadata revisions. The exact new field definition and import/export/replacement rules are pending in the next schema packet; current DBML and hosted Version 5 do not yet represent this addition. Preserve historical approval/version evidence. See ../architecture/storage-transitions-v1.md.

DB15-A / decision 173 also selects generalizing rename receipts to bounded relevant editing-command outcomes. Exact table/field amendments and privacy/retention contracts await the concrete schema review; existing DBML/hosted Version 5 is unchanged.
