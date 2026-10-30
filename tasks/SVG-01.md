# SVG-01 — appearance-preserving hybrid SVG checkpoint

Owner approved the isolated fidelity/performance checkpoint on 2026-10-30.
No product export UI, SVG-02 integration, merge or release is authorized.
Base: INPUT04 71afd6b. Branch codex/svg01-checkpoint. All existing previews are frozen.
Autonomous window ends 2026-10-30 07:28:53 UTC; continuation every ten minutes.

## Contract

CT-02/03/04/05/06/07: Rust owns completed revision snapshot, regional arithmetic,
geometry and source blending semantics. Host owns execution, raster backend,
PNG encoding and destination. No live document/cache/renderer mutation for export.
Use current approved renderer/materials as reference, no discarded migration code.
SVG contains ordered vector Ink plus embedded lossless raster material groups.
Preserve Slice source/basis/offset blending groups and distinct translucent strokes.
Vector silhouettes apply opacity once to coverage union. Where fidelity fails,
measure complete-group raster fallback; never silently change appearance.

Options under checkpoint: visible artwork including locked layers; upright document
coordinates; complete brush bounds plus16-unit margin; current paper/white/transparent;
grid opt-in; raster density1/2/4 pixels per drawing unit (default2). Empty fallback
1920x1080. Active gestures reject capture, no automatic commit/cancel. Exports capture
completed unsaved edits without advancing durable revision; later edits excluded.
Transparency without grid means no background; transparent plus grid means grid only.
Fully zero-opacity artwork does not enlarge visible bounds. Test this explicitly.

## Bounded experiments

1. Exact shader reference versus vector Ink and hybrid export in independent SVG consumers.
2. Pencil raster group fidelity, world texture phase/filtering and padded tile seams,
   including fractional transforms and output scales.
3. Coherent Rust snapshot, regional bounds and bounded disposable buffer transfer.
4. Worker rendering/encoding and responsiveness under active mouse/pen input; warm/cold
   export times, median/tail frame and input dispatch times, long tasks and memory.
5. Cancellation, stale jobs, context/worker failure, preflight/runtime overflow and cleanup.

Provisional limits: one job; two pending transfer chunks;1024-square nominal tiles with
filter-derived gutters;128MiB scratch;64million cumulative raster pixels;128MiB SVG.
Account snapshot retention/output/base64 separately. Never claim scratch as total memory.
Pause between bounded GPU batches during input; no synchronous live framebuffer readback.
Reject unsupported raster capability explicitly. Pure-vector mode may work without GPU.

## Acceptance and evidence

SVG01-A: no missing raw content or document/history/save mutation.
SVG01-B: preserve painter order, opacity, variable width, transforms and Slice groups.
SVG01-C: quantify AA differences separately from grain/seams/blend errors; no weakened gate.
SVG01-D: camera/DPR-independent export at explicit resolution, regional precision and bounds.
SVG01-E: bounded transfer/allocations and cancellation/failure isolation.
SVG01-F: compare input responsiveness during/without export on reproducible workloads.

Use browser E2E fixtures and static/build checks, independent source/design review.
Retain generated measurements/captures in ignored .build-cache/svg01; never commit private
user drawings/logs. Label injected input versus physical Wacom evidence honestly.
Return measured adopted/rejected/blocked results before product implementation approval.

## Checkpoint decision and remaining gates

This is an isolated experiment, not product acceptance. Rust bounded revision capture,
regional packets and retirement are implemented behind `svg-checkpoint`; the default
application has no export entry point. Host fixture serialization is exploratory only.

| Variant | Checkpoint decision | Evidence and limitation |
| --- | --- | --- |
| Vector Ink silhouettes | Await appearance decision | Differences are confined to measured AA edge band, but reach51/255; no tolerance silently accepted. |
| Cropped padded raster tiles | Reject | Fractional transforms introduce seams; independent Chrome/WebKit comparison. |
| Nested SVG padded clipping | Reject | Still produces seams, up to65 channel difference. |
| One lossless PNG per coverage group | Promising bounded fallback | Selected-resolution corpus differs at most2; actual-app witness19 pixels at1/255. Arbitrary transformed overlaps can differ by6; not resolution-independent vector fidelity. |
| Paper/grid reuse | Supported opaque combinations | Six modes exact at density2, including large regional texture phase. Transparent grid is explicitly unsupported by current opaque background shader. |
| Bounded Rust snapshot + worker rendering | Checkpoint supported | Raw data, revision/history/durability preserved; cancellation and failure isolated. Product scheduling/streaming still required. |

Whole-group output rasterizes Ink as well as pencils; it must not be presented as a fully
editable vector export. Hybrid Ink needs explicit AA acceptance before adoption. Options
above remain proposals; margin, empty-page sizing and final option orchestration are not
implemented. Transparent-plus-grid currently rejects rather than silently adding paper.

