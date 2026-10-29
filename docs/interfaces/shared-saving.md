# Shared background-saving interface — SAVE-01 design

Status: checkpoint design, not production API/ABI adoption. Owner approved common web/native interface design and isolated transport comparison on2026-10-29. Existing editor and previews remain unchanged. Read tasks/SAVE-01.md for scope and docs/architecture/browser-storage.md for unresolved production storage blockers.

## Ownership

One Rust editor owns mutations and history. Shared Rust persistence services own completed-state capture, revision accounting, autosave deadlines, validation, coalescing, retry classification and reconciliation. A storage executor applies immutable batches; it is not a second editable document. Platform adapters own scheduling, transport and filesystem/database access. UI never submits SQL. Renderer execution and sample/brush algorithms do not change.

Current engine stores Rc<Points> with256-sample Vec blocks and thread-local RefCell state. It is not a Send/Sync document. Native sharing needs sealed immutable Arc-backed blocks; never unsafe-send the current engine. Live transforms/Slice alter preview fields before completion. Saving must read an explicit completed-state projection/delta, not enumerate visible render strokes. Hidden-layer artwork is durable content. Deleted/undone history-only instances are not, but source samples referenced by live Slice fragments must survive.

## Common semantic types

DocumentId, Incarnation, SessionId, OperationId, BatchId and ArenaId are distinct validated opaque identities. Revisions and generations are checked nonnegative integers with explicit exhaustion, not wrapping rendering counters. Transport i64 values exactly (BigInt on web), never through Number. The implementation ABI will be generated from the selected Rust types after review.

DocumentToken = document + incarnation + contentRevision + metadataRevision.
WriterGrant = document + incarnation + ownerGeneration + executorGeneration.
Batch = grant + batchId + expectedBase + resultRevision + orderedOperationReceipts + mutations + blockDescriptors.
Lease = batchId + arenaId + allocationGeneration + readerGeneration + exact bounded ranges.

Each operation receipt preserves operation identity, client/session sequence and binding to its immutable semantic body. Coalescing multiple operations into one transaction never coalesces their Undo boundaries or makes uncertain operations retryable under new IDs. Batch dependencies and base revision must be validated before applying writes.

Mutations carry changed document/layer/stroke/source records and explicit deletions. New samples are transported once; transforms/style/layer changes reference already saved sources. Persist pressure response, brush/material version, source intervals, ordered blending and exact regional placement/rotation/scale. Paper/grid are document settings; camera/tool preferences remain a separate local projection. Concrete updated DDL remains a required follow-up: old pen-only SQL cannot preserve this model.

## Semantic operations and events

| Operation | Meaning |
| --- | --- |
| open(document, capabilities) | Obtain exclusive writer authority, validate format and return durable token/session or typed rejection. No blank replacement on failure. |
| prepare(targetRevision, budget) | Rust freezes completed metadata and source references. Returns a bounded cursor/lease; never commits an active gesture. Work can continue in bounded chunks. |
| submit(batch, payload) | Accept into bounded executor work or report NotAdmitted with ownership unchanged. Acceptance is not saving. |
| flush(targetRevision) | Bypass batching delay through the specified completed revision. Repeated requests coalesce; never mutate history. |
| reconcile(operationIdentities) | Resolve Unknown outcomes using authoritative stored receipts under valid writer authority. |
| close(session, throughRevision) | Finish/reconcile accepted writes and retire payload readers before relinquishing writer authority. Failure retains source session. |

Events: Accepted, PayloadReleased, DurableReceipt, ProvenNotCommitted, Unknown, Conflict, CapacityAvailable and Closed. Every event carries its identifying grant/batch/operation context; mismatched incarnations/generations are stale. Protocol receipt and error fields are allowlisted, not exception strings containing document content.

PayloadReleased means the consumer will no longer read the leased bytes. It may precede or follow DurableReceipt. It does not retire pending edits or say Saved. DurableReceipt acknowledges a synchronized committed exact revision and matching operation bodies. Saving N never cleans N+1. Missing/pruned receipts or a dead worker after possible execution remain Unknown, not proof of rollback.

No generic cancel-save operation: unadmitted work can be withdrawn; accepted work needs confirmed non-execution/rollback or commit reconciliation. Cancelling input is independent of storage cancellation. Persisting Undo is another completed document mutation, not database rollback.

## Two independent lifetimes

Payload: Reserved → Filling → Sealed → Leased → Released → Reclaimable.
Persistence: Pending → Submitted → Committed / ProvenNotCommitted / Unknown / Conflict.

