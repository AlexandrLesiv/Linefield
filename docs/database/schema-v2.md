# S02 v2 schema amendment and dictionary
Status: owner-approved concrete proposal, decision 181 on 2026-10-16; not implemented. Lead integrates database specialist review against decisions through 180. No deployed Linefield format exists; proposal version 2 is not automatically user_version 2.

## Delta from hosted Version 5
| Database | Change | Meaning |
| --- | --- | --- |
| drawing.document | Add database_incarnation BLOB(16) | Fence controlled replacements; ordinary coordinator restart keeps it |
| drawing.strokes | Add mutation_revision INTEGER | Last semantic mutation's global content revision, positive |
| drawing | Replace rename_receipts (6 columns) with command_receipts (12 columns) | Atomic durable outcomes for seven named mutation kinds |
| catalog.drawings | Add database_incarnation BLOB(16) | Last observed source, not a second authority |
| catalog.lifecycle | Add nullable expected_database_incarnation BLOB(16) | Required for existing-file upgrade/delete; creation may not yet have one |
| jobs.snapshots | Add source_database_incarnation BLOB(16) | Captured source identity, distinct from independent snapshot instance |

14 tables, 116 columns, 8 same-database relationships. No new database or persistent history table. Existing dictionary applies to unchanged columns; this document supersedes its rename-receipt section. Fresh independent imports regenerate drawing/stroke/incarnation identities. Migration copies stay private.

## Concrete constraints
All owned tables STRICT. SQLite BLOB(16) in this prose means BLOB with CHECK(length(value)=16), not a SQLite declared BLOB(16) type. PK local INTEGER keys positive; UUIDs canonical bytes, not GUID-native struct order. Fixed tool IDs remain unchanged.
- document has exactly one singleton=1 row. content/metadata revisions 0..INT64_MAX.
- strokes.mutation_revision is 1..INT64_MAX and <= document.content_revision. Cross-row bound enforced by fixed Rust validation inside the transaction, not a misleading SQL CHECK subquery.
- Each completed non-no-op content operation advances content_revision once. Assign resulting revision to every surviving/restored affected stroke. Move/scale do not rewrite samples or paint order.
- Delete removes row/samples. Guarded session Undo restores stable stroke identity with a NEW mutation_revision. Ordinary Create gets a fresh coordinator-authorized UUID; absent ID is not permission to resurrect it. This avoids old A→B→A token reuse without an unbounded tombstone table.
- Existing-stroke token = document ID + database incarnation + stroke ID + mutation revision. Unrelated strokes do not fail solely because global content_revision changed. Revision exhaustion rejects before live acceptance.
- Catalog projections carry source incarnation and revision pair. Only a validated current managed-file/authority check may switch incarnation; do not accept a delayed message just because its incarnation differs.
- Snapshot header uses a fresh independent incarnation; source_database_incarnation refers to the captured original. Catalog/foreign-file references remain application-validated, never cross-file SQL FKs.

## Receipt dictionary
| Fields | Contract |
| --- | --- |
| operation_id | UUID PK, stable across outcome lookup; never allocate a new ID to hide Unknown |
| client_session_id, client_sequence | Authenticated admitted session and monotonic positive sequence; not self-declared authorization |
| owner_generation | Authority that admitted command; old generations can be queried, never execute |
| database_incarnation | Instance on which operation committed |
| command_kind | add_stroke, move_stroke, scale_stroke, delete_stroke, undo, redo, rename |
| argument_fingerprint | SHA-256 of validated named semantic arguments, expected target tokens and dependency IDs; length 32, private |
| base_content_revision, base_metadata_revision | Authoritative immediately preceding revision pair in committed sequence, not a stale client's whole-document precondition |
| result_content_revision, result_metadata_revision | rename changes metadata by +1 only; other kinds content +1 only |
| committed_utc_us | Signed epoch microseconds; display/cleanup hint, not authority or ordering proof |

UNIQUE(owner_generation,client_session_id,client_sequence). No unique constraint on result content or metadata alone. All UUID fields length16; digest length32. All revisions nonnegative with checked +1; validate kind-specific transition. Both header changes and receipts commit in one drawing transaction, or neither does. Multiple operations can share one SQL transaction while retaining separate Undo/receipt boundaries.

No-op, rejection, preview, viewport, query and Save-flush outcomes are not persistent receipts. They have bounded in-memory outcomes; after crash an unproven outcome is Unknown. No-op contributes no revision/Undo. Do not infer an earlier no-op from current values and silently execute it again.
Fingerprint recipe proposal: domain-tagged SHA-256 of field names/types/lengths and normalized values in fixed declaration order; integers little-endian, finite f64 bits with -0 normalized to +0, UTF-8 validated, optional tags explicit, arrays ordered. Include command kind/targets/dependencies but not padding, paths or IPC encoding. Same semantic body is immutable per operation ID. This is private comparison, not a transmitted custom protocol. Concrete per-command vectors must accompany generated bindings before code.

## Bounded replay and pruning
Live session tracks contiguous terminal sequence floor plus a 256-slot outstanding window. Retained duplicate with identical identity/body returns its known outcome. Used/retired sequence without proof rejects or returns Unknown, never executes. New future sequence must fit window; gaps do not auto-complete.
Durable receipts count plus reserved unsaved receipts <=4,096 per drawing and logical charge <=8 MiB. Query/ack/recovery retain reserved control capacity. A client acknowledges contiguous terminal sequences only after incorporating outcomes; independent later completion cannot skip an unresolved hole.
Unacknowledged live committed receipts are pinned. Acknowledged or retired-session receipts are eligible oldest-first at pressure; no correctness TTL. Do not reclaim live replay floors while the session still admits commands. Closing/replacing authority retires execution credentials before its outcomes become evictable. Retained old-owner receipt queries verify peer/library/document rights, not old generation's execution right. Missing old receipt is Unknown. Pause mutation admission when pins/reservations exhaust capacity; do not discard accepted work.
These budgets are proposed, not approved/measured. SQLite page/WAL/free-list size is separate from charged logical row bytes.

## Import/export, compatibility and migrations
Portable output is a newly constructed standalone database populated only from current allowlisted artwork, with command_receipts structurally present but empty. Regenerate its incarnation; preserve exported semantic identity/revision convention. Import assigns fresh independent identities and never imports receipt authority. Byte-level canary tests must inspect exported bytes, not only SQL rows. Private recovery backups may include receipts; controlled restore/replacement assigns fresh incarnation and clears obsolete executable receipt context through a reviewed staging transaction, preserving original backup.
First implemented document format can start at user_version=1 containing approved v2 design. No existing released users require a v1→v2 migration. For synthetic pre-amendment fixtures: take verified recovery copy, add incarnation, initialize each existing stroke token to max(1,content_revision), and reject an invalid zero-content-with-strokes fixture without rewriting it; discard old private rename receipts on independent import. In-place conversion of an actual supported older format requires its own reviewed migration, exact version IDs and semantic preservation tests.
No encryption, new color space, metadata timestamp or generic settings payload added.

## Queries and index rationale
Samples composite PK already supports ordered stroke hydration/cascade; no redundant sample index. Stroke UUID UNIQUE supports target lookup; paint_order UNIQUE supports rendering order. Receipt PK supports outcome lookup, session/sequence UNIQUE supports replay audit, time/ID index bounds cleanup scans. Catalog activity_order/document index supports paging; new incarnation is compared with projection authority rather than used as chronology.
Measure row storage, long stroke load/save, receipt overhead and bounded cleanup using the test plan. schema source is not executable SQLite DDL or evidence of query performance.
