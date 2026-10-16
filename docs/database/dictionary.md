Current proposal: [S02 consolidated v2](../reviews/S02-consolidated-v2.md). This older draft is historical where v2 differs; its pending-choice notes must not reopen decisions through 180. No implementation approval is implied.

# S02 schema proposal v1: field dictionary

Documentation only; uncommitted draft, no parser/migration/runtime validation. DBML files represent separate database boundaries. The displayed table structure is now owner-approved; remaining constraints/coordination need review. See ../reviews/S02-table-structure-approval-2026-10-16.md. No new fourth database is silently selected.

## Common representations

- IDs ending _id are 16-byte canonical UUID BLOBs except explicitly identified native target/access fields. Drawing/stroke IDs use UUIDv4; tool IDs are seeded constants. Request/job/instance/snapshot/managed-file/library IDs are opaque UUID identities; they are not filesystem paths, authorization or evidence of liveness.
- Keys ending _key are positive local INTEGER relationship keys, never portable identities. They may change on import/rebuild; no never-reused guarantee. Decision42 requires stroke local key plus UUID; samples have no UUID.
- Revision and catalog/claim generation counters are nonnegative INTEGER counters <= 9223372036854775807, never wall-clock timestamps. Overflow rejects before mutation. Different kinds cannot substitute for each other. Owner generation is instead a fresh 16-byte UUID, not a counter; its receipt field is not authority to acquire ownership.
- *_utc_us is signed INTEGER microseconds since Unix epoch for display/history/ordering only, never process liveness or deadline evidence. Monotonic runtime clocks govern scheduling. Imported timestamps remain actual source values; no fabricating source edits.
- REAL geometry is finite f64 in logical canvas units. RGBA are finite unpremultiplied sRGB channels 0..1. Pressure NULL is unavailable and 0 is a real measurement; normalized pressure 0..1. Exact width/coordinate/scale/zoom/name/row budgets must be fixed by S02 before implementation.
- TEXT state values are finite enumerations checked by SQL; names are Unicode user data, not locators or log metadata. Shared Rust applies deterministic outer-whitespace trimming and approved name limits.
- Every field is NOT NULL unless DBML explicitly omits it. No unreviewed defaults. Creation constructs and validates every required value explicitly.

## Drawing database

| Table / fields | Meaning and authority |
|---|---|
| document.singleton | Only value 1; application requires exactly one header, SQL PK/CHECK alone allows zero rows. |
| document.document_id | Portable drawing identity; regenerated on independent import. |
| document.display_name | Portable authoritative name; duplicate names across drawings allowed. |
| document.content_revision | Durable completed-artwork revision, incremented by editing/Undo/Redo, not rename/preferences. |
| document.metadata_revision | Durable portable-metadata revision; rename increments it without content recency. |
| document.created_utc_us / content_edited_utc_us | Portable creation and accepted content-edit timestamps; save completion is not an edit. |
| document.color_space | Fixed srgb in first format; later spaces need reviewed format migration. |
| tools.tool_key / tool_id / name_key | Local lookup key, stable tool UUID, stable readable machine key; no per-tool version or localized name. |
| strokes.stroke_key / stroke_id | Local PK and portable unique stroke UUID. Both drawing and stroke UUIDs regenerated on independent import. |
| strokes.tool_key | Restricting FK to drawing.tools; document renders without external catalog lookup. Initial accepted tool is Pen. |
| strokes.paint_order | Unique nonnegative bottom-to-top order. Move/scale preserve it; gaps allowed, no timestamp ordering. |
| strokes.base_width / red / green / blue / alpha | Each stroke owns its approved pen properties, independent of current device preferences. Width is maximum untransformed width. |
| strokes.translation_x / translation_y / uniform_scale | Appearance mapping world = original * positive uniform_scale + translation. Applies to width as well. Samples never rewritten for transforms. |
| samples.stroke_key / sample_index | Local FK and contiguous zero-based actual-sample order; composite PK. |
| samples.x / y / pressure | Original accepted sample coordinates and normalized pressure/presence. No predictions, tilt, device identifiers or raw event logs. |
| rename_receipts.request_id | Private immutable dedup key for a successfully committed rename; not portable document metadata. |
| rename_receipts.owner_generation | Generation under which request was accepted. Old generation with no retained receipt is unknown/rejected, not replayed. |
| rename_receipts.argument_fingerprint | SHA256 of canonical validated name UTF-8 bytes. Also compare expected revision and owner generation; same request with different arguments rejects. Sensitive low-entropy name hash is never logged or exported. |
| rename_receipts.expected_metadata_revision / resulting_metadata_revision | Original precondition and successful resulting revision; latter equals former +1. Both recorded atomically with name update. |
| rename_receipts.committed_utc_us | Diagnostic/retention hint only, not proof of durability or liveness. |

