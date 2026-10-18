# S02 table-structure approval — 2026-10-16

Status: APPROVED — TABLE STRUCTURE ONLY. Owner statement: "Ok. I approve that table structure."
Reviewed hosted baseline: private Linefield-S02-proposal-v1, Version 3.
Approval applies to the displayed 14 tables, 104 fields, keys and eight same-file relationships,
including the existing receipt table, under the three-database baseline. It does not silently
choose a fourth database, change ordering or approve unspecified constraints.

No application implementation is authorized by this approval. Existing schema field names,
types and relationships stay selected unless a later reviewed change supersedes them.

## Separate statuses

| Scope | Status |
| --- | --- |
| Displayed schema source table structure | Approved by owner |
| Typed FFI | Pending owner review; gallery-first signatures exist, full canvas/file DTOs incomplete |
| Cross-process rename transport | Pending; NSXPC is a candidate with discovery/signing/sandbox proof outstanding |
| Ownership and wake/shutdown contract | Proposed; exact lock lifetime, copied outputs and readiness approach need review |
| Recovery / authority-loss behavior | Proposed; catalog-loss naming/deletion authority unresolved |
| Receipt retention, ordering, numeric limits and default-name effects | Pending operational decisions; table approval does not resolve them |
| Generated ABI/schema/runtime tests | Not executed; implementation not authorized |

S02 stays open. Avoid asking the owner to reapprove unchanged tables. Future structural changes
need an explicit diff and renewed scoped approval. Review D1 (authority loss) next; if retaining
the approved three-database structure, specify safe degraded recovery rather than add a fourth
database implicitly. SQLite covers transactions within a database, not app ownership or atomic
multi-file workflows.

## Exact approved baseline

Descriptive labels below identify historical sources. Recover the original source identity through
quality/historical-records.json at Git b0cb531; these labels are not current file paths.

| Source | SHA-256 |
| --- | --- |
| Historical review schema source | a06ac7c55af54403ab2ccdced30cf3224bb8e0476d78fc08ce6b019aba22a2a2 |
| Historical schema layout | f2203e806455b04fb8435dc77f450f02c4f58621443b2c61e4d7885892a5fb03 |
| Historical drawing schema source | 677d74e4e126b44fbde817b302c91406113ef508b3159a4ffacc9113944258a8 |
| Historical catalog schema source | f83e2f3d60b0348b54fecc60f6e6f443e17e08feb49a1ae586712f2a4a708352 |
| Historical jobs schema source | 4c409e2e306e1237085b2a48f50303cec9a255a09d3538397e1cb2a19cbce110 |

Hashes identify the files shown before approval-status notes were added. A status-only publication
is not another schema change. The current diagram remains a review view; the source and explicit
owner statement above establish the approval scope.

## historical schema review presentation convention

Project notes display APPROVED / PENDING REVIEW / NOT IMPLEMENTED per scope, with review date,
baseline version and local approval-record path. Table/group notes can identify future proposed
changes if needed; do not add application status columns just to track design approval.
A future structural proposal must be marked PENDING REVIEW and must not inherit this approval.
Version labels can aid navigation where supported, but mutable labels are not approval enforcement.
No native approval workflow or immutable signature is claimed. Retain local versioned source,
hashes and decisions because hosted history availability depends on plan.
