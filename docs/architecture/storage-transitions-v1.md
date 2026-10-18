Current proposal: [S02 consolidated v2](../reviews/S02-consolidated-v2.md). This older draft is historical where v2 differs; its pending-choice notes must not reopen decisions through 180. No implementation approval is implied.

# Storage and recovery transitions — proposal v1

Status: documentation proposal, CT-05; all runtime tests pending. Use SQLite transaction/journal
recovery instead of inventing an application WAL. Application lifecycle records cover transitions
that SQLite cannot make atomic across files, databases, native consent and filesystem publication.

## DB9-A selected version identity (decision 167)

Persisted drawing identity combines stable document ID, database incarnation and scoped content/metadata revisions. Ordinary edits advance relevant counters; controlled replacement/restoration assigns a fresh incarnation. Coordinator restart alone does not change it. Existing restore-as-independent-import semantics still create a fresh document ID. The incarnation is not an ownership generation or schema version.

Check incarnation and expected durable revisions within the write transaction; rejection changes nothing. Check acknowledgement identity before advancing saved state. Replacement must coordinate active clients and storage ownership; a token alone cannot fence arbitrary file swaps or external writers. Exact encoding/schema amendments, import/export treatment and lifecycle fencing remain concrete review items. The current schema source/hosted diagram does not yet include this amendment.

## Revision ownership

| Value | Changes when | Purpose |
| --- | --- | --- |
| database incarnation | Controlled creation/replacement/restoration; not ordinary edits or coordinator restart | Reject work tied to an obsolete database instance |
| content_revision | Completed artwork command, including Undo/Redo | Save/render content identity |
| metadata_revision | Portable name/metadata change | Rename conflict and durable metadata |
| catalog incarnation UUID | Catalog rebuilt/replaced | Invalidate every stale page/completion, including other processes |
| catalog_generation | Catalog projection/local-state transaction | Paged query invalidation |
| preference_revision | Local view/tool preference change | Stale preference-write rejection |
| owner generation | New lifetime lock owner | Fence old sessions/work |
| UI revision | Accepted observable session state change | Coherent native summaries |

A save work item captures document/incarnation identity and base and target content/metadata revision pairs. The storage service
serializes writes for that drawing and checks expected durable base inside the transaction.
Apply the captured incremental changes, then record target revisions atomically. Do not let a
rename-only write roll back newer artwork or an older snapshot overwrite newer metadata.

Only a matching durable acknowledgement advances the corresponding saved revision. Live newer
state remains pending. Rename does not increment content recency. Preference/thumbnail failures
do not turn successfully persisted artwork into unsaved content.

## Transitions and interruption handling

| Operation | Durable stages | Restart/error rule |
| --- | --- | --- |
| Create | Reserve UUID/ordinal → Rust formats default name using captured launch language → validated staging → publish managed file → catalog projection | Idempotent operation ID; abandoned ordinal gap permitted; never show incomplete drawing |
| Import | Coherent bounded capture → validate → new drawing/stroke IDs → same publication stages | Source unchanged; do not mix file revisions or reuse source identities |
| Autosave | Accepted completed edit → queued → transaction → durable revision → main-thread acknowledgment | WAL recovers committed work; uncommitted RAM work is never claimed saved |
| Rename | Drawing metadata + receipt committed → catalog projection → reply | Repair projection; lost reply queries receipt, never blindly re-executes |
| Upgrade | Eligible ownership → coherent verified recovery copy → transactional migration → validation | Busy skips; unsupported/denied is not corruption; preserve old copy on failure |
| Restore | Validate recovery copy → independent import with new IDs | Preserve original and disclose possible missing newer edits |
| Delete | Confirm exact target/export dependencies → durable intent → settle/cancel work → remove exact files → finalize | Resume only verified confirmed intent; no destructive guessing from missing files |
| Export | Captured completed source → panel → snapshot + intent durable → claimed → stage → publish → terminal → cleanup | Unsafe/unknown publication pauses; destination changes require renewed consent |
| Maintenance | Singleton lock → bounded claim/checkpoint per unowned drawing | Real lock release permits takeover; no timeout-based stealing |

Create/delete lifecycle rows are not FK-dependent on a gallery row. The original identity,
operation and managed locator remain until reconciliation is safe. A valid deletion intent survives
gallery-row removal; a missing intent is not consent. DB1-A selects conservative recovery after catalog loss: preserve uncertain files, restore only trustworthy authority and block dependent operations when authority is unavailable. No fourth database.

## Publication and copies