Receipt retention is bounded by reviewed count/age policy, with no pruning of pending acknowledged-outcome obligations. Missing older receipts return unknown/conflict without reapplication. Define a fixed request-admission lifetime/generation rule so receipt pruning cannot make an old request look new. Successful receipts are written in the same drawing transaction as the metadata. Do not cache failures as success.

Portable exports are newly constructed databases containing only allowlisted current drawing rows. Never use backup plus DELETE to scrub private receipts: free pages can retain bytes. Internal recovery copies are private and may use consistent backup. Add raw-byte canary tests.

## Catalog database

| Table / fields | Meaning and authority |
|---|---|
| library.singleton / library_id | Exactly one local managed-library identity. Not a future cloud account or distribution identity. |
| library.catalog_incarnation | Fresh 16-byte UUID on catalog rebuild/replacement; queries/cursors/completions bind this plus generation. Never infer incarnation from library ID. |
| library.catalog_generation | Projection/query change generation for bounded gallery resynchronization; not drawing content or owner generation. |
| library.automatic_name_highwater | Highest allocated default-name number; first allocation 1 means Untitled, then Untitled 2. Never decreases after rename/deletion. Gaps allowed. |
| library.activity_highwater | Persistent signed-64-bit local activity allocator. Allocate/increment with the gallery projection in one catalog transaction across processes; never decrement on deletion or substitute wall-clock time. Exact retry/admission/recovery protocol remains a pre-code contract gate. |
| library.sequence_recovery_state | known or unavailable; unknown highwater blocks automatic name allocation until reviewed recovery. |
| tools.* | Device catalog's own stable tool lookup; no FK into drawing files. |
| drawings.drawing_key / document_id | Local gallery key and logical portable identity. Different-ID same-name drawings allowed. Duplicate-ID candidates are quarantined/reported, never scan-order winners. |
| drawings.managed_file_id | App-controlled locator identity resolved beneath library root; display name cannot redirect it. |
| drawings.display_name / content_revision / metadata_revision / created_utc_us / content_edited_utc_us | Cached portable authoritative fields; document wins after validated reconciliation. |
| drawings.added_utc_us | Local arrival timestamp. Native import preserves source timestamps yet enters at top under reviewed ordering. |
| drawings.activity_order | Owner-selected persistent activity ordinal, sorted descending with document UUID tie-breaker. Preserve timestamps separately; rename/preferences do not become content activity. Counter ordering does not recover chronology lost with the catalog. |
| drawings.availability | available, missing, inaccessible, invalid, unsupported, conflict; unavailable item retained with identity/last-known metadata. |
| local_view.drawing_key / preference_revision | Device-local per-drawing preference row and ordered update revision. Stale session writes reject. |
| local_view.center_x / center_y / zoom / active_tool_key | Restorable viewport and active tool. Invalid/missing data falls back without rejecting valid artwork; viewer capabilities override editing tools. |
| pen_preferences.drawing_key / tool_key / preference_revision | Per-drawing/tool typed settings row; tool key must denote Pen in initial schema. |
| pen_preferences.width / red / green / blue / alpha | Local current pen settings, not saved stroke style or artwork revision/history/recency. |
| lifecycle.operation_id / document_id / managed_file_id | App lifecycle operation identity and exact target. Deliberately no FK to drawings: records may predate or outlive gallery row. |
| lifecycle.operation_kind / phase | create/import/delete/upgrade and reviewed finite lifecycle phase. Never arbitrary script or SQL. |
| lifecycle.expected_content_revision / expected_metadata_revision | Optional version preconditions, required when that operation claims a concrete existing drawing. |
| lifecycle.automatic_name_number | Optional allocated number associated with create reservation; not parsed back from display name. |
| lifecycle.confirmed_utc_us | Explicit destructive consent recorded for delete, NULL before confirmation. Timestamp alone is not complete consent: operation identity and target/revision bindings remain required. |
| lifecycle.updated_utc_us | Retention/diagnostic hint only. Not stale-owner takeover authority. |

