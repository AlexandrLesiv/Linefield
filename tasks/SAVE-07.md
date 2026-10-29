# SAVE-07 — bounded durable checkpoints and capacity scaling

Owner approved capacity work after SAVE-06 gallery/reload on2026-10-30. In progress on codex/save07-capacity-checkpoint from SAVE-06 commit6b9ef43 (draftPR27).
Keep previous previews unchanged; no merge. Start from frozen SAVE-06 source and separate branch.

## Scope and sequence

Replace cumulative journal lifetime ceilings with chunked durable current-state checkpoints and
bounded delta tails, streaming restore and safe reclamation. Preserve exact accepted samples,
regional coordinates, ordered blending and renderer behavior. Keep per-message/queue bounds and
checked representational ranges; fail honestly on allocation/quota rather than truncate input.

First remove full-batch aggregation: stage bounded chunks durably, validate complete digest via
shared Rust, atomically publish batch manifest/head. One outstanding transfer remains. Then use
shared Rust storage replay semantics in a storage worker to materialize a validated checkpoint at
durableR; it is not a second editing owner. Publish new checkpoint before bounded reclamation of
old rows. Keep exact retry receipt across compaction and retain sources reachable by the current
writer epoch, because Undo can restore a deleted source without retransmitting its raw data.

Replace all-BLOB load, complete-stream accumulation and per-batch Model clones with paged reads
and incremental Rust decode into an unpublished engine. Validate identities/references/revisions/
checksums before publishing. Migrate v1 with bounded substr reads; preserve old data until the new
generation is validated and committed. Failure must leave an exact recoverable revision.

Only after evidence remove10,000 stored batches/48MiB cumulative payload limits and replace128MiB
pool inspection cap with bounded metadata admission. Lift1M retained-source-sample guard using
checked allocation/encoding. Dense100k source IDs/4096layer guards require sparse restoration or
measured admission; do not blindly remove. Current100k operation/record counters are per pending
batch (reset at idle_begin), not lifetime limits. Encoding casts to u32 require checked bounds.

## Acceptance

Cross former48MiB/10kbatch/1Msample limits. Repeated transforms/deletes without visible growth;
Undo restores deleted sources after checkpoint. Exact raw/image parity. Interrupt stage/seal/
publish/compaction/GC/migration; stale/duplicate receipts; worker loss; quota failure; edit while
checkpointing. Paired isolated input-delay/frame-tail, peak-memory and restore measurements;
no performance claims from moving CPU work alone. E2E only, static/build, specialist and independent
review. Update one task PR and open a frozen actual-app preview after verified progress.

## Current baseline

Frozen65354, Chromium156.0.8078.48, AppleM2Pro16GiB,1200x1000CSS/DPR2. Three fresh-context
runs each inject40alternatingmouse/pen strokes of61accepted samples while saving. All samples
and durable revisions retained. Frame maximum16.8ms in each run; measured preparation-call
maximum0.9–1.1ms; finalflush29.1–34.3ms. Timer schedulingp955.1–5.2ms includes browser
timerclamping and is not physicalinputlatency. No GPU timing or universalregressionclaim.
Evidence .build-cache/save07-baseline/results.json; scripts/probes/saved-gallery/performance.ts.

First implementation increment changes chunk staging/loading while retaining existing capacity
guards. It is an enabling checkpoint, not completedcapacityscaling. Large-limit success cases
remain gated on sharedRust compaction, sourceepoch/Undo safety and bounded restoration.

## Review gates

CAP-001: checkpoint/GC followed by Undo/Redo, including a frozen next batch; retain exact sources.
CAP-002: lost receipt then compaction then identical retry; conflicting identity must reject.
CAP-003: kill/quota at staging/seal/publication/GC; recover a complete old or new revision.
CAP-004: chunk boundaries, corruption/order/length/trailing data; poison failed unpublished restore.
CAP-005: validate v1 schema/chain/incarnation before migration, preserve on unsupported/partial v2.
CAP-006: concurrent newer edits, stale generation/grant/session and delayed maintenance responses.
CAP-007: sparse/high IDs and checked allocation/framing; preserve allocator high-water.
CAP-008: beyond old limits with whole-process memory, tail responsiveness and maximum work-slice
measurement. Bounded messages alone do not establish bounded decode, SQL scan or final cleanup.

## Verified chunk-storage checkpoint

Durable chunks are at most 65,520 bytes, with incremental shared Rust hashing and bounded
seal steps. Restore pulls chunks; legacy reads use SQL substr. Canonical v1 replay and
incarnation validation precede transactional schema migration. Validated reopen reclaims
unreferenced staging. The aggregate 128 MiB admission cap is removed; all other capacity
guards remain until compaction and incremental decode acceptance.

Actual-app 13 checks and 15 storage/migration/admission groups pass. Recovery preserves a
real saved stroke and every raw sample after reclaiming 2,100 abandoned chunks exceeding
128 MiB; single observed reopen 5.37 s. Invalid incarnation and semantic corruption leave
legacy pool bytes unchanged. Independent source review closed both blockers. Root static,
scoped Rust/Wasm/web build, contract generation and lint/format checks pass.

Three candidate runs retain all 40 x 61 samples and durable revision 40. Maximum frame gap
16.8 ms; preparation-call maxima 0.5–1.1 ms; final flush 35.6–37.8 ms versus baseline
29.1–34.3 ms. No whole-process-memory, physical Wacom latency or large-document performance
claim. Evidence: ignored save07-{app,chunks,migration,admission,candidate} reports.
Frozen manual preview: http://127.0.0.1:65355/. Existing previews unchanged.

Remaining: incremental Rust decode (current complete-stream buffers and Model clone remain),
validated current-state checkpoint, bounded delta-tail compaction, Undo/source reachability,
retry receipts, sparse allocator handling, then former-limit workloads and ceiling removal.
