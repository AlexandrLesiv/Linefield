# M03 retained geometry and disposal contract

Decision243 delegates this scoped refinement to the lead. Shared-engine and independent
review informed the policy below. Implementation and evidence remain part of P05-M03;
the current visibility checkpoint does not claim these mechanisms are implemented.
MIG-C1 numerical/source authority, existing resource ceilings and failure behavior remain.

## Detail and actual reuse

Rust continues to validate source identity, revision, minimum detail, coverage and placement.
The host retains sufficient detail and owns its disposable cache. Refine the requested
power-of-two zoom/backing bucket immediately. Lower the future requested bucket only after
250ms without an accepted mapping change. Pan/rotation restart the deadline; ordinary content
updates, rejected/no-op navigation and rendering do not. Metrics/context replacement resets
the policy. One lifecycle-fenced timer schedules one ordinary render, without polling RAF,
holding a GPU slot, waiting on input or touching a poisoned/disposed editor.

A settled lower request does not require rebuilding an already exact image or discarding
sufficient finer geometry. Among validated alternatives choose the smallest sufficient detail,
then the most recently used at equal detail. The next genuine miss prepares at the lowered
request. Captured builds retain their chosen detail; existing live coverage and its stable/tail
frontiers do not restart merely because this timer expires.

Touch recency only when a retained reader is consumed or a GPU allocation is actually used.
CPU entries and GPU allocations use actual eligible LRU order, without per-page sorted copies.
Preserve the synchronous reader-start/pin invariant or reserve the hit until generator start;
unstarted/cancelled readers must release any reservation exactly once. Complete unclipped
entries already release their preparation ticket and use token0; this is not new source
authority. Do not retain empty token0 entries. Clipped entries retain checked coverage tokens.

## Captured-pass protection and complete streaming

Before constructing FrameCommands, acquire one CPU/GPU residency token for the exact cache
and renderer instances. An existing active token cannot be superseded. Roll back CPU acquisition
if GPU acquisition fails. Each owner captures its admission serial; residents present at that
cutoff remain protected from capacity eviction throughout the pass. Newly admitted/used pages
remain protected until that exact pass closes, beyond an individual arena-frame use mark.
Capacity misses stream through existing bounded queues.
Stale identity invalidation still removes lookup eligibility and respects outstanding leases.

This deliberately protects later-needed warm pages during a forward scan. Merely protecting
the current frame or eight lookahead readers is insufficient. An extension has its own token,
but it does not prove which older residents were unused by the whole scene. Store scalar serials
on entries, never references to a growing archive of pass objects. Safe-integer exhaustion
disables disposable retention until the owner drains/recreates; it never wraps or loses input.

The constructor and all acquisition paths belong inside the outer try/finally. Stop the producer,
await FrameCommands disposal and all queued leases/readers, then close both tokens in nested
finally blocks by exact object identity. Closing is idempotent and cannot clear a successor's
token. Same-object builds stay busy through this cleanup. A stopped old object cannot schedule
new work or change its replacement. No poisoned Wasm export is allowed during retirement.

Only a validated, still-relevant full build earns idle admission credit, after cleanup succeeds.
Recheck relevance, abort and owner lifetime after the awaited cleanup; a return value computed
before finally is insufficient. Failed, cancelled, stale, stopped, extension-only and constructor-
failed passes earn no credit. These host tokens grant no document or source authority.

## Bounded adaptation after a pass

Record capacity-refused, otherwise retainable work as scalar demand. Never queue missed pages,
source IDs or a canonical visibility prepass. Cap CPU credit at128 pages,3,145,728 payload bytes
and eight clipped tickets; cap GPU credit at128 allocations and4,194,304 allocated bytes.
These are empty-space goals within existing budgets, not additional allocations. An oversized
or otherwise nonretainable chunk earns no credit that could flush useful residents.

After a successful full pass, one idle task may retire oldest eligible residents unused by that
pass until usable free capacity meets its actual capped demand or no eligible resident remains.
Protect its hit working set, pins, reservations and borrowed pages. Count existing free space;
do not retire token0 entries solely to free clipped tickets. GPU fragmentation still uses the
existing bounded compaction/stream fallback; total free bytes do not prove a contiguous fit.

Each turn spends at most2ms and128 metadata/page-release transitions, then yields an actual task
if needed. Count skipped/ineligible/pinned inspections and each page/ticket release too. One
finite traversal of existing LRU order ends if no eligible resident remains; no sorted resident
copy, restarting search or idle polling loop hides extra work. A moved entry is not one transition
if releasing it performs many page operations. Lifecycle clearStore disposal must likewise drain
through bounded ownership or be measured separately; it inherits no idle-time performance pass.
Starting a new build revokes pending idle credit and protects remaining residents immediately.
Already retired storage still drains in bounded turns and remains charged. No new stroke or
candidate waits for optional warming. A full offscreen cache can adapt over subsequent real
passes; a working set larger than cache streams without evicting its own later-needed pages.