Portable exports require a newly constructed database containing only allowlisted current document rows from an immutable captured engine snapshot. Never use backup plus DELETE to scrub service metadata: freed pages can retain private bytes. Private internal recovery copies may use consistent SQLite backup. Close/validate the standalone destination. Never copy only an active main database while its
WAL may contain committed data. Captured exports can include accepted completed edits that have
not yet reached the source drawing's durable revision; unfinished interactions are excluded.
Export snapshots use the same reviewed drawing schema, without local receipts, rather than a new codec. Test raw exported bytes for private canaries, not only visible rows.
[SQLite backup API](https://www.sqlite.org/backup.html).

Filesystem publication must verify exact managed parent/target identity, avoid symlink/path swaps,
use same-filesystem staging where needed, and establish durability of file and directory changes
through the chosen platform adapter. Atomic rename is not a blanket durability or cross-volume guarantee.
Record each phase before recovery can act; test crashes on both sides of every boundary.

Cross-file relations use stable IDs and reconciliation. Even attached WAL databases do not provide
a single atomic commit across all database files. Do not describe catalog + drawing + job updates
as one transaction. [SQLite WAL limitations](https://www.sqlite.org/wal.html).

## Jobs and deletion

Before destination confirmation, captured source counts against the selected three jobs per process.
After confirmation, persist immutable snapshot and durable job reference; distinguish Preparing from
Durable. Recovery claims consume the same process admission budget. Shared byte/work limits remain
an explicit pre-code review item, so multiple processes cannot multiply memory/disk use without bound.

Hold the short library mutation coordinator when admitting a job reference or recording deletion
intent. Never keep it during panel display or rendering. A confirmed delete marks the source
deleting before settling/canceling all dependent jobs under approved consent. New jobs reject.
Already published external outputs survive. Interrupted/cancel-requested is not automatically terminal.

Destination serialization, target identity and consent are rechecked immediately before publication.
A lost publication acknowledgment produces UnknownPublication and blocks blind retry. Release job-only
snapshots only after terminal durable reconciliation and zero live references. Cleanup failure retries
without losing source; exact-source retry becomes unavailable after approved release.

## SQL configuration and validation proposal

Require supported STRICT SQLite, foreign keys enabled on every connection, defensive mode,
trusted_schema disabled, no extension loading or application-supplied SQL from documents.
Validate the expected schema plus rows/limits; hostile files do not inherit trust from their CHECKs.

DB17-B selects local macOS WAL + synchronous FULL, fullfsync OFF and checkpoint_fullfsync OFF; verify effective
values with the bundled SQLite/VFS. Checkpoint scheduling belongs to background storage. Durability
and latency must be measured on supported hardware; do not silently downgrade for speed.
journal_size_limit is not a live-WAL hard quota. [SQLite PRAGMAs](https://www.sqlite.org/pragma.html),
[security guidance](https://www.sqlite.org/security.html).

## Multi-client persistence policy — decisions 169–172

DB11–DB14 selected A (decisions 169–172): bounded client-memory retention until durable acknowledgement; orderly save/disconnect/exclusive takeover rather than live transfer; client-scoped conditional Undo; object/property preconditions rather than interaction reservations. No client recovery journal or persistent Undo selected. Uncertain outcomes require reconciliation, not blind replay. All-holder failure before persistence can lose unsaved work.

Quitting the coordinator must settle persistence or follow reviewed failure/consent behavior before ownership release. Reload durable state on takeover; matching operation outcomes and ownership/incarnation checks must prevent duplicate application after lost acknowledgements. DB15-A selects bounded durable command receipts, atomic with drawing changes; their concrete scope/schema/retention still need review. Missing receipts remain Unknown. Do not implement a second application WAL or client recovery database under DB11-A.

## Resource and recovery boundaries

Existing selected one-second batching is a maximum deliberate wait for the oldest unpersisted edit,
not a promise that a failing disk completes in a second. Continue accepted editing only within reviewed
memory/queue limits; warn and reject new admission before exceeding them. Preserve already accepted work.
Do not label capacity failure as corrupt data.

Before code, assign numeric input/active-stroke/document/undo/unsaved-work/job/cache/WAL/name/receipt/
access-reference limits, fairness and retry budgets with hardware and fixture rationale.
The draft receipt limits are not approval of other unspecified limits.

DB1-A retains the three-database design. A backup/copy cannot guarantee the latest deletion/naming authority unless its commit and recovery protocol establishes it. Missing authority can leave operations unavailable; no automatic cleanup or reintroduction of ambiguous user data.

DB2-A separates actual timestamps from persistent gallery activity order. Catalog transaction allocation must be serialized across processes and idempotent for a repeated projection. The activity counter does not restore lost historical chronology or permit stale completions to reorder newer edits. Define the exact admission/durable handoff and recovery procedure before implementation.

## Receipt and future retention decisions 173–174

DB15-A / decision 173 selects bounded durable outcomes for relevant editing commands, atomic with their drawing changes; no full history/client journal/persistent Undo. Missing receipts remain Unknown. Concrete receipt schema/retention/export scrubbing require review. DB16-C / decision 174 defers cloud conflict-copy retention to the cloud milestone without weakening preservation-first decision 166.

## Maintenance selections and portability clarification

DB18-A (175) selects yielding/restarting safe disposable readers before interrupting edits under WAL pressure, with protected sources and bounded fallback admission pauses. DB19-A (176) selects free-page reuse and controlled inactive-drawing compaction, initially auto_vacuum=NONE. Concrete limits, maintenance authority, temporary space and failure tests still require review.

DB17-B (177) selects normal platform synchronization without F_FULLFSYNC; it does not establish equivalent physical durability across platforms. Shared Rust Save outcomes require an adapter-specific verified persistence contract; native OS/VFS and browser storage completion/retention guarantees need separate evidence. Exact web VFS/journal settings remain pending.

## Completed current policy batch

Decisions 177–180 close the current policy batch: DB17-B uses SQLite FULL with fullfsync=OFF and checkpoint_fullfsync=OFF on macOS, without claiming identical cross-platform durability. DB20-A validates whole-stroke mutation state; DB21-A starts a fresh Undo/Redo session after coordinator recovery only after reconciling/preserving pending work; DB22-A permits proven-independent commands and pauses dependent/uncertain ones. Exact schema/ABI/budgets and UI remain review items.
Planned checks include querying effective synchronization settings on all relevant connections, stale same-stroke token after Undo/deletion, pending-work survival across history reset, independent versus dependent queue progression and atomic group rejection. These checks have not run.
