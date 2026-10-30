# IMG-03 — safe image asset cleanup and encoded-size checkpoint

Owner approved2026-10-30: implement safe unused-image cleanup, then test32MiB encoded files;
preserve all data and drawing performance, run checks/reviews, open a separate preview,
keep65424 unchanged and do not merge. Branch codex/img03-image-cleanup stacks on IMG-02
commitd57a145 / PR37. No pixel/GPU/concurrency increase is authorized or implied.

## Ownership and safety contract

Rust owns canonical reachability, history/retirement policy and checked generated cleanup/schema
contracts. Storage host executes small transactional batches in the existing worker, coordinated
with saves/imports and the document's exclusive lock. Hosts own scheduling, asset leases and
resource transfer; they must not infer reachability from visibility or duplicate document state.

Protect assets needed by live objects, Undo/Redo, pending saves, retained durable checkpoints and
replay journals, active import publication and export snapshots. Recheck generations/revisions
before deletion. Cancelled staging and obsolete durable assets are eligible only after proof that
no protected owner can refer to them. Keep raw strokes and original retained image bytes exact.
Cleanup must be resumable after interruption and cannot make an already acknowledged save invalid.
Do not prune undo or reuse/remap object IDs merely to gain capacity. Metadata retirement must
respect stable identity and every retained reference. No foreground full-database VACUUM.

First finish cleanup correctness/recovery checkpoint at16MiB. Only then compare32MiB encoded
admission against baseline with unchanged16,777,216pixels/128MiBtextures/one importjob.
Adopt32MiB only with measured acceptable responsiveness and successful recovery; otherwise retain
16MiB and report the failed evidence. Keep measurements separate from actual GPU speedup claims.

## Acceptance

IMG-GC-01: cancelled/failed imports reclaim only unreferenced staged assets; deduplicated assets
and repeated publication/cancellation races never delete another object's original.
IMG-GC-02: deletion/Undo/Redo, branch changes, pending saves/exports, checkpoint rollover and
reopen preserve all necessary originals and exact rendering; obsolete assets eventually reclaim.
IMG-GC-03: interruption/retry/stale generation/quota failure preserve acknowledged saves;
maintenance work and queues remain bounded and drawing takes priority.
IMG-CAP-32: encoded limit boundary, malformed/oversized originals, decodedpixel rejection,
exact original-byte persistence, SVG export and capacity failure recovery.
IMG-PERF-03: matched mouse/pen input during cleanup/import and warmed rendering; all samples,
frame/dispatch/main-stall, import readiness, storage verification and memory estimates reported.
Physical Wacom validation is distinct from injected pointer-event checks.

Use E2E behavioral tests, static/build/generated-boundary checks, independent technical review
and UI review where user-visible changes occur. Keep results and captures in ignored
.build-cache/img03. Record completed/remaining work truthfully; leave PR unmerged.

## Frozen shared cleanup interface

Image slots are never reused/remapped. Metadata format v3 adds tag8 plus a u32 slot index for
retired image tombstones; readers retain v1/v2 support. `image_count` includes tombstones,
`image_exists`/`image_read` reject them, and `image_restore_asset` returns3 to skip a retired slot.

`image_cleanup_step(cursor,budget)` visits at most64 slots and returns the next cursor, or
u32::MAX while blocked/invalid. Eligible metadata is either an invisible creation whose Redo
branch was abandoned (earlier Undo cannot reference that identity), or an invisible image with
both history stacks empty after restore. Layer-hidden and zero-opacity objects remain live.
Retirement is an internal durable-journal operation, not an added user Undo operation. Retained
SVG jobs, save preparation/cleanup, replay and active gestures conservatively block retirement.

`image_cleanup_revision()` yields u64::MAX unless the current revision is durable and the same
retention/interaction gates are clear. A yielded revision is only a fence, not deletion authority:
the worker must verify the same document/grant/HEAD, complete a validated checkpoint and remove
older recovery journal roots before deleting obsolete originals. Unknown/corrupt state retains assets.

Storage schema v5 adds durable stage/published/export leases and proof-scoped asset roots. Stage
and asset insertion are atomic even for deduplicated originals. Publication leases remain until
validated roots contain that digest; export uses a global lease. Candidate selection and deletion
both exclude current proof roots and matching/global leases. Delete at most one asset per bounded
transaction; root/lease cleanup batches are limited to32. Original-file limits remain16MiB until
the cleanup checkpoint passes and the separate32MiB comparison is measured.

Publication leases carry the canonical publication revision. After an exact durable proof, only
same-grant published leases at or before that proof revision may be settled; a newly published
post-proof image must remain protected. Stage/export leases are not cleared by that rule.
Wasm exposes the blocked u64::MAX revision sentinel as signed JavaScript `-1n`.

