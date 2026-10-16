# Database design and visual approval

The owner requested a database specialist with visual entity/relationship handoff on 2026-10-16.
The configured role is database_designer. Configuration exists; runtime discovery is unverified.
This is a design/review responsibility, not a new persistence runtime or implementation owner.
No concrete schema has been designed, approved or implemented by adding this workflow.

## Required review packet

Keep the packet in docs/database/ when S02 produces it. Each version identifies its task,
proposal version, source revision (or explicit uncommitted status), author, alternatives,
open questions and proposed CT/INV/SU/scenario coverage. Use synthetic examples only.

1. Conceptual entity-relationship diagram: readable product concepts, ownership and cardinality.
   Label proposed entities; do not imply features such as layers or persisted history are approved.
2. Physical entity-relationship diagram: SQLite tables, columns, PK/FK/unique keys, cardinality
   and optionality. Distinguish actual foreign keys from conceptual/application-only relations.
   Document delete/update actions, nullability, checks and indexes in the accompanying dictionary.
3. Table dictionary: field meaning, SQLite representation, units, bounds, defaults, identity,
   ordering, constraints, validation owner and representative synthetic rows. Explain data that
   remains only in editor memory, including transient predictions and disposable caches.
4. Sequence diagram: completed edit through queued revision, SQLite transaction, completion and
   saved status. Show transaction/undo separation, thread ownership, stale completion and failure.
5. Tradeoffs and evidence plan: selected per-sample rows (decision 24), read/write workloads, index
   cost, size/performance targets, schema migration/compatibility, durability/journal choice,
   consistent copying, hostile input and native/Wasm feasibility. Unmeasured claims stay hypotheses.
6. Changes to an existing proposal/schema: before/after diagrams, explicit added/removed/changed
   fields/relations, data-loss risks, compatibility, migration atomicity and failure/recovery tests.

## Diagram format and maintenance

On 2026-10-16 the owner selected DBML with dbdiagram for schema design and visual review.
Use DBML schema text and versioned diagram layout for the required owner handoff. The owner now selects dbdocs as the visual review surface. The pinned CLI is installed and
private publication is verified. Mermaid can still describe persistence sequences; use dbdiagram for ERDs.

Proposed review assets are schema.dbml, its companion schema.dbdiagram layout, and review.md
under docs/database/. Track both schema and layout in Git; reference the exact commit (or content
hash for uncommitted proposals) in the approval record. Remote editor changes must return to Git
and receive review; a changing hosted link alone is not an approved version. Record hosted version/URL, source hashes and approval scope. Do not keep local rendered diagram
exports or recreate docs/database/rendered; the owner explicitly declined them.

Use a small overview plus focused views when crowded, with plain-language descriptions and a
legend. Do not rely on color alone. The dictionary covers constraints beyond the visual notation.
The owner reviews the hosted dbdocs diagram alongside DBML source. dbdiagram's CLI syncs/publishes
but does not render locally; its documented local live preview is a VS Code extension, not a
verified Zed integration. Choose an authorized renderer/export workflow before promising local
SVG/HTML output. No custom Zed extension is implied by this selection.

The documented DBML CLI dialects do not list SQLite import/export or direct connection support.
DBML therefore documents the design; do not assume it can generate lossless SQLite migrations.
Document SQLite-specific constraints, indexes and storage settings explicitly, and validate
against actual SQLite schema/migration fixtures once implementation is authorized. No alternative
SQL engine, ORM or bespoke SQL generator is implied to work around that limitation.

Hosted dbdocs is optional: its build command publishes, not merely generates local documentation.
Verify destination, visibility, account/plan and owner authorization before upload. Official pages
currently describe different defaults for dbdiagram (private) and dbdocs (public); do not infer one
service's settings from the other. No credentials, real drawings or personal records in examples.
Paid version history/multiple-view features are optional; Git remains the review history.

