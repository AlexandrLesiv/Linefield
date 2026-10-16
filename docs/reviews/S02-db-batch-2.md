Current direction: decisions 163–165 select multi-client incremental local editing and platform communication adapters, plus simple future cloud conflict warnings/conditional replacement. See ../architecture/incremental-collaboration.md and ../../tasks/S02M.md. Earlier exclusive-client alternatives/rename-only contracts below are historical or incomplete; exact mechanisms remain pending.

# S02 decision batch 2 — ownership and native interfaces

Status: DB7-A and DB8-A approved by the owner on 2026-10-16 (decisions 161–162). DB5/DB6 remain open; see S02-db5-db6-followup.md for the owner’s conditional-save question and platform communication explanation. These are architecture selections, not implementation authorization.

## DB5 / S02-D2 — Who guarantees one writer per drawing?

A (recommended): per-drawing OS lifetime lock plus owner-generation checks, retained through all writes. OS process exit releases the lock; never take ownership merely because a heartbeat expired. Each platform implements the primitive behind the shared contract.
B: a separate broker process coordinates all document ownership/writes. Central authority, but adds a process, IPC lifecycle, crash recovery and platform packaging work.

## DB6 / S02-D3 — How should macOS processes request rename from the owner?

A (recommended): pursue authenticated typed NSXPC, contingent on a signed/sandboxed discovery and connection probe. A failed probe returns to owner review; no silent fallback. Same-process requests go directly to the shared dispatcher.
B: design a bounded shared SQLite request mailbox. Durable requests are convenient, but peer authorization, polling/wakes, stale requests, schema and cleanup need a separately reviewed design. File access alone does not authenticate a peer.

## DB7 / S02-D4 — Who owns query-result memory across Rust/Swift?

A (recommended): caller-owned buffers for bounded UI DTOs/text; Rust copies into them. Explicit capacity/revision checks and no Rust allocation to release from Swift. This is not copying all geometry every frame; rendering remains Rust-owned.
B: Rust-owned immutable snapshot leases. Potentially less copying for large results, but Swift must release leases correctly; held snapshots can retain memory and complicate shutdown. Needs limits and stale-handle tests.

## DB8 / S02-D5 — How do workers tell the macOS main thread results are ready?

A (recommended): coalesced nonblocking readiness pipe watched by a main-queue dispatch source. Only a wake signal crosses the pipe; results live in the owned bounded queue. No document serialization, disk access or polling. Review descriptor lifetime/no-lost-wake shutdown; other hosts use platform equivalents.
B: a narrowly scoped retained native notifier called by a worker only to schedule a main-thread wake. Avoids pipe descriptors, but adds a cross-language callback/object lifetime and reentrancy contract. It never edits state or touches UI on the worker.

Shared commands, one editor owner, bounded queues, main-thread mutation and stale-result rejection are preserved under either boundary/wake choice. No option authorizes implementation, a new framework or a custom command packet format.
