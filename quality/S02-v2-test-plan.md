
> Working-copy terminology was normalized by owner decision235 on2026-10-18. Historical approval hashes below still identify their recorded approval artifacts, not these normalized bytes. The pinned base preserves a pre-normalization working copy and is an exact approval snapshot only where its hash matches. See [normalization provenance](../docs/reviews/design-workflow-normalization-2026-10-18.md).

# S02 v2 acceptance and negative-test matrix
Status: PLANNED / NOT EXECUTED. Documentation parsing/review is separate evidence. No SQLite fixtures, generated header, native app or device run is claimed. Exact future revision/build, host/device, discovered IDs, attempts/skips and artifacts required.

| ID | Contracts / invariants | Fixture and pass condition | Required layer / owner |
| --- | --- | --- | --- |
| S02V2-01 | CT05 INV06 | Expected incarnation + base revisions match; changes/header/receipt commit together; mismatch changes no persisted row | Rust SQLite / rust_engine |
| S02V2-02 | CT01/05 INV01/06 | Stroke A→B→A and delete→Undo restore reject old mutation token; different stroke edit still succeeds | Shared semantic + store / rust_engine |
| S02V2-03 | CT01/04 INV01/10 | Same command ID/different retained body during reconnect outcome query rejects; body_match_verified cannot confirm mismatched provenance; wrong peer/viewer/owner/session/incarnation cannot edit | Core + actual IPC / Rust and host |
| S02V2-04 | CT05 INV06 | Kill before commit, after commit before reply, after receipt query: one mutation or honest Unknown, never duplicate | Process crash fixtures / Rust+build |
| S02V2-05 | CT01/05 INV01 | Receipt prune + old sequence cannot reexecute; old owner can query under new auth but cannot mutate | Replay property/state-machine tests |
| S02V2-06 | CT01/03 INV01 | Out-of-order independent results do not skip unresolved contiguous ack floor; missing dependency pauses | Shared command conformance |
| S02V2-07 | CT01/02 INV02/03/04 | Invalid mid-batch actual input cancels only its client; no partial stroke; end/cancel duplicate no second Undo | Rust + native input E2E |
| S02V2-08 | CT02/06 INV04/08 | Transform updates absolute to captured base; changed whole-stroke token rejects commit, pending preview preserved | Core + visible native transform |
| S02V2-09 | CT03/05 INV01/06 | Reconnect queries old receipts, preserves Unknown work, resets Undo only after reconciliation; no stale effect revival; pending list survives old handles and coalesced notices | Two processes + UI E2E |
| S02V2-10 | CT01/03 INV04 | Client A Undo never overwrites B's newer target edit; focus loss cancels A only | Rust and two native clients |
| S02V2-11 | CT04 INV01 | Wrong thread/reentry/stale handles/reserved tags/overflow/NULL combinations fail safely within valid-pointer caller contract | Generated declaration compile + boundary harness |
| S02V2-12 | CT03/04 INV01/08 | Insufficient capacity writes no partial output; changed revision/gap gives resync; mixed-revision geometry never installed; pending-list generation/cursor changes after reconnect cannot skip/lose records | Boundary + remote scene tests |
| S02V2-13 | CT04 INV01 | Wake producer/drain/rearm/shutdown races; no dropped completion or write to reused closed FD | Stress + host dispatch integration |
| S02V2-14 | CT05 INV06 | Query effective WAL/FULL/fullfsync OFF/checkpoint_fullfsync OFF on every connection; failure no false Saved | SQLite/VFS configuration + IO faults |
| S02V2-15 | CT05 INV06 | Reader-induced WAL pressure yields safe disposable reads then bounds admission; exact captured exports preserved | Large workload + DB lock faults |
| S02V2-16 | CT05 INV06 | Compaction inactive under maintenance guard; fail scratch reservation, kill mid-operation, reopen intact content | Filesystem/process fault harness |
| S02V2-17 | CT05 INV06 | Schema upgrade backup/publish/validation failures preserve original/recovery; no unsupported version rewrite | Versioned migration fixtures |
| S02V2-18 | CT05 INV06/07 | Create/import/delete at each cross-file boundary; no half-gallery entry, lost authority guess or stale resurrection | Durable lifecycle crash matrix |
| S02V2-19 | CT03/05 INV06 | Old-incarnation projection rejected; duplicate content projection allocates no extra recency; metadata does not reorder content | Catalog/storage concurrency |
| S02V2-20 | CT05/07 INV09 | Portable native output fresh allowlist, empty receipts; raw-byte private canaries absent; original untouched | SQLite + binary scan + native import/export |
| S02V2-21 | CT05 INV06 | Export captured before panel; job persists after confirmation; lost publication response pauses without overwrite/retry | Service faults + native file panel E2E |
| S02V2-22 | CT01/05 INV01/06 | Receipt/pending/history/snapshot/resource reservations at cap, cap+1 and simultaneous peers; control lane remains usable | Boundary/property + load |
| S02V2-23 | CT07 INV09 | Central event correlation, redaction of names/IDs/fingerprints/paths/samples, log overflow/sink denial cannot fail edits | Logging negative fixtures |
| S02V2-24 | CT01/02/09 INV05/11 | Native menus/shortcuts same dispatcher; text/IME retains priority; en/uk language/number parsing stable semantics | Real macOS native UI E2E |
| S02V2-25 | CT01/05 INV10 | Read-only capabilities reject every named mutation including retry/history paths | Shared + each implemented viewer |
| S02V2-26 | CT03/05 INV01/06 | Browser worker termination, storage quota/eviction, two tabs and chosen VFS journal support | Future browser real run, coverage gap now |
| S02V2-27 | CT03/05 INV01 | UIKit suspension, Android process death, Windows/Linux peer auth and storage locks | Future host E2E, coverage gap now |
| S02V2-28 | CT06/08 INV08 | Callback/command/queue/save/frame intervals, CPU/GPU/memory/WAL at tiny/typical/capacity scale | Measured release workload; rendering_performance |

## Fixtures and test stages
Synthetic fixtures: empty; one pressure/missing-pressure stroke; overlapping transformed strokes; 10k/100k/1m samples; maximum clients/receipts; same values after mutation; malformed UUID/hash/schema/triggers/NaN/overflow; disk-full/permission/IO-sync faults; foreign peer; unknown commit result. Expected semantic identities/order/revisions declared once and reused per native/Wasm adapter. No live user files.
1. Approve concrete contracts/limits and platform feasibility scope.
2. Authorized typed-header compile/layout and two-process native rendezvous probe; failures return to review, not custom transport fallback.
3. SQLite migration/transaction crash harness + core conformance/property tests.
4. Real gallery and canvas UI E2E after identified design approval; reserve desktop explicitly.
5. Independent code/security review and measured release evidence; no platform marked complete from Rust-only replay.

For crashes insert fault checkpoints before/after each durable intent, file publication, transaction commit, catalog projection, native confirmation and cleanup. Process kill proves process-crash behavior only; cannot claim physical power-loss testing. SQLite-reported failures and disk flush failure distinct from hostile format/capacity.
Native coverage maps shared scenario IDs to actual platform drivers/accessibility IDs. Future platform gaps explicitly NotImplemented; unavailable hardware is NotRun/Blocked, never Pass. Manual visual review, automated existence and execution status are separate columns in evidence.
