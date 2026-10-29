# SAVE-04 — bounded idle preparation, retirement and exit flushing

Status: isolated checkpoint complete; production adoption awaits owner review. Owner authorized isolated implementation and responsiveness/recovery
results before production saving on2026-10-29, then explicitly included exit flushing.
Branch codex/save04-idle-checkpoint; frozen base7f7acf535f53300890c8d7dcecebe85655783b5e
(PR24, unmerged). Preserve all existing previews and production assets. Do not merge.

## Scope and ownership

Rust owns immutable completed-revision capture, bounded preparation/encoding/retirement state
and receipt-qualified durability. The browser checkpoint schedules short tasks, prioritizes input,
transfers disposable buffers and runs isolated storage/recovery experiments. No whole354ms
preparation or162ms destruction call may simply be hidden inside an idle callback.
One Rust writer owns engine/APIs and Rust probes; lead owns host scheduler/exit tests and docs.
Independent review covers scheduling, lifetimes, failure and evidence. No visible product change.

Idle scheduling is opportunistic, with bounded progress when the page remains busy; it must not
starve saving indefinitely. A one-second batching target is not a disk-completion guarantee.
Manual/exit flush bypasses deliberate idle delays while continuing to yield between bounded steps.
Each target is a completed revision; active strokes remain excluded. Do not drop accepted input.

Controlled exit/navigation waits for a confirmed target revision, with failure retaining the
session for retry. Browser hide requests an urgent flush; tab close/reload requests an unsaved-
changes warning where supported. Browser/OS termination, crash or power loss cannot guarantee
completion. Test these distinctions instead of promising asynchronous saving after termination.

## Checkpoint acceptance

SAVE-IDLE-01: compare blocking baseline and bounded steps on equivalent large fixtures; include
capture, encoding, submission and retirement costs, worst steps, input delays and save progress.
SAVE-IDLE-02: continuous mouse/pen event streams remain intact during saving; report synthetic
browser evidence separately from physical device latency and full application rendering.
SAVE-EXIT-01: controlled exit during prepare/transfer/commit/retirement waits for durable target;
newer edits cannot be marked saved by an older receipt; failure prevents exit and allows retry.
SAVE-EXIT-02: hide/close/reload and forced termination never manufacture success; reopened state
must be a complete committed revision, with explicit possible loss of uncommitted work.
SAVE-IDLE-RECOVERY: stale receipts, worker death, failed transport/storage and resumed scheduling
preserve canonical input and permit safe retry/reconciliation without unbounded queues.
Traceability: CT-03/04/05/08, INV-01/03/06/07. Isolated checks do not complete native/UI acceptance.

## Security and limits

Default-off experimental Rust feature and loopback fixture only. No production SQLite schema,
headers, native lifecycle or Save UI adoption. Bound retained builders/retirement queues, work
units and memory. Count resource destruction as work, including last-reference sample ownership.
CPU budgets are targets, not hard real-time guarantees. Timer throttling/background suspension
can delay progress. Pending work is not durable merely because payload ownership was released.
Keep previous storage/pixel/overflow/native limitations explicit; results remain in ignored cache.

## Result and evidence

Implemented default-off `save-idle`, a yielding browser scheduler, bounded transferred staging,
revision-specific flush completion and controlled-exit/retry handling. Rust freezes ownership in
constant work, prepares descriptors incrementally and retires source references and last-owner
point blocks separately. The host uses 16-unit calls and a 1 ms scheduling target, not a hard
execution bound. One builder, one retirement slot, one outstanding transfer and 64 distinct
flush targets bound concurrency. Worker staging remains capped at 48 MiB.

Final evidence: `.build-cache/save04-final/report.json` and `exports.json`. Chrome156.0.8078.48,
Apple M2 Pro,16 GiB RAM,1200×800 CSS viewport,DPR2. Three paired100,000-source runs:

| Measured operation | Legacy checkpoint | Bounded checkpoint |
| --- | --- | --- |
| Initial freeze/prepare call |263.57–557.30 ms|0.100–0.145 ms freeze; preparation split|
| Acknowledgement call |120.14–207.93 ms|0.090–0.100 ms|
| Longest measured work task |263.68–557.87 ms|1.83–2.61 ms|
| Measured work-window elapsed |387.89–777.68 ms|126.27–297.06 ms|

These large measurements use synthetic acknowledgement and exclude fixture construction;
they are CPU/lifetime measurements, not disk durability or end-to-end save time. The fixture
already occupies about1.02 GiB Wasm memory. Bounded capture adds1.56 MiB versus15.56 MiB legacy;
this is linear memory growth, not process/GPU memory. A separate million-sample last-owner case
retired in68 bounded cleanup calls: maximum0.050 ms, final allocator release0.035 ms. Allocator
calls remain non-preemptible; larger workloads and other hardware may exceed observed limits.

Three paired synthetic input runs used identical1,000-stroke drawings and80 alternating
mouse/pen strokes each. All240 samples per run retained coordinates, pressure and ordering.
Input-delay p95 was0.560–0.675 ms baseline and0.570–0.685 ms bounded; maximum0.760 versus1.025 ms.
Observed rAF maximum was16.67 ms in both lanes; maximum host preparation task0.675 ms.
These short Canvas2D fixture runs do not establish physical Wacom or full WebGL app latency.

Passed22 host checks,22 Rust-boundary checks,20 lifecycle checks and3 real browser termination
cases. A350-stroke continuous-input case made autosave progress without waiting for silence.
Controlled exits during preparation, transfer, commit and cleanup waited for their revision;
storage failure stayed open, precommit worker loss retried, and lost postcommit replies reconciled.
Actual page close before COMMIT reopened revision1; after COMMIT reopened revision2 with exact
saved drawing data. Chrome displayed an unsaved-work warning, and dismissing it kept the page open.
No mechanism can promise completion after browser/OS kill or power loss.

Recovery regression passed25 browser-storage assertions; storage regression passed10, under
`.build-cache/save04-recovery-regression/` and `.build-cache/save04-storage-regression/`.
Default118 and incremental139 export sets remain unchanged; idle adds10 gated exports.
Independent review verified55 final source/report hashes and resolved its staging and waiter
findings. Static/build and final documentation checks accompany the draft PR; no merge approved.

## Remaining production gates

Return results before enabling saving. Full receipt identity/body validation still belongs in
shared Rust (the checkpoint adapter currently validates it); integrate with the actual input
adapter and tested release behavior. Complete overflow recovery, paper/grid/pixel reload parity,
production database size/quota policies (the existing guard is1 MiB), proven writer retirement,
whole-app responsiveness and native lifecycle checks. Worker assembly still builds an aggregate
buffer and SQLite blob; this is not final streaming storage. Existing previews remain unchanged.
