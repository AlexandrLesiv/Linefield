
> Working-copy terminology was normalized by owner decision235 on2026-10-18. Historical approval hashes below still identify their recorded approval artifacts, not these normalized bytes. The pinned base preserves a pre-normalization working copy and is an exact approval snapshot only where its hash matches. See [normalization provenance](design-workflow-normalization-2026-10-18.md).

# Linefield S02 v2 — consolidated owner review
Prepared 2026-10-16. Status: OWNER APPROVED on 2026-10-16 (decision 181), documentation only. See [approval scope](S02-v2-approval-2026-10-16.md). Current tree has no committed baseline; evidence uses exact file hashes. Policies DB1–DB22 are selected (DB16 cloud retention deliberately deferred); the concrete fields/signatures/transitions and provisional starting limits below are now explicitly approved; implementation and feasibility evidence remain separate.

## Read in this order
1. [Schema delta and field constraints](../database/schema-v2.md), with [combined DBML](../database/review.dbml) and [editable layout](../database/review.dbdiagram). Private hosted version/evidence recorded after publication in quality/S02-v2-review.json.
2. [Typed commands and ownership](../interfaces/native-v2.md), then [query/effect DTOs](../interfaces/native-v2-queries.md).
3. [Recovery transitions and thread/sequence diagrams](../architecture/recovery-v2.md).
4. [Proposed limits and SQLite configuration](../architecture/limits-v2.md).
5. [Acceptance and negative-test matrix](../../quality/S02-v2-test-plan.md).

## What is already selected
- Three databases: library catalog, per-drawing SQLite, export jobs. UUID BLOB16, one row per actual sample, transforms separate, sRGB, top-level format version.
- One authoritative Rust coordinator in the first eligible app process; many client sessions, one database writer. Native controls and shortcuts share named commands; typed generated FFI.
- Main-thread macOS editor/Skia, bounded background storage/logging, readiness-only pipe. Platform IPC adapters; no new executor/daemon/custom binary protocol.
- Incarnation plus scoped revisions; whole-stroke stale checks; client-scoped Undo; fresh history after coordinator recovery, with pending work preserved.
- RAM-only pending work until durable save, bounded durable committed-command receipts, conservative Unknown outcomes. Dependent commands pause; proven-independent ones may proceed.
- WAL + FULL without F_FULLFSYNC; prioritize safe reader yielding under WAL pressure; free-page reuse and inactive maintenance compaction.
- Preserve conflicting versions before destructive future sync resolution; automatic semantic merge/CRDT/agent integration deferred.

## Approved concrete proposal
| Area | Proposal | Why / tradeoff |
| --- | --- | --- |
| Schema | 5 incarnation/mutation fields and rename→command receipt expansion, 14 tables/116 columns/8 refs | Fences replacements and stale strokes without new DB/tombstone history |
| Stroke token | Last content mutation revision + incarnation | Detects change-away/change-back and Undo restore; ordinary Create cannot impersonate old UUID |
| Receipts | 12-column committed-mutation outcomes, bounded replay window/floor and authenticated queries | Prevents duplicate writes after lost reply; pruned/missing/no-op-after-crash may remain Unknown |
| ABI | Named client-scoped functions, caller-owned DTOs, no raw pointers across IPC | Explicit lifetimes/authority and testable shared behavior; actual generated header not compiled yet |
| Bootstrap | macOS approved library directory descriptor duplicated by runtime; explicit en/uk launch language | Removes hidden generic service-config token; sandbox/native feasibility needs probe |
| Recovery | Identity-fenced state machines and cross-file durable intents | SQLite handles transactions, Rust coordinates files/databases/consent; no fictitious cross-DB atomicity |
| Limits | Proposed bounded capacities and admitted-resource accounting | Finite overload behavior; starting values are owner-approved; measurements and reviewed material revisions remain required |
| Presentation | Typed conflict/reconnect/history-reset effects | Semantic contract only; exact native UI still needs identified design approval |

The source schema may evolve while under review; historical Version 3/5 approval remains scoped to those snapshots. New proposal version is not an automatic document user_version bump because no released Linefield format exists.

## Approval scope and remaining feasibility gates
Approval can cover the schema/semantic/lifetime/budget proposal with conditions. It does not authorize application implementation, design review UI, platform releases or cloud.
Before code, exact macOS signed/sandboxed peer discovery and allowed native IPC classes must be proven in a separately authorized disposable probe. No arbitrary fallback transport or broad entitlement.
File import/export access-grant persistence and destination identity still need a concrete native adapter contract; existing semantic lifecycle is specified here but native bookmarks/capabilities are not implemented. Other native hosts and web VFS/worker/flush support remain explicit future feasibility gates.
No numeric latency guarantee or all-platform parity proof. No data-loss-free promise for uncommitted RAM after all holders die, misbehaving external writers, storage faults or hardware that misreports flush.

## Agent and security handoff
Database specialist reviewed schema/receipt/ABA proposal read-only; rust_engine reviewed typed boundaries/threading/replay read-only. Lead is sole writer; no concurrent writer worktrees needed. Fresh independent reviewer checks final document snapshot and evidence. See quality/S02-v2-review.json for actual results; do not infer review from planned roles.
Threat delta: edit-capable authenticated peers, replay/pruning, raw/native capability misuse, stale authority/file replacement, hostile SQLite and private export leakage. Map tests S02V2-01–28 to existing CT/INV and security review. Logs are bounded/redacted; no per-sample or persistent IDs.
No runtime tests or migration checks executed during planning. Static DBML validation/layout/link/definition checks and hosted visual review are documentation evidence only.

## After your review
Resolve concrete findings/conditions, then authorize scoped compile/rendezvous/storage probes; do not begin app implementation from this packet alone. Gallery design review/native milestone remains first product implementation. S02/S02M remain open for their required feasibility evidence; concrete v2 contract approval is recorded in decision 181; schema diagram publication is not completion.
