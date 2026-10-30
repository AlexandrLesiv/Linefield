# Local browser saving

Rust owns completed editing state, raw regional samples, settings, history and revisions. The
`save-app` feature supplies a separately generated checked ABI. `scheduler.ts` requests bounded
idle capture, SHA sealing and retirement; `prepare.ts` transfers disposable chunks to the storage
worker. Rust validates the exact receipt before acknowledging durability. Accepted input is not
removed on a storage failure.

The gallery lists real locally saved drawings with white thumbnails. Each drawing has its own
SQLite database and exclusive Web Lock. `createSaving(core)` restores before input/render handlers
are installed. The worker inspects pinned storage metadata, validates revision/digest chains and
commits opaque incremental batches atomically. Corrupt storage refuses admission; there is no
silent reset or generic SQL endpoint. Data belongs to the browser origin, so isolated preview
ports have separate libraries. Local browser storage is not an external backup.

## Incremental reload and maintenance

Reload decodes source streams directly into unpublished Rust point blocks. Metadata is read twice:
first to validate descriptors, then to apply records after sources are available. Both passes must
have the same SHA256 digest. No whole raw batch or per-batch document clone is required. A malformed
later batch poisons the entire unpublished session. Cancellation and retirement release point
blocks and map entries in bounded calls. Final engine construction/publication still traverses the
visible model; its cost is measured separately from streaming decode.

At 128 tail batches, background maintenance captures a fixed durable revision and replays it in an
independent worker codec. It emits an explicit LFC4 current-state checkpoint, preserving canonical
settings, layers, stroke references, source data and allocator high-water. Newer saves may append
while maintenance advances one bounded step at a time. Atomic checkpoint publication preserves the
newer tail; obsolete batches and their chunks are retired afterward. Garbage storage is explicitly
queued, so each cleanup seeks one queued storage and deletes at most 16 chunks instead of scanning
all live chunks. Migration may perform a one-time orphan discovery. Both legacy schemas are
canonically validated before extension to schema v3.

Exact operation/base/result/digest receipts live separately from reclaimed payloads. Lost-ack retries
remain idempotent after compaction; conflicting digests fail. Receipt metadata is retained rather
than expired without an acknowledgement horizon. This small metadata grows with lifetime saves.

An editor epoch is a fresh drawing open, not a worker restart. All sources introduced in the current
epoch survive compaction, including deleted strokes needed by Undo/Redo or frozen batches. At a new
epoch's exact durable baseline, unused previous-epoch sources can be pruned before later deltas are
replayed. Reload starts a fresh Undo/Redo session. Worker recovery must match the stored epoch grant;
an older editor cannot silently recover after another editor has replaced its epoch.

## Capacity and failure policy

The production idle-capture/streaming-reload path no longer imposes the former 48 MiB document,
10,000 lifetime batch or one-million retained-sample ceilings. This is not unlimited storage:
browser quota, available Wasm/process memory and checked numeric representation still apply.
Each source stream has a u32 byte length (40 bytes per sample); source/stroke IDs remain below
100,000, layers below 4,096, and pending batch operation/record counts remain bounded at 100,000.
Messages contain at most 262,080 bytes and individual chunks at most 65,520 bytes. Old experimental
LFS2 metadata/direct-delta APIs retain their separate one-million-sample guards; production saving
does not use those capture/reload paths.

Maintenance uses an additional unpublished worker model, so large live documents increase worker
memory while checkpointing. Old and replacement payloads coexist until publication and cleanup,
so checkpointing temporarily needs additional disk space; quota failure keeps the old durable state. Same-epoch Undo sources are intentionally retained; new epochs can
reclaim unreachable sources. Receipt metadata and Wasm linear-memory high-water are separate costs.
Maintenance failure does not revoke already durable saves. Failed/abandoned staging is reclaimable;
retry and reopen preserve the previous valid checkpoint/tail. Storage failures remain explicit.

## Validation

Build: `node scripts/build-vector-editor.ts` compiles save-app, verifies generated boundaries and
copies pinned SQLite 3.54.1 runtime assets. Acquisition verifies the official archive and copied
runtime hashes. Assets remain in ignored build directories. Runtime capabilities are same-origin
OPFS and Web Locks.

E2E runners: `apps/web/tests/vector-saving*.mjs`, with `LINEFIELD_PREVIEW_URL` selecting an isolated
candidate origin. Faults are injected by the test process, never shipped as production commands.
Capacity, checkpoint/Undo/retry/epoch recovery, raw-data/image parity, main-thread responsiveness,
worker duration and memory must be evaluated separately. See `tasks/SAVE-07.md` for exact measured
results, limitations and acceptance status; implementation here alone does not imply acceptance.

## Saved gallery actions

Catalog v2 adds reversible deletion markers and exact mutation receipts without changing drawing
files. Rename uses the shared Rust UTF-8 title validator and compares the expected title. Rename,
Delete and Undo preserve the drawing's content-modified timestamp and gallery order. Retried
operations return the current catalog projection, so an older successful rename cannot overwrite
a newer displayed name and an old delete retry cannot delete an already restored drawing again.

Deletion obtains drawing ownership and is bound to incarnation and a unique token. The host first
flushes and closes only the matching cached editor; a failed flush preserves that editor and its
accepted data. A different tab holding the drawing blocks deletion. Undo must match the current
deletion token; a later deletion cannot be undone by an earlier token. List, direct admission,
creation retry and legacy discovery all respect validated deletion markers.

The UI changes after durable acknowledgement. Rename keeps its dialog/input on failure; deletion
and Undo keep the existing card/removal slot with Retry. The original menu, focus and motion are
retained. There is no permanent file purge or Trash screen: removed drawing files and action
receipts remain stored, and the in-place Undo is a current-gallery-session affordance.