Owner-selected DB1-A: retain three databases with conservative recovery. Catalog reconstruction cannot recover historical name highwater or lost confirmed-delete intents. Restore trustworthy authority when available; otherwise preserve uncertain files and block operations requiring lost authority. No fourth database is selected, and degraded operation can remain necessary without usable recovery information. Never compute highwater from surviving Untitled labels, silently delete unknown remnants, or resurrect known tombstones. Lifecycle tombstones remain after gallery removal until safe retention/reconciliation conditions are proven.

## Export-job database

| Table / fields | Meaning and authority |
|---|---|
| snapshots.snapshot_id / managed_file_id | Immutable captured-source identity and private storage locator. File reuses standalone drawing schema, not custom codec. |
| snapshots.document_id / content_revision / metadata_revision | Logical captured source identity/revisions; no FK to catalog/drawing database. May contain accepted completed edits not yet autosaved. |
| snapshots.byte_length / digest_sha256 | Exact validated standalone byte size and SHA256 integrity digest. Digest does not authenticate hostile files. |
| snapshots.state | staged, ready, release_pending; state drives crash cleanup, never inferred solely from file presence. |
| destinations.destination_id | Internal access/consent record identity, not path. |
| destinations.access_kind / access_reference | Reviewed native capability type and bounded persisted access reference (e.g. macOS security-scoped bookmark). Revocation/staleness pauses job; no access grant from a raw name. |
| destinations.target_identity | Last observed exact native destination identity; NULL for nonexistent target. |
| destinations.destination_serialization_key | Reviewed normalized parent/entry identity for same-destination serialization, including aliases and not-yet-created targets. Encoding/canonicalization remains platform contract. |
| export_jobs.job_id / source_document_id | Job identity and logical original source needed for source-delete coordination even after snapshot cleanup. |
| export_jobs.snapshot_id / destination_id | References required for actionable work; NULL only in terminal outcomes after safe cleanup, never missing live source/access silently accepted. |
| export_jobs.format / state | native or png; finite lifecycle states defined in constraints. |
| export_jobs.admission_instance_id | Process instance charged for original admission. Three-job cap includes pre-durable reservations in memory, so SQL row count alone is insufficient. |
| export_jobs.claim_instance_id / claim_generation | Current work claimant and fencing generation. Active claim requires verified ownership mechanism; abandoned claim detection cannot rely on elapsed time alone. |
| export_jobs.accepted_utc_us | User command acceptance time, not later panel confirmation/capture time. |
| export_jobs.publication_phase | Exact prepublication/publishing/verified/uncertain phase; uncertain cannot be blindly retried. |
| export_jobs.approved_target_identity | Exact replacement-consent target binding; changed target pauses. NULL represents approved creation of absent target, not overwrite-anything consent. |
| export_jobs.outcome_code | Allowlisted terminal/failure classification; never raw path/error/document content. |

Acceptance captures immutable completed state before the panel, under bounded memory reservation. Durable row admission follows confirmation and validated durable snapshot. Job state never claims pre-panel memory survived restart. Same-target jobs serialize; no source FK cascade can delete independently published exports. Recovered work obtains reviewed admission/claims and shared byte budgets; new process must not run all recovered jobs beyond its cap.

## Identity and color representation clarification

The selected hybrid uses INTEGER relationship keys and 16-byte UUID BLOB identities (decision 71).
BLOB is SQLite's byte-string type: a UUID is 128 bits and cannot fit one signed 64-bit INTEGER.
Text UUID display is useful for review, but its usual 36-character formatting is not its storage.
Specify canonical byte order and test Windows/native conversions; IDs do not confer authority.
[SQLite types](https://www.sqlite.org/datatype3.html).

pen_preferences RGBA and per-stroke RGBA are canonical sRGB values, not RGB-picker layout.
HSB/HSV and future OKLCH inputs use explicit conversion, not duplicate authoritative columns.
Future P3 support needs reviewed format and preference color-space semantics. See
[color representations](../design/color-representations.md). No schema fields change here.

## Why no universal updated_at?

created_utc_us records creation; content_edited_utc_us records artwork changes. Rename uses
metadata_revision, while local preferences use preference_revision and lifecycle work has
updated_utc_us. The drawing header currently has no general metadata-edit timestamp.
Do not add timestamps to every sample/lookup row or use wall-clock ordering for stale-save checks.
Recommended future proposal if modification-date UI or sync needs it: metadata_edited_utc_us,
updated atomically with metadata_revision and projected into the catalog. Define initial value,
import preservation and clock rollback behavior before schema approval. This field is NOT added
or approved here. Rename must not change content recency. A combined display date, if wanted,
needs its own defined semantics; timestamps alone never solve future cloud conflicts.