During planning, proposed DDL may appear in documentation but is not executable implementation.
Once implementation is authorized, migrations/schema definitions become the executable authority.
Keep diagrams/dictionary synchronized in the same change; compare schema introspection against
those definitions and migration fixtures. Do not create a second handwritten schema model merely
for diagrams. Diagram generation/check tooling is planned, not an installed gate.

## Ownership and approval

Database specialist proposes the schema and visual packet; rust_engine reviews domain mapping,
revision and transaction semantics and owns implementation. UX reviews user-visible draft/save
lifecycle; lead coordinates. rendering_performance reviews measurement plans, build_reliability
owns test reporting, and a fresh reviewer audits consistency and failure/security evidence.

Lead presents the packet to the owner and records explicit approval against its exact version
and any conditions in the decision record. Before approval, do not implement the schema or
migrations. Schema changes affecting meaning, integrity, format compatibility or migration risk
require renewed review. No agent can self-approve. Existing concurrency limits are unchanged.

See [S02](../tasks/S02.md), [format plan](successor/formats.md), [autosave](autosave.md) and
[contracts](contracts.md). App-managed draft retention and naming/publication policy remain open;
the specialist must surface those questions rather than resolve them by choosing tables.

## Evaluated primary sources (2026-10-16)

- [dbdiagram CLI](https://docs.dbdiagram.io/cli/): DBML/layout sync, hosted publication, no local rendering.
- [Diagram views](https://docs.dbdiagram.io/diagram-views/) and [version history](https://docs.dbdiagram.io/version-history/): organization and plan limits.
- [DBML CLI dialects](https://dbml.dbdiagram.io/cli/) and [syntax](https://dbml.dbdiagram.io/docs/): representations and conversion boundaries.
- [dbdocs](https://dbdocs.io/): hosted documentation workflow and stated public default.
- [dbdiagram privacy](https://docs.dbdiagram.io/password-private/): separately stated private default.

The [options evaluation](database-visualization-options.md) is retained as decision context.
DBML/dbdiagram is selected; do not reopen the visualization choice without new evidence or owner
request. SQLite synchronization/check tooling remains to be evaluated when implementation is
authorized; neither tbls nor SchemaCrawler is mandatory. No tool has been trialed in Linefield.

## Selected library storage layout

Decision 22 selects a separate SQLite catalog and one SQLite file per drawing. Present catalog
and document schemas as separate database boundaries in DBML/views; relationships across those
files are application-managed, not assumed SQL foreign keys. Artwork lives only in document
files; thumbnails are disposable. Define metadata authority before choosing duplicate fields.
Show creation/import/delete interruption sequences and reconciliation, including a catalog or
document missing/stale/unavailable. Test that interruption cannot silently lose accepted artwork,
publish incomplete imports or recreate deleted items via stale completions. Separate database
updates are not implicitly atomic. Schema/SQL/durability approval remains pending.

## Selected metadata authority

Decision 23: documents own portable identity/name/content-revision/editing metadata; catalog
copies are indexes, while location/availability is catalog-owned. Label authoritative versus
indexed columns and reconciliation sources in the DBML dictionary. Rename persists document
metadata before updating its index; no competing writable authorities. Define metadata versus
content revision semantics so renaming cannot reorder gallery content-edit recency.

Review interrupted rename, failed document write, failed catalog refresh, stale completion and
rebuild tests, including deletion-in-progress so rebuilding cannot resurrect removed items.
Reconstruction applies only to metadata recoverable from valid managed documents; it cannot
recover arbitrary catalog-only settings or unavailable files. No cross-file atomicity claim.

## Selected sample representation

Decision 24 selects one row per validated actual sample, associated with its stroke and explicit
ordering; stroke-level properties are separate. Show this relationship in DBML and specify
keys/constraints, pressure absence, numeric validation and resource bounds. Do not store transient
predictions or adopt packed sample blocks. Row layout does not imply per-sample disk writes:
completed edits persist asynchronously in reviewed SQLite transactions. Include round-trip,
invalid ordering/association, truncated transaction and large-document measurements. Exact schema
still requires visual owner approval; a binary alternative is not a mandatory prototype.

## Selected transform representation

Decision 25 keeps original samples and stores the current translation/uniform scale separately
from sample rows. Show base width and transform fields in the proposed schema/dictionary; do
not encode a growing operation log. Review numeric constraints, interpretation versions and
transaction/revision consistency. Move/scale must preserve original samples across reopening;
rendered and exported width scales with geometry. Column layout/composition still needs review.

## Selected document migration policy

Decision 26 selects automatic supported lossless upgrades with a consistent pre-upgrade recovery
copy. The schema review packet must specify supported version paths, copy validation, migration
atomicity/publication, crash/retry behavior and bounded retention. No mutation if the prerequisite
copy fails; no partial-success or destructive fallback. Prove artwork preservation with fixtures;
reject unsupported newer required formats without writes. Upgrade staged imports, not external
originals. Catalog schema evolution is separate from this document policy. Recovery copies do
not introduce routine snapshot autosave, persistent history or a custom database journal.

## Selected save durability

Decision 27 requires disk-synchronized commits before acknowledging Saved. Propose the exact
SQLite journal/synchronous/VFS policy, effective-setting checks and failure semantics in the
review packet. Do not silently weaken settings for throughput. Show current versus durable
revision and late worker completions in the persistence sequence. Decision 28 selects macOS WAL;
all disk work is off input callbacks. Record evidence limitations for crash versus power-loss
claims and storage devices that may misreport synchronization.

## Selected macOS journaling

Decision 28 selects WAL for the local macOS catalog and each drawing, with decision 27 durable
commit acknowledgements. Show checkpoint and sidecar lifecycle separately from save revisions.
Review effective settings, bounded growth/reader lifetime, worker ownership and failure paths;
no per-sample writes or UI-thread checkpointing. Provide consistent standalone export/recovery
snapshots and crash/reopen tests. No cross-file atomicity or direct cloud-copy assumption.
Future platform adapters must separately validate WAL/storage support; no universal VFS selected.

## Rust access and browser feasibility

Decision 29 selects rusqlite for the native storage backend. Upstream currently documents a
wasm32-unknown-unknown backend through sqlite-wasm-rs; this is not Linefield execution evidence.
Evaluate a browser VFS/worker before freezing storage assumptions. Keep schema, SQL where
portable, semantic validation and persistence policy shared; platform adapters own storage
mechanisms, initialization and capability reporting. No main-thread browser disk emulation or
unbounded per-sample cross-worker requests. No silent durability downgrade.

Sources checked 2026-10-16:
- [rusqlite](https://github.com/rusqlite/rusqlite): ffi-sqlite-wasm-rs backend feature.
- [sqlite-wasm-rs](https://github.com/Spxg/sqlite-wasm-rs): default memory VFS, optional OPFS
  support through sqlite-wasm-vfs, and documented no-multithreading constraint. Inspect the
  exact selected versions; keep any proposed instance confined to its worker.
- [SQLite browser persistence](https://sqlite.org/wasm/doc/trunk/persistence.md): OPFS adapter
  and locking/header tradeoffs; official SQLite-Wasm WAL restrictions do not establish behavior
  of every third-party VFS. Verify the chosen adapter rather than copying native WAL policy.
- [Browser storage limits](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria):
  quota, eviction and private-mode constraints need explicit UX/failure tests.

No browser adapter is selected or implemented. Review its guarantees and native/browser
snapshot/migration conformance before claiming interchangeable storage or power-loss durability.

## Selected upgrade-copy retention

Decision 40 selects latest pre-upgrade copy per drawing in steady state. Before retiring older
protection, validate the replacement copy and upgraded document. Model temporary old/new/staged
states explicitly; failure retains needed recovery material. Review bounded admission, identity/
version tags, validation, publication and retryable cleanup, including permanent library deletion.
No space means no upgrade, not deletion of the only existing protection to make room. Test each
interruption boundary; never treat staging-count excess as permission for unsafe cleanup.

## Selected identifiers

Decision 42 selects UUIDv4 portable document/stroke IDs alongside local integer SQLite keys.
In DBML/dictionary distinguish public identity, database-local key and order fields. Sample
rows reference local stroke keys plus ordered indices, without per-sample UUIDs. Catalog links
to document UUID are conceptual/application-managed across files. Do not leak local row numbers
into durable command/external identities; remapping must preserve association correctness.

Review uniqueness/non-null/length/version checks, safe native/Wasm representation, randomness
and collision failure and reference enforcement before schema approval. Decision 43 assigns new
document/stroke UUIDs on independent import; validate complete staged reference remapping.
A document singleton need not acquire a redundant local identity simply for uniformity. No
AUTOINCREMENT/gapless promise is implied; local-key reuse must not make stale references valid.
Show tests for UUID mapping, duplicate rejection, row remapping and explicit ordering.

## Selected display-name uniqueness

Decision 44 allows duplicate document display names. Do not impose a UNIQUE name constraint in
the catalog or document schema, use names as storage identity, or infer merges from names.
Document-first metadata authority remains selected; lookup/mutation mapping uses stable IDs.
Review name validation/default/empty handling separately. Test duplicate labels across rename,
import and catalog rebuild, including identity-specific delete and independent source files.

## Selected default drawing names

Decision 45 selects automatic numbered labels for new drawings, without imposing UNIQUE on
names. Persist the assigned name in document-authoritative metadata; catalog remains its index.
Review number allocation/reuse, scope, counter storage/rebuild, failed creation/retry and matching
user/imported names before adding schema fields. The number is neither UUID nor ordering key.
No automatic renumbering of existing items; import preserves names. No gapless guarantee.

## Selected default-name sequence policy

Decision 46 resolves gap reuse: default-name numbers keep increasing through ordinary creation,
rename, deletion and restart. Do not derive the next value solely from surviving display names.
Review sequence scope, durable allocation/retries, failed create/publication, catalog recovery
and overflow before schema implementation. Distinguish local sequence metadata from portable
identity and document-authoritative names. No UNIQUE name constraint or gapless guarantee.
A rebuilt catalog cannot be assumed to recover deleted historical allocations from live names;
show that limitation and the proposed recovery contract in the visual schema review.

First-name clarification: the first default label is Untitled, followed by Untitled 2,
Untitled 3, etc. Suffix omission is presentation of the first allocation, not a second sequence
or a change to identity, duplicate-name permission or no-gap-reuse policy.

## Selected stroke appearance ownership

Decision 47 selects per-stroke color/base width/approved pen properties, without a shared style
table. Keep ordered sample rows and separate transforms under the existing decisions. Specify
explicit validated property fields/types and color encoding in the DBML/dictionary; do not store
Skia/native objects or introduce a custom property blob implicitly. Uniform scale changes the
transform, not original samples/base width. Review schema/version compatibility and round-trip
fixtures. Shared resource-backed brushes remain future scope, not initial schema requirements.

## Selected initial artwork color space

Decision 48 selects sRGB initially. Show explicit document color-space semantics and validated
per-stroke color fields in the DBML/dictionary; channel representation/precision remains reviewed.
Do not store native picker/Skia objects or infer color space from the display. Document possible
future color-space extensions with version/migration and old-artwork preservation requirements,
without adding speculative profile tables or wide-gamut implementation now.

## Device-local viewport metadata

Decision 57 selects per-drawing local view position/zoom, keyed by library document identity.
Include its ownership and lifecycle in the catalog schema proposal, separate from authoritative
portable document metadata. It is not copied into native exports or inferred from content edit
recency. Review finite bounds, asynchronous coalesced writes, stale-result rejection, deletion
cleanup and rebuild/failure fallback. Do not claim local view history can be reconstructed from
artwork. Missing/invalid view falls back safely without preventing valid document opening.

## Device-local per-drawing pen preferences

Decision 58 selects current pen color/width per local drawing identity. Include these in the local
metadata proposal separately from portable per-stroke properties and content revisions/recency.
Define validated fields/defaults, bounded writes, stale-session rejection, deletion/rebuild/failure
behavior. Preference writes cannot change artwork Saved status; exported documents exclude these
local preferences. Independent imports use their new identity and reviewed defaults, not inferred
settings from stroke data. No preference synchronization or active-tool restoration is selected.

## Extensibility correction to per-drawing preferences

Decision 59 requires settings for each future approved tool, not only pen-specific color/width
columns as the universal abstraction. Key logical ownership by drawing and stable tool identity;
propose concrete relational fields/tables/versioning in the DBML review. Typed defaults,
validation, unknown settings, migration, bounds and isolation require explicit contracts.
Extensibility does not select JSON/BLOB, EAV or generic dynamic schema storage. Begin with approved
pen settings only. Keep preference data out of portable artwork and never rely on it to reproduce
saved marks; each operation records the document properties it requires.

## Device-local active tool

Decision 61 adds active tool identity to the reviewed per-drawing local metadata proposal.
Keep it separate from individual tool-settings records and portable artwork; changing active tool
must not overwrite other tool preferences. Review validation/availability/fallback, coalesced
writes, stale-session rejection and rebuild/failure handling. Initial editor fallback is Pen;
no stroke selection/gesture/history is restored. Future viewer capability constraints take priority.

## Gallery thumbnail framing

Decision 62 selects fit-all-artwork thumbnails, independent of local view preferences. Keep
previews disposable and keyed to reviewed content/render versions; do not make pan/zoom a framing
input. Review bounded cache metadata/lifecycle and stale/delete handling separately from portable
artwork. Exact source revision/generation policy remains S02 work. Missing/corrupt previews are
not document corruption and must not block opening otherwise valid artwork.

## Selected tool-settings representation

Decision 68 selects explicit named fields in tool-specific relational tables for local settings.
Start with approved pen preferences; add future approved tools through reviewed schema migrations.
Avoid one wide optional-field table or JSON/BLOB/EAV preference payloads. Show keys/relationships,
SQL constraints, Rust validation and migration/default handling in DBML/dictionary; avoid redundant
IDs. Active-tool selection and viewport remain separate concepts, and portable artwork never
requires these local tables to render. Exact schema/STRICT mode/types are still review items.

## Tool registry and UUID representation (decision 71)

Keep tools with stable 16-byte UUID and locale-independent readable key, referenced by explicit
per-tool relational preference tables where needed. No tool_versions table, tool-version FK or
per-tool settings version. Decisions 69-70 are superseded. Use the top-level drawing format version
for artwork interpretation, and the catalog's own top-level schema version for local migrations.
Neither native exports nor rendering may depend on catalog preferences.

Document, stroke and tool UUIDs use standard 16-byte SQLite BLOB values. Review exact length/type/
UUID validation, byte order and native/Wasm conversion in DBML/dictionary. Instance UUIDv4 and
fixed built-in tool identity policies remain distinct. Retain local integer relationship keys
and ordered sample indices, without UUID per sample or generic universal identity table.

Show exact keys/constraints, seeded tool IDs, migrations and unknown-tool handling for owner visual
review. Do not silently reinterpret old artwork under new tools; apply top-level format rules.
Same-database foreign keys do not cross catalog/drawing files. Load validated settings into memory;
no SQL per pen sample. Native localized labels remain separate from stable tool identity.

## Selected SQLite type enforcement

Decision 72 selects STRICT tables for owned catalog/drawing schemas. Use supported physical type
names and explicit NOT NULL/CHECK/UNIQUE/foreign-key constraints; do not substitute ANY for proper
types. STRICT permits lossless coercion and does not enforce UUID length, numeric domain limits
or business semantics by itself. Document physical STRICT declarations alongside DBML if its
notation cannot express them; migration DDL is executable authority after approval.

Require compatible SQLite >=3.37 and actual runtime/table checks, including future Wasm adapters.
No silent flexible-schema fallback. Test wrong types, valid conversions, domain/relationship
violations, migration and incompatible runtimes. Concrete fields/constraints remain owner review.

## Automatic catalog recovery (decision 82)

Missing or confirmed-corrupt catalog triggers automatic reconstruction from validated published
drawings within the managed library. Preserve the damaged catalog/relevant recoverable sidecars,
leave invalid/unsupported drawing files untouched and report unresolved items. Recovered metadata
comes from drawings; local preferences may fall back to defaults. Notify after recovery.

The DBML/lifecycle packet must define staged publication, interruption/retry and failure behavior,
source preservation, bounded work, duplicate identities and eligibility of files. Never confuse
staging/backup/deletion remnants with live drawings, nor permissions/locking/newer-version errors
with corruption. Exact reconciliation/retention and numbering recovery remain review items;
automatic recovery is not approval for destructive salvage or new per-file identity assignment.

## Unavailable drawing entries (decision 83)

A healthy catalog retains identity/known metadata when its drawing file is missing or unopenable.
Represent availability separately from document content and expose typed failure reasons plus
retry. Do not drop the catalog row or create a blank drawing on failed open. Distinguish absence,
access failure, invalid content and unsupported format. Review persistence of availability versus
fresh validation in S02; stale retries must not overwrite deleted/replaced identities. Document
last-known metadata honestly. Automatic catalog rebuild follows decision 82, not every read failure.

## Recovery identity conflicts (decision 84)

Distinct eligible drawing files sharing a document ID remain preserved and unresolved; recover
unrelated drawings normally. Never choose by timestamp/scan order, merge, reassign IDs or treat
the candidates as interchangeable. Same-name/different-ID drawings are valid independent items.
Review candidate references, collision discovery before publication and stable conflict reporting
in S02. No conflict-resolution schema/UI implementation is authorized by this policy; imported
independent copies follow the separate explicit import contract.

## Resuming confirmed deletion (decision 85)

A valid durable deletion intent permits automatic completion after restart without reconfirmation.
Persist intent identifying the confirmed operation/target before destructive work. Review its exact
representation, target validation, in-flight write fencing, catalog/file/sidecar phases, idempotent
retry and completion cleanup in S02. Missing files/catalog corruption are not deletion authority.
Rebuild must not resurrect deletion remnants. No new journal/schema is approved by policy alone;
show failure cases where intent is missing, unreadable or ambiguous without guessing a target.

## Batch 1 selected storage policies (decisions 86-90 and 94)

Ordinary autosave updates affected rows transactionally, with exact revision/change tracking and
rollback tests. Stroke deletion uses verified same-database foreign-key cascade for owned samples;
Rust retains editing/Undo authority. Derived stroke bounds are not persisted initially: calculate
and retain only bounded disposable in-memory values. Concrete DDL/indices/transaction sequences
remain for schema review; test incremental persistence versus a reference model and reopen.

Temporary save failures receive bounded delayed automatic retries plus manual Retry; nontransient
failures are distinct. Thumbnail cache entries identify a durably saved source revision and may
lag while replacement is generated; never cache newer unsaved artwork as the gallery preview.
Shared format validity is independent of host capacity. Preserve valid but oversized files and
report capacity failures separately from corruption; specify bounded admission in S02.

## Color precision and transform order (decisions 106/108)

Canonical saved sRGB channels use normalized floating-point values. DBML/schema must specify
actual numeric representation, finite/range/alpha constraints and conversion/round-trip tests;
no incidental channel quantization, new color space or per-tool version. Keep PNG pixel encoding
separate. Moving/scaling updates transforms without changing document stroke order; test SQL
incremental persistence/Undo/reopen retains overlap order and precise stored color values.

## Batch 5 library lifecycle choices (decisions 116-119)

Support separate processes editing different drawings with explicit document ownership and shared
catalog coordination. Review locks/owner identity/revision fencing, cross-process invalidation,
crash recovery, maintenance and delete races before implementation. Do not assume a SQLite
transaction lock establishes the full lifetime of an editor's write ownership.

Proactively migrate eligible older drawings after updates in bounded coordinated work, preserving
validated recovery copies and lossless/failure-isolated paths. Background enumeration is distinct
from eager gallery materialization. Review busy-doc scheduling and maintenance leadership separately.
A validated recovery copy may be restored explicitly as an independent drawing with fresh IDs;
preserve the damaged original and explain possibly missing newer edits. No destructive salvage.

Import completes from a coherent captured external revision even if the source later changes.
Review snapshot acquisition/provider guarantees, bounded staging and safe publication; never mix
source revisions or write through to the original. Tests must use real process races where applicable.

## Durable export jobs (decisions 121-126)

Exports capture immutable completed artwork on command acceptance before the destination panel;
source retention counts against reservations. Job intent and source data are persisted for crash
recovery. Propose exact job schema/location and snapshot representation in DBML/S02 before code:
no incidental custom codec, mutable document dependency or unreviewed job protocol. Define durable
admission/publication/completion boundaries, corruption/version checks, quotas, access-reference
privacy, crash cleanup and multi-process claims/fencing.

Same-destination jobs may coexist but publication must be serialized with valid replacement consent;
unknown publication outcomes must not be blindly replayed. Continue independent safe jobs after
one failure. Jobs outlive editor navigation; source deletion semantics remain unselected. The
count cap is three accepted active/waiting/reserved jobs plus byte/work bounds; library/process
scope and recovery admission are separately pending, not an implicit three-per-process multiplier.

## Batch 8 approved durable-export policies (decisions 132-138)

Use a separate SQLite job database and dedicated immutable snapshot area; exact DBML/source
representation still needs review. Accepted Export captures before its panel in bounded memory;
persist after destination confirmation, with an honest preparing/durable boundary. Automatically
resume only validated safe recovered work; pause uncertain publication/access and changed targets.
Changed destinations need renewed consent or another destination. Release terminal job-only
snapshots after safe durable reconciliation, retaining bounded outcomes and live references;
exact-source retry is unavailable after release. Source deletion explicitly confirms canceling
outstanding exports and coordinates safe cancellation before deletion; published files survive.

The count cap is three accepted active/waiting/reserved jobs PER PROCESS (Q54 B), alongside shared
resource protections. No global count/byte budget or new worker topology is chosen. Specify abandoned
job claims/reassignment, recovered admission, cross-database deletion/job lifecycle and idempotent
cleanup before code. Do not drop durable jobs, blindly retry uncertain overwrites or bypass consent.
Q44 maintenance ownership and batch 9 naming remain pending. Policies are not implementation.

Decisions 139-143: include single maintenance ownership/progress, shared default-name allocation
and honest import-arrival ordering in the concrete schema/state-transition proposal. Recovery must
not reconstruct a lost naming high-water mark merely from surviving labels or rewrite source edit
timestamps. Coordinated rename is applied by the drawing owner with durable metadata confirmation;
catalog notifications alone are not mutation requests. Review conflicting requests and ambiguous
completion before implementing fields/transport; Unicode name validation remains shared policy.

## Local storage and future cloud (decision 144)

The preview has a fixed app-managed local library. Preserve a future cloud adapter boundary around
local services, provider-independent identity and coherent snapshots/change queries. Keep offline
editing/local durable save independent of network work; future remote status is separate. Do not
share live SQLite/WAL files across devices, treat process locks/local revision counters as distributed
coordination or reuse import's identity regeneration for sync replicas. Future schema/protocol review
must cover concurrent edits, deletions, retries, remote versions, authentication and encryption/key
recovery. No cloud SDK/provider/CRDT/trust model or implementation is selected. Q60 stays pending.

Decision 146: no application-level encryption for initial preview; retain standard SQLite/rusqlite.
Previously discussed SQLCipher/key hierarchy is an unselected option, not an implementation task.
Review privacy/access/copy handling under this actual scope. Future cloud security stays separate.