One allocator owns arenas. Publication exposes only initialized, versioned ranges; no writes after sealing while any reader holds the lease. Release is idempotent only for the exact allocation/reader generation. An old release cannot free a reused slot. Retain canonical source or complete immutable pending bodies until durable reconciliation, even if transport payload was released.

Worker failure retires its generation. Do not reclaim shared slots on elapsed timeout alone: quarantine readers/arena until retirement is established. If this cannot be established, a new epoch/arena may be admitted only within the memory budget; otherwise pause admission while preserving accepted work. Rejecting a stale reply does not prevent a stale writer from writing: SQLite writer authority must survive through actual commit/rollback/retirement. This is why STORE-W9 remains a separate gate.

## Platform implementations

| Concern | Native | Web transfer | Web shared candidate |
| --- | --- | --- | --- |
| Immutable data | Arc blocks + frozen small metadata | Canonical Rust blocks retained; disposable encoded staging transferred | Dedicated sealed arena/block lease, compatible with actual Rust memory layout |
| Ownership crossing | Retain references; no sample copy | Sender staging buffer detaches | Descriptor/control message; payload remains shared |
| Executor | Rust storage thread, owned SQLite connections | Worker + validated SQLite/Wasm adapter | Same storage worker; SQLite still has its own memory |
| Recovery source | Retained blocks/operation bodies | Original canonical blocks, never only transferred buffer | Retained source + quarantined leases |

The common interface hides Arc/ArrayBuffer/SAB, but exposes payload size/lifetime/capability accounting. No silent downgrade of durability. Native host bindings exchange handles/status; no artwork round trip through Swift/Kotlin/C# just to save it.

An arbitrary SAB is not Rust linear memory. Direct web sharing requires a compatible shared WebAssembly.Memory build, allocator/block design and view/growth protocol. Do not share the mutable engine heap merely to make samples available. Separate arenas reduce accidental exposure but SAB has no read-only enforcement; workers remain trusted same-origin code. Do not instantiate the mutable editor runtime twice against one heap. Fixed arenas are the checkpoint rule; future memory growth needs explicit view refresh and lifetime evidence.

Shared transport does not eliminate SQLite binding/encoding or disk costs. It may simply move an existing copy into a staging arena. Include all producer copies before recommending it. Cross-origin isolation, secure context, worker loading and deployment/CSP compatibility require independent evidence.

## Scheduling and experimental bounds

Shared services request autosave within the already selected1second batching cap; no durable-completion deadline is implied. Use monotonic age of oldest pending work. One batch in flight with bounded coalesced pending descriptors is the starting proposal; rejected admission leaves work with the editor. Long operations require a reviewed streaming transaction protocol, not splitting an atomic edit into independently visible partial saves. Reserve capacity for reconciliation and close; never drop accepted input.

Checkpoint only: payload stride40 bytes, chunk maximum1,048,560 bytes (whole records), one in-flight payload, workloads up to40,000,000 bytes. The synthetic little-endian record is regionX:i64/localX:f64/regionY:i64/localY:f64/pressure:f32/reserved-zero:u32. This is an explicit experimental layout, not serialization of Rust struct padding and not final database encoding. Source initialization is excluded from transport measurements and separately reported. Shared-direct uses a standalone shared Wasm memory with64KiB pages and a fixed configured maximum; it does not exercise current Rust allocation. Control publication uses Atomics; payload stays immutable until acknowledgement. Metadata-only autosave requires no sample payload, but is not benchmarked here.

Browser5second watchdog retires failed checkpoint consumers; it never marks data durable or authorizes shared slot reuse. This is unrelated to the pointer-release fix, which has no timer threshold. Test recovery keeps original source buffers and never writes/reuses an old shared arena after termination. No timeout-based proof of SQLite writer retirement is claimed.

## Required production evidence after this checkpoint

- Actual Rust capture during draw/move/Slice excludes unfinished state; save/load preserves all samples, hidden layers, fragments and pixels.
- Real lease release/reuse, delayed duplicate releases, pending N+1, incarnation replacement and bounded memory under stalled readers.
- Actual transactional commit/rollback, lost-reply receipt reconciliation, quota/corrupt/newer-format failures and crash fencing.
- Browser isolation deployment and memory growth; native Arc/lifecycle implementation; mobile suspension and restart.
- Whole-app input/render latency, save completion and actual process memory during large saves. Synthetic rAF and worker checksums do not certify physical input, GPU, disk or power-loss durability.

Existing previews and PR21 remain unaffected. Return checkpoint results and obtain production direction before adding saving to the editor.
