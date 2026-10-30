# SVG-02 — appearance-preserving SVG product integration

Owner authorized autonomous continuation through completed SVG export on 2026-10-30,
after SVG-01 results, with ten-minute continuation for five hours ending20:19:25UTC.
This supersedes SVG-01's checkpoint-only stop. No merge/release. All existing previews
remain immutable; open a separate frozen actual-app preview for usable integration.
Branch codex/svg02-export-integration stacks on SVG-01 c1f6df4 / PR34.

## Scope and implementation decisions

Shared Rust owns coherent completed revision capture, bounds/region arithmetic, ordered
coverage-group semantics and final SVG structure/serialization. Host owns input/idle
scheduling, isolated GPU shader execution, PNG encoding, resource admission and download.
Raw input, document/history/save state must remain unchanged by export. Capture includes
completed unsaved edits; later edits excluded. Reject export while an active gesture owns
input, then permit normal drawing while background work proceeds.

Default appearance mode uses lossless raster fallback at explicit output density where
native SVG cannot match existing coverage. It may rasterize Ink too and must disclose
embedded raster content; do not describe this as fully editable resolution-independent
vectors. Do not enable rejected cropped/padded SVG tile paths. Independent scaled overlap
resampling differences remain documented; preserve selected-resolution appearance.
Do not silently enable unapproved vector-edge AA changes. Keep normal drawing shaders,
material values/filtering and quality untouched.

Options: visible artwork including locked layers, exclude hidden/zero-opacity; upright
world orientation independent of camera; full brush bounds with16-unit margin; current
paper/white/transparent; grid optional only where supported, explicit density1/2/4
(default2). Empty1920x1080 world units. Transparent grid must be explicitly unsupported
until a faithful separate grid path is verified. Never silently crop, downsample or drop
input to fit resource limits.

One export job, bounded transfers/backpressure, cancellation, stale-message validation,
input-priority yields and measured memory admission. Streaming must account for retained
snapshot, derived geometry, raster/PNG/output memory independently. Worker/context loss,
resource overflow, timeout and download errors must fail clearly and permit retry.
No final success or download until complete validated output; never blank/partial success.

## Acceptance

Actual-app E2E download/open SVG, empty document, all brush/material/background modes,
ordered overlap, layers, transforms/Slice, opacity, regional precision, camera independence,
raw/history/save invariance; recovery/cancel/worker/context loss and resource limits.
Repeat paired drawing/export responsiveness with exact accepted samples and saving.
Compare final SVG to current renderer at matched geometry/detail/density, separate AA,
material/blend/seam errors. No universal physicalWacom claim from synthetic tests.
Static/build/checked boundaries, designer and independent reviews. Keep evidence ignored
under .build-cache/svg02. Report remaining limitations truthfully; don't merge.

## Delivered behavior and resource policy

Export SVG is available in drawing Settings with background, density and optional grid.
Preparation is cancellable and nonmodal; the completed result offers an explicit Download
SVG link. All brushes currently use embedded lossless PNG coverage groups, preserving
ordered blending; this is not editable vector-path export. Rust seals a coherent snapshot,
measures outward pixel-aligned bounds, streams geometry and validates PNG framing/CRC
before emitting SVG. The worker uses the unchanged drawing shaders/materials.

The initial policy admits at most 100,000 visible snapshot entries, 128 MiB retained raw
snapshot data, 64 million output pixels, estimated 256 MiB raster scratch and 128 MiB
serialized output. Device texture limits can reject earlier. Rejection is explicit with no
partial download, crop or quality reduction. Transfers contain at most 1,024 capsules;
GPU submissions yield between 64-capsule batches. PNG pulls are at most 49,152 bytes.
Input pauses further preparation; an already-running GPU/PNG operation cannot be preempted.

## Verification and remaining limits

Actual-app checks cover download/decode, raw data/history/save/reload invariance, empty
exports, all brushes, paper/grids, Slice/transforms, regional coordinates, layers, camera
independence, cancellation, worker/context failure and oversize recovery. The independent
matrix covers 24 exports and 48 white/black image comparisons, with maximum channel
error 2/255. Direct primary-renderer comparisons differed by at most 1/255. Five paired
synthetic mouse/pen drawing runs retained every 481 accepted samples per stroke: frame
p99 was 16.8 ms in both baseline and export, with no 50 ms long tasks; maximum dispatch
was 5.2 ms baseline and 5.1 ms during export. Export elapsed about 4.95 seconds including
the 3.84-second gesture and intentional input pause. These are workload-specific results,
not physical Wacom latency or universal performance guarantees.

Static types (editor, web and separately scoped fixture), localization, generated ABI,
scoped lint/format and production Wasm/app build pass. Independent source and responsive
UI design review completed; owner acceptance and merge remain separate. Native host
cargo check succeeds with unused Wasm-only export warnings. Injected page lifecycle
recovery passed; real browser BFCache behavior is not certified by that test.

Raw reproducible evidence is ignored under .build-cache/svg02; test sources are maintained
in apps/web/tests/vector-svg02-*.mjs. Final frozen actual-app preview is port 65403,
composed with SAVE08 93f4e07 and latest INPUT04; the task branch remains stacked on PR34.
Existing previews, including 65382, retain their original assets. Arbitrary SVG rescaling
can introduce raster resampling differences; transparent background with grid is explicitly
unsupported. Browser worker/WebGL support and explicit resource limits remain required.
