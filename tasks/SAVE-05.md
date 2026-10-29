# SAVE-05 — full-app saving integration

Status: internal checks complete; owner/manual Wacom review pending. Owner authorized full-app integration, responsiveness/recovery checks and
separate Wacom preview on2026-10-29 after SAVE-04 results. Do not merge. Branch
codex/save05-app-integration stacks on SAVE-04 commit4510bac (PR25). Existing previews are frozen.

## Scope and ownership

Integrate the transferred-buffer bounded Rust saving pipeline into the actual WebGL editor.
Preserve rendering and pointer-release behavior, every accepted raw sample, brushes, layers,
transforms and Slice. Restore completed drawing plus paper/grid before accepting new edits.
Rust owns capture, revisions, receipt validation and canonical reload. Browser owns idle/task
scheduling, worker/storage APIs, lifecycle signals and localized status. No native/cloud/export.
Single local saved drawing initially; do not imply a production gallery or cross-device backup.
Parent owns app lifecycle/UI and E2E evidence; Rust specialist owns engine/boundary; storage
writer owns saving adapter/worker. Independent reviewer challenges design and final implementation.

## Security and design

Sensitive persistence boundary: browser origin storage is untrusted on reopen. Preserve unknown,
corrupt or inaccessible files; never silently replace with blank. Validate versions/lengths,
regional arithmetic and receipt identity; keep exclusive writer ownership until actual release.
Use the reviewed SAVE-01–04 transferred-buffer and bounded preparation design, adapting checked
app boundaries. No generic SQL or fault-injection messages in shipping worker. Separate origin
for manual preview prevents access to earlier preview drawings. Quota/storage failure preserves
memory and shows unsaved state with retry. Browser termination remains best-effort.

## Acceptance

- Full-app draw/save/reload exact raw data and image parity for three brushes, pressure/opacity,
  layers, transforms, Slice, paper/grid, Undo/Redo completed edits and active-gesture exclusion.
- Synthetic mouse/pen input while saving: no sample loss; paired responsiveness measurements
  distinguish event timings, render time and save completion from physical Wacom latency.
- Controlled Back waits for active gesture and durable target; saving failure stays open with retry.
- Actual close/reopen before/after commit; worker loss, duplicate/stale receipt, unavailable writer,
  storage rejection and corrupt/newer data retain complete prior revision and honest status.
- Static/build/boundary checks and independent/design review. Open new frozen actual-app preview;
  preserve all prior servers/assets. Physical Wacom remains owner manual acceptance.


## Implemented and bounded

Actual editor startup validates and replays saved batches before handlers/rendering are installed.
One local drawing lives in this preview origin's OPFS SQLite SAH pool. This is not a saved gallery,
export, cloud backup or native implementation. A real per-origin Web Lock fences the writer;
existing metadata is inspected before SQLite initialization, with unknown/corrupt state refused.
Worker commands are allowlisted and contain no generic SQL or test fault endpoint.

The Rust save-app boundary generates and validates complete request/receipt identity and body
hashes. SHA-256 preparation is incremental; raw legacy acknowledgement exports refuse under
save-app. Paper/grid are Rust document settings with history/replay. Renderer and input sampling
algorithms are unchanged. Bounded transferred buffers and idle tasks run between input work.
Controlled Back waits for the current gesture and latest completed durable revision, rechecking
late edits; Stay cancels navigation without cancelling accepted input. Browser hide requests a
best-effort flush; unload warns while work is unsaved. Forced termination cannot guarantee save.

Persistent localized status distinguishes saved, pending, saving, failure/capacity and competing
writer states. Retry after editing preserves the session; startup Retry can reload because no
input has been admitted. New preview labels identify the single local drawing. Existing previews
including65349 and first saving preview65351 are unchanged; final frozen preview is65352.

Limits are explicit failures, never truncation:48 MiB journal,10,000 batches,128 MiB inspected
pool,100,000 source/record slots and1,000,000 retained source samples. No journal compaction or
full-snapshot recovery from sticky capture overflow yet. Failure leaves drawing in memory, so
Retry cannot cure a permanent capacity limit. Session Undo/Redo is not persisted; reload restores
the completed document with a new history session. Browser clearing/eviction can remove local
storage. Admission covers this app-owned namespace, not arbitrary hostile SQLite imports.

## Validation results

Chrome156.0.8078.48, Apple M2 Pro,16 GiB RAM; full-app paired input workload1200×1000CSS,DPR2.
Three baseline/three concurrent-saving runs,1,000 initial strokes and80 alternating synthetic
mouse/pen strokes per run: all240 accepted samples per run retain exact positions/order.
Input scheduling-delay p95 was1.1–1.2 ms baseline vs1.0–1.2 ms saving; maximum2.5 vs1.9 ms.
rAF maxima16.8 ms in both lanes; render p950.3–0.5 vs0.3 ms. These short runs
show no material regression in this workload, not a universal latency guarantee. Per-call save
metrics are a bounded2048-entry tail, not complete end-to-end save/GPU measurements. Physical
Wacom, screen readers, other browsers and low-end/mobile systems remain manual/future evidence.

Passed7 app save/reload/failure/navigation cases,6 all-brush transform/Slice/hidden-layer
roundtrips,25 receipt/settings authority cases and9 app recovery cases. Exact canonical and
canvas-image comparisons pass; setup uses real Rust app APIs, not physical pointer events.
Recovery includes1,241,088-byte saved drawing reopen, corrupt flags/digest byte preservation,
worker termination after actual row/head mutation before COMMIT (fresh-reader rollback verified
before retry) and after COMMIT, exact retained retry, actual page close/reopen before/after COMMIT,
Stay fencing and Back catching a late mutation. Negative seal/reseal/commit test leaves revision0
and zero rows after digest mismatch. All22 mouse/pen release-order recovery cases and all120
approved brush/render/edit acceptance checks pass, with the existing max1 antialiasing tolerance
unchanged. Eight EN/UK narrow/desktop light/dark design combinations plus final narrow labels/
capacity and keyboard tests preserve canvas bounds and accessible cancellation.

Evidence: `.build-cache/save05-final/{app,edits,release,acceptance,recovery-strong,performance-isolated}/`,
`.build-cache/save05-{authority,negative,design}/`. Earlier timing runs are retained separately;
the isolated final timing run had no overlapping checks/browser work. Final manifest binds
sources, app assets and these reports. Results are ignored local artifacts, not checked-in logs.
Default118/idle149 exports and baseline fingerprint are unchanged; save-app160 exports adds11
and checks37 generated saving signatures plus separate fingerprint. Static types, lint,
formatting, source-size checks and Rust/Wasm/app builds pass. Scoped authored Rust formatting passes; workspace-wide
`cargo fmt --all --check` still reports existing camera/Slice/generated formatting drift, left
untouched rather than formatting the inherited renderer. One unchanged SAVE01 HTML fixture
was formatting-normalized so the required root formatting check passes; no behavioral change.

## Review disposition and remaining work

Independent review closed poisoned-seal/commit validation and late-edit exit findings; Rust
receipt/hash/bypass checks also passed independently. Designer closed keyboard cancellation and
stale Saved announcement findings. Owner review is still required; no merge authorized.
Remaining: owner Wacom confirmation, broader workloads/platform durability, compaction and
capacity recovery, full saved-gallery/product file workflows, native adapters. Do not represent
browser-local saved status as external backup or guaranteed save after process/power loss.
