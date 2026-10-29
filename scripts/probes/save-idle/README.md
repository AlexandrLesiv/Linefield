# SAVE-04 — isolated bounded saving and exit checkpoint

Build the default-off `save-idle` Rust feature to an ignored target directory; never replace app
Wasm or preview assets. Run from repository root, after the pinned SAVE-02 SQLite acquisition:

```
LINEFIELD_PERFORMANCE=1 LINEFIELD_LARGE=1 node scripts/probes/save-idle/run.ts
```

Requires installed Chrome and Playwright; LINEFIELD_PLAYWRIGHT_ROOT may select its package.json.
LINEFIELD_CHECKPOINT_WASM defaults to .build-cache/save04-rust-target/wasm32-unknown-unknown/
vector-editor/vector_core.wasm. LINEFIELD_EVIDENCE_DIR selects ignored JSON output. No existing
preview origin, user database or user input is accessed. Reports bind all probe/Rust/Wasm hashes.

## What is implemented

Rust freezes completed N by moving ownership, prepares at most64 source records per step, reads
at most65,520 encoded bytes per call, acknowledges without destroying the batch, and retires
bounded source/point blocks. See ../save-batch/IDLE.md for invariants and experimental APIs.

The host fixture targets1ms work slices using16-unit Rust calls, at most64 calls per task and
input-pending checks where available. Encoding transfers up to256 pieces /262,080 bytes per
message with one request outstanding. Assembly and hashing run in the storage worker. Idle
callbacks have a50ms fallback; manual/exit flush wakes idle waits and yields via timers instead.
Oldest-pending batching requests a save after1second; completion is not promised within1second.
Per-revision waiters resolve after their durable revision's cleanup, independently of later saves.
There are at most64 distinct waiting target revisions. Worker staging retains the prior48MiB
checkpoint bound; this is not production memory budgeting or streaming SQLite blob storage.

Controlled exit blocks new gestures, accepts the remainder of an existing stroke, then freezes
and flushes its completed target. Explicit gesture cancellation settles the wait; it does not
create a completed stroke. Failure leaves the session open for retry. Cancelling exit fences
late completion; terminal close cannot reopen input. These are fixture policies, not changes to
the product's established input adapter. Production must reuse that adapter and its release fixes.

Hidden-page flushing is best-effort. beforeunload requests a browser warning while completed
work or active input remains unsaved. Actual browser page termination is tested before/after
COMMIT: reopening must yield the previous/new complete drawing. Crashes, OS termination,
power loss and browser suspension cannot guarantee saving unfinished work on exit.

## Evidence lanes and limits

- Browser/Wasm boundary checks: byte equivalence, stale tokens, N+1, busy retirement and actual
  last-owner destruction (a million-sample source), not just reference decrementing.
- Actual SQLite worker cases: exit in each phase, lost reply, precommit loss, injected storage
  error and exact-source retry; reload raw projection equality. Injection is not real disk quota.
- Sustained350-stroke input tests oldest-pending autosave; per-target waiting is tested with a
  later transaction paused. Real Chrome unload warning dismissal is separate from forced close.
- Three baseline/bounded pairs use identical1k-stroke fixtures and80 alternating mouse/pen
  strokes each. Storage startup occurs before observation. Coordinates, pressure and order of
  all240 samples are checked after timing. The canvas is a simple Canvas2D input fixture, not
  Linefield's full WebGL renderer. Event timers are synthetic input, not physical Wacom latency.
- Three100k-source pairs use fresh browser contexts, the same feature binary, legacy/bounded
  preparation and retirement. Additional long-source cases measure last-reference cleanup.
  They use synthetic acknowledgements to isolate CPU work, not durable-save benchmarks.

Raw samples accompany summaries. Median uses the middle pair; p95 uses nearest rank. Report
maximum Rust call, whole task and final deallocation separately. Logical budgets and timer hints
are not hard real-time deadlines. Wasm linear memory is not process RSS. Source fixture creation
and storage startup are separately reported; neither is hidden as an idle-saving speedup.

Production gates remain: full Rust receipt authority, overflow recovery, app paper/grid and pixel
roundtrips, production database validation beyond the1MiB fixture admission guard, quotas,
power-loss/writer retirement and native lifecycle evidence. No Save UI or production saving is enabled.