## Resource accounting and disposal generations

Keep8MiB resident preparation payload,3072 resident page descriptors,128 pending pages,
192 retained clipped tickets,256 Rust tickets,4096 GPU allocations, the existing eight-reader
and32-command/1MiB queues, two GPU fences,256KiB stream reservation and aggregate GPU ceiling.
CPU admission includes pending, retiring and borrowed-retired ownership exactly once. A category
transfer is not reclamation. Bounded transient working owners remain visible separately; do not
claim the resident8MiB limit describes all host geometry memory.

Production drains preparation readers for the current visibility reply before replacing that
reply. Keep the existing cumulative producer budgets, painter order and complete cancellation
drain. Cross-reply lookahead is not an adopted optimization; see the M04 task disposition.

Move at most one evicted CPU entry, without copying its pages array, into a retirement cursor.
Drain it under the idle transition budget; borrowed pages transfer to their existing retirement
owner until final release. The clipped ticket counts until successfully released. Do not select
another whole entry while the cursor is occupied. Preserve explicit typed failure/recovery if
even bounded transient descriptor capacity cannot be obtained.

GPU range eviction changes live/free capacity, not allocated GPU bytes. Slabs and retiring
generations remain charged until safe completion/context loss. Compaction keeps its eight-move
bound and updates actual allocation objects; no deferred draw may retain an unprotected stale
offset. This refinement introduces no extra target, fence, GPU topology or command protocol.

Additional metadata stays bounded by existing entry/allocation counts: per-entry admission/use
serials and LRU linkage, one token/credit per owner, one CPU cursor and one scheduled callback.
Report counts and an explicitly labeled host-overhead estimate separately from exact typed-array
payload. Validate the estimate against the target browser's heap evidence; do not claim portable
exact JavaScript Map/object bytes or report the additional metadata as zero. Empty entries and
closed tokens cannot keep a hidden archive alive.

Renderer replacement must retain one old scene's CPU cleanup/accounting record alongside the
existing single GPU retirement gate. Register exact old-owner references and resource getter
before any dispose/export can throw or the current reference is dropped. Cover partial construction
where the renderer exists but scene/cache creation fails. If retirement registration fails, retain
the original owner and closed admission; never drop its charge. Repeated disposal is idempotent.
Do not allocate another
renderer/cache generation until both old CPU ownership and GPU retirement drain. This gate is
for resource replacement, not ordinary End→next-stroke admission.

GPU context loss or fence completion does not imply CPU cleanup is settled. A rejected cleanup
promise does not imply zero bytes: finally must drain known host queues/arrays and retain any
uncertain ownership explicitly. Terminal cleanup releases host resources without Wasm re-entry.
CPU settlement wakes admission once; do not spin RAF while waiting only for CPU cleanup. An old
completion cannot clear another generation, reset its counters or schedule its renderer. Keep
the existing explicit failure/Retry/Back behavior if completion cannot be established safely.

## Evidence and diagnostics

MIG-WORKER-02 covers immediate refinement, delayed lowering, timer restart and smaller future
misses with sufficient-finer hits. MIG-WORKER-04 covers actual LRU victim order, fullA→B-only
streaming, late warmA reuse, successful idle adaptation, nonretainable demand and CPU/GPU pressure
independently. MIG-WORKER-18 preserves exact page reuse and zero uploads where residency remains.

MIG-WORKER-15/27/28 cover cancellation at worker/queue/slot/final-validation waits, interrupted
idle retirement, no extension/cancel credit and a successor protected from an old finalizer.
MIG-WORKER-05/16/24 cover positively held old CPU cleanup during replacement, context loss/fatal
variants, single-generation bounds, honest aggregate charges and fresh exact recovery.
Fixtures proving allocation/lifetime order are not natural performance or physical input evidence.

Count actual consumed prepared requests, one hit or miss per consumed request, finer-hit subset,
pages/bytes really yielded from hits, pressure versus stale retirement, and retained versus
stream uploads. Coverage-probe failures are not request misses. Never-consumed readers are
cancellations, not misses. Remove verified dead completed-reader and immediate-hit counters;
development mode shows unavailable until meaningful instrumentation exists. No per-sample logs.

The narrow placement/coverage query change is specified separately in MIG-C1. Contiguous page
draw merging is inapplicable to the current power-of-two padded24-byte capsule allocations and
individually certified page placements. Do not introduce a new GPU layout merely to claim that
optimization. M04 sparse work remains separately scoped. Measure frozen actual allocated memory,
cold/warm work, exact completion and callback/frame cost before claiming equivalent benefit.