Actual fixture limits differ from the proposed production pipeline: one job,16MiB derived
corpus assembly,128MiB scratch accounting,64million cumulative raster pixels and128MiB
SVG string admission. There is no two-chunk backpressure pipeline or input-priority GPU
scheduler yet. Host strings/base64, worker copies, Wasm and GPU memory are separate costs;
logical retained source bytes and managed heap are not total process memory.

Before SVG-02: shared Rust final silhouette/serialization, bounded streaming PNG/output,
backpressure, input-prioritized scheduling, explicit unsupported options, graceful memory
failure and output-size/timeout stress, broader image/feature matrix and physical Wacom
checks. Active camera/lasso rejection belongs in the host adapter. No product UI or merge.

## Reproducible evidence

Ignored evidence root `.build-cache/svg01/` contains build hashes, platform, raw timings and
images. `snapshot-results.json` and settings checks cover coherent capture/empty settings;
`corpus/` covers overlap, subpixel strokes, Slice, transforms and large regional origins;
`consumers*` distinguishes tile seams from independent-consumer resampling;
`primary-witness-matched/` compares the actual app at its matching0.125 geometry tolerance;
`ink-edges/` separates vector AA from interior coverage errors; `background/` checks phase.
`same-owner-warm-results.json` records five paired warm-app runs with10,000 source samples,
21 groups/10,043 capsules after warmup, and481 accepted input samples per measured stroke.
The isolated app uses the same editor event loop and canonical engine for capture/drawing;
its test-only feature build is never served on the owner's frozen preview.

Platform: Apple M2 Pro(12CPU/19GPU),16GiB, macOS27.0.1; Chrome156.0.8078.79,
1280x900 viewport,DPR2. Actual WebGL renderer is ANGLE Metal Renderer Apple M2 Pro.
Independent SVG consumers are Chrome and Playwright WebKit, not a Safari certification.
Synthetic pen/mouse dispatch is not physical input-to-photon measurement. GPU timings
are not reported: worker elapsed time includes CPU, GPU submission/readback and encoding.
Original cold-app baseline contained a235ms startup stall and is retained separately;
it is excluded from matched warm claims, not credited as an export improvement.

The pre-context-guard warm run measured frame median16.7/p9916.8ms both modes; dispatch
p993.1ms baseline versus3.0ms export, maximum4.8/5.3ms, zero tasks>=50ms. Cold-worker export
was774ms; warm587–612ms, including408–414ms yielding capture and178–197ms worker time.
These figures apply to the hashed measured build; final guarded build is measured separately.
Each job produced1,188,732 SVG bytes;803,440 derived bytes transferred,401,240 logical source
bytes retained,1,900,544 Wasm bytes. Peak managed heap39,659,224 baseline/41,962,152 export
includes drawing and GC variability; it does not establish total export memory or a leak.

Recovery found and fixed a real blank-success bug: losing the WebGL context immediately
before final-group readback returned a successful SVG with0 covered pixels versus14,550
in the reference. Health checks now run after readback/encoding and before publication.
Real WEBGL_lose_context injection at draw, before readback and after readback rejects all
three jobs; the next job and a worker reset both reproduce the original SVG exactly.
Nine other recovery/preflight cases and frozen empty-document settings checks pass.
This does not prove graceful Rust allocator exhaustion or browser-wide GPU pressure.

Final guarded build repeats the60-case corpus with identical image metrics/byte counts.
Its five warm-app baseline/export pairs preserve all481 samples and settled saving each
run. Frame median16.7/p9916.8ms remains unchanged, no tasks>=50ms. Pooled dispatch p99 is
2.9ms baseline/3.0ms export, but maximum rises4.6ms to22.2ms in one export-overlap run
(overlap p9918.6ms). This latency tail is retained and is a product scheduling gate, not
hidden by the pooled result. Cold-worker total786.7ms; warm568.3–603.4ms, including
399.7–412ms yielding capture and155.2–199.7ms worker work. Longest geometry call0.7ms.
Independent source/design review finds no blocker to reporting the isolated experiment,
but explicitly does not accept product fidelity, memory scaling or input latency.

A second identical guarded five-pair run also preserves every sample/save and frame
p9916.8ms, with no>=50ms task. The22.2ms outlier does not recur: baseline max4.5ms,
export max7.8ms; per-run export p992.8–3.4ms. Cold-worker total769.1ms, warm586.4–599.5ms.
Keep both final reports (`same-owner-final-results.json` and
`same-owner-final-repeat-results.json`); no zero-impact claim follows from this repeat.

Status: checkpoint complete with measured rejections and unresolved product gates.
Owner approval is required before SVG-02 integration. No existing preview was changed.
