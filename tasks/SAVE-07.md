# SAVE-07 — bounded durable checkpoints and capacity scaling

Owner approved capacity work after SAVE-06 gallery/reload on2026-10-30. Implemented and verified on codex/save07-capacity-checkpoint from SAVE-06 commit6b9ef43 (draftPR27); draftPR28 awaits owner review.
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

## Implementation and acceptance

Incremental Rust replay decodes raw samples into unpublished point blocks and rereads metadata
with an exact digest check; it no longer clones the entire model per batch. Cancellation and
retirement are bounded. LFC4 checkpoints preserve allocator high-water and current-epoch sources,
including deleted sources needed by Undo. New-epoch pruning occurs only at the exact baseline.
Fresh opens and worker recovery use different epoch admission rules.

The worker publishes a checkpoint atomically before retiring old rows. Retry receipts survive
payload reclamation. Garbage storage is explicitly queued and indexed; cleanup deletes at most
16 chunks from one queued storage and refuses any queue entry referencing published data.
Autosave and maintenance use separate timers; pending maintenance cannot suppress new-edit saves.
Both v1 and v2 receive canonical validation before schema migration. No renderer/input changes.

Verified on the final candidate: fragmented replay/corruption/stale publication; exact v1/v2
migration; hash-valid semantic-corrupt v2 rejection without modifying stored bytes; retry after
compaction; automatic maintenance and no-op flush liveness; UI drawing autosave during maintenance;
current-epoch Undo retention; fresh-epoch unused-source reclamation; stale epoch refusal; corrupt
cleanup queue refusal without data mutation. Worker loss before/after publication, during GC and
quota failure preserve exact raw/image state and permit continued saving. Separate integrated
preview additionally passes primary-pen identity and mouse/pen contact-recovery checks.

The former 48 MiB payload, 10,000 lifetime-batch and one-million retained-sample ceilings are
removed from the production path. Tests crossed 10,001 separately acknowledged saves and saved/
reloaded 1,050,016 and 1,350,016 samples with exact digests and image parity. Final-candidate
reruns passed: 10,001 receipts leave a16-batch tail; the large cases store42,001,300 and54,001,300
bytes, save in3337.7/3970ms and reopen in2830/3327ms. These single-trial offscreen large-source
workloads establish storage capacity, not million-sample rendering speed. Sampled aggregate
browser-process RSS during save/restore was1.22–1.31GB; shared pages may be counted twice and
GPU/private allocations are not isolated. Fresh-epoch reclamation reduces82,071 to2,844 bytes
while retaining the newer drawing exactly. Layer names/order/flags and paper/grid also match;
active layer resets to the first ordered layer on reload, unchanged from the prior implementation.

## Performance and retained limits

Apple M2 Pro, 16 GiB RAM, Chromium156.0.8078.48, 1200x1000 CSS pixels, DPR2. Three matched
runs prefill127 separately acknowledged batches, then inject40 alternating mouse/pen strokes of61
samples. Candidate and quiet repeated baseline preserve every sample and durable revision167.
Both have maximum frame gap16.8ms in all three runs. Candidate preparation-call maximum0.2–0.8ms;
final flush40.2–45.3ms versus baseline39.4–44.4ms. Timer schedulingp955.3–5.4ms in both is
not physical input latency. Maintenance was pending/advancing in prune/replay and deliberately
yielded to busy input; this does not measure a full compaction finishing during continuous input.
An earlier baseline trial had a133.4ms frame outlier while builds may have overlapped; retained
as evidence and not used to claim a speedup. No GPU speedup or universal latency claim.

Browser quota, Wasm/process allocation and u32 stream framing remain real bounds. Dense source/
stroke IDs below100,000, layers below4,096 and bounded pending operation/record counts remain;
sparse allocator redesign is not silently substituted. Final publication traverses visible state;
old-engine destruction, metadata admission and legacy migration are not strict1ms operations.
Compaction temporarily requires another decoded model and another durable checkpoint payload.
Wasm high-water memory can persist; retry receipt metadata grows with lifetime saves. A128-batch
threshold triggers maintenance; it is not a hard tail bound under sustained input or failed
maintenance. Local browser storage remains origin-specific and is not an external backup.

## Delivery

Draft PR28 remains stacked on SAVE06/PR27; no merge authorized. Keep65363 and all existing
previews unchanged. Candidate checks use frozen65370. Separate actual-app preview65371 combines
the SAVE07 changes with the latest pen/UI fixes solely for review; those unrelated changes are
not included in PR28. Exact measurements and generated artifacts remain in ignored .build-cache.
Independent source/design and test reviews found no remaining blockers after fixes. Root and
scoped type/lint/format, generated boundaries/SQL, Rust/Wasm and web builds pass. Final evidence
is in save07-{maintenance,capacity,autosave-passive,epoch,v2-admission,corruption,document}-final
and save07-perf-checked-{final,baseline}. Current streaming, chunks, migration and gallery-route
runners pass. The pre-gallery SAVE05 runner still targets the removed preview-new route and is
not current acceptance evidence; current gallery/pen recovery runners cover the actual app.
No physical Wacom latency measurement or browser shutdown durability guarantee is claimed.