An exact revision-zero HEAD with a validated empty recovery manifest has no journal roots and
needs no synthetic checkpoint. Existing leases still protect assets. Old-grant export leases are
not automatically released: an interrupted export can conservatively retain originals until an
explicit safe release; a lost writer grant alone is not proof that an export reader terminated.
The sweep uses an indexed digest cursor, visiting one asset row per step even when protected;
conditional deletion repeats the root/lease exclusions, and every proof/lease mutation resets
or invalidates the applicable cursor.

## 32MiB candidate after cleanup checkpoint

The cleanup core and actual storage/app checkpoint passed before raising encoded admission.
The32MiB candidate keeps the16,777,216pixel and128MiBvisible-texture budgets unchanged.
Schema6 adds `image_assets_large` for originals strictly above16MiB and at most32MiB; the
original <=16MiB table and bytes remain untouched. Upgrade is additive/transactional, with no
original-byte copy or full-database rewrite. Shared reads/status/sweep include both partitions
and reject duplicate digest rows instead of choosing one. Both conditional deletes retain the
same proof/lease fences. Final adoption remains tied to measured actual-app responsiveness and
recovery results, not merely successful boundary admission.

## Acceptance evidence and operating limits

Adopt the 32 MiB encoded-file limit with the existing 16,777,216 decoded-pixel,
128 MiB visible-texture and single-import-job limits. Larger encoded originals do
not increase texture resolution or change shaders, antialiasing or blending.
Cleanup is automatic during idle time. Undo/Redo references, hidden layers,
zero-opacity images, active imports and exports remain protected. Retired slots
are never reused; the existing 10,000 lifetime image-slot limit remains.

Reproducible checks live in `apps/web/tests/image-cleanup-app.mjs`,
`image-cleanup-storage.mjs`, `image-cleanup-upgrade.mjs`, `image-capacity-app.mjs`,
`vector-img03-cleanup.mjs`, `vector-img03-capacity.mjs` and the existing image
integration/regression runners. Evidence is local under `.build-cache/img03`.
Shared boundary checks passed 161 assertions. Actual-app checks verify Undo/Redo,
retirement/reload, exact original-byte hashes and embedded SVG images. Schema5
upgrade preserves a saved 16 MiB original byte-for-byte; crashed staging is
reclaimed only after verified recovery. Admission accepts exactly 32 MiB and
rejects 32 MiB plus one byte without publishing an image.

Matched performance checkpoint: Apple M2 Pro (12 cores), 16 GB RAM, macOS 27.0.1,
Chrome 156.0.8078.79, 1280×900 CSS viewport, DPR2. Three trials per size each run
baseline, importing and warmed drawing, with pen/mouse events and 241 samples
per stroke. The 4096×4096 PNG has identical pixels across variants; valid ancillary
padding isolates encoded storage/transfer cost. This is not a broad photo-format
benchmark or physical Wacom latency measurement. All 18 strokes and their saved
reloads matched exactly; frame median 16.7 ms, p99/max 16.8 ms, no observed
50 ms main-thread stalls. No GPU speedup is claimed.

| Measurement | 16 MiB | 32 MiB |
| --- | --- | --- |
| Import readiness, median (range) | 3275 ms (3247–3354) | 4422 ms (4345–4550) |
| Input dispatch delay maximum during import | 3.2 ms | 1.8 ms |
| Metadata save/verification, median (range) | 334 ms (302–397) | 757 ms (712–796) |

Readiness includes test-file delivery and deliberately waiting for active drawing
to finish. Small dispatch differences are noise, not evidence of improvement.
Larger originals increase worker IO, hashing and temporary encoded-buffer memory;
there is no zero-cost or device-independent memory guarantee. A 16 MP RGBA decode
is 64 MiB and its complete mip chain is about 85.3 MiB, unchanged by encoded size.
Original buffers may coexist during verification; measured frame timing is not a
peak-process-memory measurement. Cleanup frees reusable database pages, but does
not promise immediate filesystem shrinkage: no foreground VACUUM is introduced.
An interrupted export may conservatively retain assets until a safe explicit
release can be proven. These cases favour data preservation over reclamation.
A committed stage whose response is lost can likewise remain pinned for the
current writer session; a fresh session and verified recovery reclaim it. Do not
claim immediate reclamation after every same-session worker failure.

Final storage checks reclaimed three 32 MiB test originals (96 MiB of logical
payload) while retaining protected/deduplicated assets. Drawing during queued
cleanup preserved 241/241 pen samples and prior raw data; frame p99/max 16.8 ms,
maximum dispatch delay 1.7 ms, no observed 50 ms long tasks. Ordinary checkpoint
maintenance correctly handed off to asset proof/cleanup. Injected pre-stage quota
failure and post-DELETE failure preserved saved originals; rollback, worker
restart and retry completed safely. These are injected failures, not a physical
disk-full test. Independent technical/design review found no remaining blockers
after commit-only accounting and localized 32 MiB help corrections.

New frozen preview: `http://127.0.0.1:65428/`. Existing 65424 remains byte-for-byte
unchanged (44 frozen files). No merge is authorized or performed.
