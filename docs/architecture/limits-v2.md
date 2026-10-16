# S02 v2 proposed engineering limits
Status: OWNER-APPROVED starting limits (decision 181); provisional macOS developer-preview safety caps, not benchmark results or promises. CT-01–08. They are runtime admission limits, not portable corruption criteria. A structurally valid larger document returns CapacityUnsupported and remains unchanged. No UI settings for tuning limits added.

Reference validation target proposal: Apple Silicon Mac, 8 GiB RAM, 60 Hz display; record actual hardware/build for every future run. Browser/mobile need independently reviewed profiles. All byte limits use MiB=1,048,576 bytes. Charge actual allocations and retained references, not only encoded payload length.

| Resource | Starting proposal | Exhaustion / rationale |
| --- | --- | --- |
| Name | 256 Unicode scalar values, <=1,024 UTF-8 bytes | Reject before rename/create mutation; single line, no NUL, approved Unicode trim |
| Open document | 1,000,000 actual samples; 20,000 strokes; 1 GiB source-file admission | Capacity result, not corruption; hostile files checked before expensive allocation |
| Input batch | 256 actual samples/call | Split native delivery preserving order; no dropped actual samples |
| Unfinished stroke | 65,536 samples; 4 MiB charged preview reserve/client | Reserve before begin; capacity hit cancels whole unfinished interaction with visible reason, never commits truncated stroke |
| Coordinated clients | 8 attached editing/view clients per drawing, including local | Busy/Capacity before attachment; 2 processes first real proof |
| Hosted documents | 4 per process, one visible editor window | Headless coordinators count; refuse new hosting if budget unavailable, no new multiwindow feature |
| Outstanding commands | 256/client, including held dependencies; 16 explicit dependencies/command | Bounded sequence window; independent work cannot skip unresolved replay floor |
| Completed pending work | 32 MiB/client, 128 MiB/process | Reserve room at begin; pause admission before exhaustion, queries/recovery remain usable |
| Undo retained state | 64 MiB/client, 128 MiB/process combined | Eviction of oldest complete history entries is selected by decision 39; never evict pending recovery data |
| Persistent receipts | 4,096 rows/drawing, 8 MiB logical receipt/index charge | Include reserved not-yet-saved rows; pin live unacknowledged; retire only with replay fencing |
| Receipt query / stroke page | 128 outcomes or summaries/call | Capacity response no partial output |
| Sample query | 4,096 samples/call | Stable revision required; no unbounded snapshot lease |
| Projection changes | 4,096 entries and 4 MiB/client | Gap => resync; no silent incomplete scene |
| Effects | 16/client plus 4 reserved recovery/shutdown slots | Coalesce notices; never coalesce away unresolved operation state |
| Completion drain | <=64 entries or 2 ms per main-thread turn | Yield/rearm; each operation itself must be bounded; 2 ms target needs measurement |
| Snapshot/export | 3 accepted/reserved jobs per process (selected); 64 MiB retained source/job and 128 MiB total memory | Reject new reservation before panel if unavailable; immutable sharing charged once physically, all live references counted |
| Job staging disk | 2 GiB per library soft reservation budget; 4 GiB aggregate managed temporary-file admission cap | Reserve across processes under existing library coordinator; protected data may exceed admission cap after failures, never delete it to force compliance |
| WAL | 32 MiB checkpoint trigger; 128 MiB mutation-admission pressure threshold per DB | Account current bytes plus worst-case reserved batch; actual SQLite allocation may exceed threshold, not an OS hard quota |
| SQL write batch | <=64 logical commands, <=4 MiB charged changes; oldest deliberate wait <=1 s (selected) | Earlier flush on size/time/explicit Save; one permitted large operation executes alone with reservation, never split its logical atomicity |
| Busy retry | 25, 50, 100, 200, 400 ms delays, max 1 s per attempt; up to 3 scheduled attempts within 10 s | Background only, jitter optional bounded; exhausted => pending failure + explicit Retry; disk-full/permission/conflict not busy retry |
| Background read | 100 ms cooperative slice; warn at 500 ms pinned snapshot | Safe yield/restart only; retain exact source; no cancellation of durable job semantics |
| Main-thread projection/geometry | 128 MiB process data budget; 64 MiB disposable render cache initially | Evict disposable data first; capacity stops new admission, never artwork |
| IPC envelope | 256 KiB validated typed message, max 32 queued messages/peer and 2 MiB/peer | Split samples/projection with sequence; reserve control lane, peer overload cannot consume global recovery capacity |
| Diagnostics | 4,096 events, 2 MiB queue; 4 x 5 MiB rotated files | Nonblocking sink; respect any stricter existing retention/privacy decision, no per-sample production events |

## Aggregate accounting
Process memory admission ceiling proposal 512 MiB for owned model/pending/history/snapshots/projections/queues; renderer GPU allocation separately 128 MiB starting target. These are accounting ceilings, not total RSS guarantees; framework/Skia/SQLite overhead needs measured headroom. Per-category limits do not each allocate their maximum independently. Sum charged memory across all hosted documents and local/remote clients. Never multiply global limits by number of windows/peers.
Library disk reservation uses the existing short library mutation coordinator and lifecycle/jobs records; no fourth database. Unknown abandoned reservations require guarded reconciliation, not timestamp expiry. Source artwork and protected recovery copies are not disposable cache. When capacity cannot safely be reclaimed, block the operation requiring space. Numeric caps do not grant cleanup consent.
Operation begin reserves bounded unfinished, completion, receipt and pending-work capacity. Receipt exhaustion during a long stroke still cannot lead to silent End loss; reserve before begin and retain reservation through cancel/commit. Oldest whole-operation history retirement is approved (decisions 39/181); unfinished, pending and protected recovery data are not eligible. Native presentation of capacity/history changes still follows the approved feature design.

## Configuration baseline
macOS persistent drawing/catalog/jobs connections: WAL, synchronous=FULL, fullfsync=OFF, checkpoint_fullfsync=OFF; foreign_keys=ON, trusted_schema=OFF, defensive mode, no extension loading, fixed SQL. Drawing auto_vacuum=NONE; propose same initial maintenance policy for catalog/jobs. Verify actual settings on each connection; unknown/mismatched baseline fails initialization with actionable status, never silent weaker fallback.
Disable implicit writer-commit auto-checkpoint only when the bounded storage scheduler has installed explicit checkpoint scheduling. Passive checkpoints under normal load, safe reader yielding at pressure; restart/truncate checkpoint only under coordinated quiescence. SQLite remains journal/recovery owner. Saved follows synchronized commit, not checkpoint.
No vacuum while active drawing authority exists elsewhere. Acquire maintenance ownership, reserve scratch space (proposed up to twice source size plus WAL headroom), validate before/after, release all connections safely. Ordinary in-place SQLite VACUUM is not a semantic document replacement; do not generate new identity merely for compaction. A failure keeps the document protected and reports deferred maintenance.
Browser VFS/journal/flush capabilities remain unproven. Do not mechanically copy native WAL, Unix descriptors or fullfsync requirements into Wasm.

## Validation needed
Measure peak allocations/RSS/GPU, command/input callback duration, save queue age, worst WAL size, reader yield/retry fairness and shutdown duration using deterministic tiny/typical/capacity fixtures. Report p50/p95/p99 and maxima; software intervals are not physical pen-to-screen latency. Bounds must include overflow/off-by-one/cross-process simultaneous-admission cases. Do not loosen limits to obtain green tests without owner review and rationale.
