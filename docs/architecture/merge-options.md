# Conflict preservation and deferred merge options

Decision 166 (2026-10-16): prioritize preventing data loss over automatically reconciling every edit. Preserve conflicting work and resolve explicitly. Local incremental coordination (163) and platform adapters (164) remain selected. Initial future cloud sync preserves both whole-document versions; automatic semantic merging and object-level conflict review are deferred. Concrete preservation/retention/failure contracts and identified design approval remain required; no application implementation authorized.

## Separate three situations

1. Connected local clients: one Rust coordinator accepts and orders semantic commands. It can accept independent changes and reject/review incompatible ones while clients render previews.
2. Disconnected/cloud replicas: local and remote histories may diverge. A common base/causal relationship and domain-aware merge policy are needed; an ETag only detects stale publication.
3. Long-running agent tasks: an agent can prepare a change based on stale context even while connected. Validate its read assumptions and write targets at commit, not just transport connectivity.

Shared rules belong in Rust and must have native/Wasm conformance fixtures. In-process calls, native IPC, browser messages and network sync are distinct adapters. A shared message transport cannot resolve semantic conflicts by itself.

## Approaches

| Approach | Benefits | Limits |
| --- | --- | --- |
| Whole-document conflict copies / explicit replacement | Lowest complexity; preserves alternatives if designed correctly | No combining of independent work; replacement can discard another actor's changes |
| Object-scoped reservations during connected edits | Prevents overlapping transforms/deletes early, permits independent work | Cannot coordinate disconnected replicas; lifecycle/expiry cannot silently authorize stale commits |
| Domain-aware three-way merge | Compare common base with both results by stable object IDs/properties; merge independent changes | Needs retained base/lineage; final states may not reveal intent/dependencies; coherent snapshots required |
| Semantic operations with preconditions/rebase | Records AddStroke/SetProperty/Transform/Delete intent, atomic groups and authorship; supports review and actor-aware Undo | Needs duplicate/replay/causal ordering, retention and explicit per-operation merge rules |
| CRDT-backed collaboration | Converges across offline/concurrent replicas under its model; established libraries exist | Deterministic convergence is not necessarily desired artwork; costs in metadata/schema/bindings/compaction/performance; same-property intent conflicts remain |
| Operational transformation (OT) | Transforms concurrent operations against one another | Requires correct transformation rules for supported operation pairs; text-style OT is not a ready-made solution for arbitrary drawing operations |

Selected initial scope: one local coordinator with typed operations; preserve rejected pending work and reject incompatible stale changes. For later cloud sync, preserve both coherent whole-document versions and resolve explicitly. The semantic merge options below are deferred research, not prerequisites for the first local milestone. No CRDT/OT library or operation-history schema is selected.

## Candidate semantic rules — all need review

| Concurrent edits | Candidate result |
| --- | --- |
| Add distinct strokes | Retain both; define deterministic paint order and assess overlapping stroke appearance |
| Edit unrelated existing objects | Combine if operation dependencies and document invariants remain valid |
| Change color vs translation of same object | Usually combine if truly independent in this tool's semantics; revalidate |
| Set same property to identical value | Converge to that value without duplicating an operation |
| Set same property to different values | Preserve both variants; ask/select under an explicit policy, not wall-clock last-write wins |
| Concurrent move/scale on same stroke | Conflict or a proven transformation rule; transformation order/anchor matters, do not blindly add deltas |
| Delete vs edit | Explicit policy; avoid silent resurrection or loss of edits. Keep conflict/recovery data until reviewed resolution |
| Agent transaction depends on objects human changed | Revalidate read assumptions; rebase safe cases or request regeneration/review |
| Undo after someone else changed the target | Scoped compensating operation with preconditions; do not restore an old whole-document snapshot |

Conflict is often property/object/transaction scoped, not a reason to block or overwrite the entire drawing. Independent changes in a dependent all-or-none transaction must not be partly applied without its contract. Coordinate reference integrity and spatial/selection assumptions, not just equal property names.

## Future merge provenance and persistence proposals — deferred

Use existing stable drawing/stroke UUIDs for cross-replica identity, not per-database integer row keys. Distinguish authenticated actor, client session and operation identity. Track a base revision/causal context, affected objects/properties, relevant read/write assumptions, group boundaries and result. Never use claimed actor ID as authorization. Device timestamps are presentation/diagnostic hints, not a universal concurrency order.

Record accepted semantic changes, not raw pen callbacks/SQL strings. A completed stroke is one logical transaction; temporary samples/previews do not become durable collaboration history. Distinguish materialized current state, durable change/provenance data and disposable previews/caches.

Exact log/snapshot/tombstone representation, transaction boundaries, pruning/checkpoints and schema/tool version compatibility are new review items. SQLite remains transaction/journal recovery authority; a proposed semantic history is not a replacement SQLite WAL. Do not add tables/columns or duplicate sources of truth without the database review. If required base/history was pruned, preserve versions and decline automatic merge rather than guessing.

SQLite Session changesets are an implementation option for row-level replication, not a drawing conflict policy. They do not know agent intent, tool invariants or how to reconcile independently allocated local integer keys. Never synchronize arbitrary SQL or database pages as trusted commands.

## Agent integration proposal

Agents eventually use the same typed commands/query boundary, never direct SQLite/file writes. For broad edits, prepare a proposed change set against a named base, expose a visual/semantic preview and commit/rebase under reviewed permissions. Do not hold a live database transaction or object reservation throughout a long model run.

Treat submitted operations as untrusted and validate capabilities, sizes, object membership, dependency assumptions and generations centrally. A useful candidate default is no silent overriding of another actor's concurrent edit; user/agent priority rules are still open. A user approval refers to the exact change set/base and cannot silently cover a materially rebased result.

## Delivery plan and acceptance

1. First local milestone: review concrete coordinator, per-client Undo, stale-operation rejection and pending-work preservation contracts; implement only after authorization. Prove bounded resources, failure states and accepted-versus-durable acknowledgements.
2. First future cloud milestone: preserve coherent local and remote snapshots, inspect either, keep both or explicitly select the active version. Revalidate local and remote versions before resolution. Define retention/quota/cleanup and block destructive resolution if preservation fails. UX/UI obtain identified design approval before implementation.
3. Later scope: evaluate safe independent semantic merges and required lineage/base/history using realistic native/Wasm fixtures. A lost base must not trigger guessed reconciliation. This evaluation does not block the local milestone.
4. Later scope: object/property conflict review, agent proposals and any CRDT/OT dependency require separate owner approval, contracts, design review and tests. No silent live-WAL file synchronization.

Planned MERGE-01 independent additions and stable paint order; MERGE-02 disjoint properties; MERGE-03 overlapping assignments/transforms; MERGE-04 delete/edit and references; MERGE-05 actor-aware Undo; MERGE-06 stale agent read assumptions/atomic groups; MERGE-07 duplicate/reordered/delayed delivery; MERGE-08 offline divergence/history compaction/schema mismatch; MERGE-09 coordinator crash and accepted/durable gap; MERGE-10 hostile actor/capability/oversized payloads; MERGE-11 user review becomes stale; MERGE-12 same semantic results native/Wasm. Compare golden semantic outcomes and actual UI; no tests executed.

## Primary references checked 2026-10-16

- Automerge conflicts: https://automerge.org/docs/reference/documents/conflicts/
- Yjs origin-scoped Undo: https://docs.yjs.dev/api/undo-manager
- SQLite Session extension: https://www.sqlite.org/sessionintro.html
- HTTP conditional requests: https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.1

Libraries are examples, not selected dependencies. No design review-like conflict-free product guarantee is implied.
