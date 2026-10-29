# SAVE-07 — bounded durable checkpoints and capacity scaling

Owner approved capacity work after SAVE-06 gallery/reload on2026-10-30. Not yet implemented.
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
