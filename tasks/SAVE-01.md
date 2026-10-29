# SAVE-01 — shared saving contract and web transport checkpoint

Status: isolated design/experiment complete; production direction pending. Owner-authorized on2026-10-29; production saving is not authorized by this checkpoint. Base is frozen PR21 commit09512a75b142c43b340a966abedd0e02f188d1b9 on codex/vector-integration-restart, not a claim of main integration. Branch codex/save01-transport-checkpoint. Preserve all existing previews, specifically65349. No user drawing, database, live editor or production adapter is modified.

## Recorded decisions and boundaries

Owner approved SAVE-01 after requesting the same background-saving interface for web and future native platforms and investigation of shared immutable web data. Record shared Rust semantic ownership, incremental completed-edit batches, bounded asynchronous background storage, and comparison of transferable staging buffers with shared immutable blocks. Native immutable references and web shared memory are design directions to validate, not permission to mark current Rc objects thread-safe or deploy a shared Wasm heap. Return performance/recovery findings before production implementation.

Earlier selected autosave direction remains: app-managed drawings, completed edits only, <=1second deliberate batching from oldest pending completed edit, immediate manual flush, revision-qualified Saved, session-only Undo/Redo, failure preserves pending work. Owner's later Back/Resume instruction supersedes old gallery-return history reset: suspension retains the live session/history; runtime loss does not. One retained live editor, proposed save-status wording and second-tab InUse simplification belong to the subsequent UI approval packet; do not confuse this transport approval with their implementation.

Production SQLite backend choice remains blocked by the earlier OPFS proxy-retirement gap and observed SAH-pool damaged-metadata preservation failure. This checkpoint performs no database writes and cannot clear either blocker. No changes to rendering, input quality, canonical coordinates, native hosts or existing previews.

## Deliverables

- [Shared saving interface](../docs/interfaces/shared-saving.md): typed semantic operations, completed-state capture, separate payload and durability lifetimes, web/native responsibilities, limits and failure policy.
- Isolated browser experiment under scripts/probes/save-transport: generated valid regional samples, transferred copy, shared staging copy and direct standalone shared-Wasm-memory reads. Direct mode is an architectural upper-bound candidate, not current Rust integration.
- Repeated balanced comparisons at1k/100k/1M samples, same bounded work and validation. Record source initialization separately, worker startup, preparation, roundtrip, consumer time, total completion and frame intervals. Logical payload counts are not measured process memory.
- Recovery checks for malformed descriptors, stale worker generation, queue capacity, transfer detachment/source retention, termination/restart and failed worker startup/runtime/posting. Report untested durable receipt/lease cases explicitly.
- Independent review and static checks. Generated evidence remains in ignored .build-cache; reproducible fixture source remains tracked. No unit test suite or production adoption in this task.

Acceptance IDs: SAVE-TRANSPORT-001 fair timing;002 valid-payload rejection;003 ordered integrity;004 bounded worker-failure settlement. These are synthetic real-browser boundary experiments, not actual Save UI or native E2E acceptance. CT-04/05/08 and INV-01/06 guide the later production suite.

## Edge cases and security review

| ID | Start and trigger | Required outcome / invariant | Owner and evidence |
| --- | --- | --- | --- |
| SAVE-TRANSPORT-001 | Identical generated samples; six transport orderings; final validation and next-trial setup | Time only each transport window; cancel rAF observation before validation, report cold setup separately | Lead; source hashes and final browser report, independent review |
| SAVE-TRANSPORT-002 | Valid source plus wrong generation/negative/misaligned/oversized range | Reject whole request before reading; transfer cases carry otherwise valid buffers | Lead; actual worker recovery assertions |
| SAVE-TRANSPORT-003 | Same ordered samples; swap two records; terminate worker with transferred staging | Detect order change; preserve source; replay yields expected per-chunk ordered checksum; checksums are not cryptographic proof | Lead; browser assertions, detached-buffer and source checks |
| SAVE-TRANSPORT-004 | One pending job; extra job, posting error, worker startup/runtime failure or stall | Bounded rejection/settlement: posting failure frees its request slot; startup/runtime/stall retires consumer; retain source; no Saved event and no shared slot reuse on watchdog | Lead; browser recovery and independent source review |
| Production gates | Save N during N+1/Slice, lost SQLite reply, delayed lease release, quota or owner death | Completed-state parity, separate payload/durability, authenticated receipts, actual reader/writer retirement | Rust/database/host owners; NOT RUN, required before production |

Security delta: isolated loopback fixture with COOP/COEP and same-origin static worker only; no production headers changed, no user files, network services, imported document or SQL. Worker reads a dedicated generated memory arena, never a live editor heap. Range/generation/one-job bounds protect admission; same-origin worker remains trusted and SAB is not read-only enforced. Five-second transport watchdog terminates the fixture consumer but is not evidence of database-writer retirement. Keep final evidence distinct from superseded diagnostic runs. No dependency or shipping feature adoption occurs here.


## Checkpoint outcome and recommendation

Final source-matched evidence: .build-cache/save01-final-isolated/report.json.54 browser trials (three sizes, three modes, six counterbalanced orders) and32 recovery assertions passed. Apple M2Pro/16GiB, Chrome156.0.8078.48 headless,1440×1000 CSS/DPR2, cross-origin isolated. Strict runner TypeScript, scoped lint/format, source length and diff checks passed. Earlier diagnostic reports are superseded because review found timing/integrity/failure-test defects; retain them locally, never use them as final results.

The40MB/1M-record workload's median total preparation was5.535ms transferable,1.985ms shared staging and0.028ms shared-direct; per-chunk p95 was0.310/0.150/0.005ms. All variants completed at approximately650ms under the deliberately identical one-chunk-per-frame schedule; observed transport-window frame max16.67ms. This shows copy avoidance, not faster end-to-end saves or proven physical input improvement. Source generation/checksum took approximately82–84ms and final validation51–53ms outside the transport window; production cannot hide such work on input callbacks. Current Rust encoding into this layout has not been measured.

Recommend transferable bounded buffers as the first production-integration baseline behind the common lease interface. Shared-staged lowers copying/allocation preparation in this fixture but adds isolation/lifetime complexity without completion benefit. Shared-direct is promising for native-like sharing but requires an actual Rust sealed-block implementation and retirement/reuse evidence before adoption. Neither shared path is selected for production by this result. Native Arc-backed immutable blocks remain the native design direction, not a tested implementation.

Recovery covers source retention, detached-transfer rebuilding, stale generation, valid-payload invalid ranges, queue saturation, order-swap detection, failed post/startup/runtime, stalled-worker retirement and reread checksums. messageerror is source-inspected only. No SQL/OPFS/durable receipt, shared slot reuse, actual Rust heap, native or real editor saving evidence exists. Existing storage blockers remain. Keep production paused pending owner review of these results and next scope.
