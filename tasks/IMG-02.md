# IMG-02 — images in the drawing document

Owner approved image import integration, editing, saving and SVG export on2026-10-30,
including IMG-01 recommendations/limits. No merge. Preserve65403 and all previous previews.
Branch codex/img02-image-integration stacks on IMG-01/PR36 and explicitly carries the verified
SAVE08 93f4e07 dependency composition already used by frozen65403. Those dependencies are not
new feature work or an owner merge. Record dependency files in ignored .build-cache/img02.

## Product contract

PNG/JPEG/static WebP import from Settings;16MiB encoded,16,777,216 decoded pixels and device
texture dimension limits; one import job;128MiB retained GPU textures with exact mip accounting.
Worker decode, mipmaps, input-prioritized upload/first presentation; recheck new gestures after
idle waits. Do not silently downsample/crop/drop input. Resource eviction must not delete assets.
Place screen-upright at the latest view center, preserve aspect, fit within80percent of view without enlarging above natural size or changing
original resolution, select after import. Capture target layer/document; reject stale/protected
publication. Rectangular Pick/Lasso bounds; proportional resize/rotation/move/opacity/delete,
layer visibility/locking/order, one Undo per import/gesture. Slice affects strokes only.

Rust owns canonical image objects, regional transforms, mixed paint order, history, revision,
asset references and save/export semantics. Preserve original bytes; host decoders produce
versioned disposable display resources with EXIF orientation and browser-managed color handling.
No claim of certified native/wide-gamut/CMYK parity. Host owns file picker, bounded worker decode,
GPU scheduling, caches, asset IO and download through checked contracts. No host-authoritative
object overlay. Preserve existing stroke rendering/order and caches where images are absent.

Durability: stage complete immutable assets before publishing an image command; Saved receipt
covers referenced verified assets and object metadata. Versioned restore of older stroke-only
files, streaming metadata updates without rewriting pixel bytes, conservative immutable asset retention.
Retain asset reachability for history/replay; no premature deletion. Include images at exact
mixed order in appearance-preserving SVG; keep export snapshot bounded and coherent.

## Coordination and acceptance

One Rust implementation owner covers engine/history/save/export/generated boundaries. One host
implementation owner covers asset IO/worker/GPU adapters. Parent owns integration wiring/UI and
E2E evidence. Coordinate frozen interfaces before dependent edits; independent source/design review.
Actual-app mouse/pen drawing, import/transforms/Undo/Redo/layers/Slice, save/reload/recovery,
SVG fidelity/order, large-image responsiveness, context loss, cancellation/stale jobs and limits.
Check existing stroke-only behaviors, generated boundaries, static/build checks and resource budgets.
Open a new frozen actual-app preview only; do not mutate or merge existing previews/PRs.

## Initial resource and recovery policy

The128MiB limit covers unique textures on all visible nonzero-opacity image objects, not only
the viewport. Import, layer exposure and opacity changes reject before canonical mutation if
that visible set would exceed the limit. Hidden images can remain durable. At most10,000 image
slots bound metadata; removed slots retain identity for history. Identical content shares a texture.
No original image is resized to gain admission. Browser storage quota remains an external limit.

Published and staged immutable assets are retained conservatively, including cancelled imports
after durable staging; automatic orphan/retired-asset reclamation is not implemented in this
version. This avoids deleting history/replay dependencies but can consume browser storage.
Save checkpoints verify original asset hashes; transform saves do not rewrite original bytes,
but verification still reads/hashes referenced assets in the storage worker. Measure that cost.

Normal import prepares the texture before publishing the object. Context restoration or history
that reveals an evicted image keeps the last complete frame while the complete visible set is
rehydrated, with loading/retry feedback. Accepted input remains canonical; presentation waits
until resources are ready. Old-context GPU handles are abandoned after loss, never deleted in
the new context. PNG/JPEG/static WebP decoding remains browser-managed; no mobile/native color
certification is claimed. SVG appearance export rasterizes image-containing groups as needed.

## Acceptance mapping

IMG-APP: actual gallery/file chooser, image admission/selection, opacity/import Undo/Redo, exact
saved metadata reload, mixed Pick/Lasso/move/delete Undo, context restoration and SVG download.
IMG-CORE: checked image ABI, invalid tagged IDs, regional positions beyond2^53, history/resource
rejections, older stroke-only replay, compaction, mixed export order and image Lasso boundaries.
IMG-AA: single-sample framebuffer image filtering, alpha halos and minification comparison.
IMG-PERF: paired mouse/pen adapter input before/during import and warmed rendering; all samples,
frame/dispatch/stalls, metadata save verification and exact reload. Synthetic pen dispatch is
not physical Wacom validation. All generated results/captures remain under ignored .build-cache/img02.

## Implementation status

Implemented and reviewed; not merged. Frozen manual preview65424 includes final narrow-layout
fixes;65403 remains byte-for-byte unchanged.110 Rust/Wasm browser boundary assertions and
actual-app import/edit/reload/mixed-selection/context-recovery/live-pan/SVG-pixel checks pass.
32 single-sample image fidelity cases retain tested minification and transparency behavior.
Three paired16MP input trials preserve every241-sample stroke and exact raw data/reloads;
measured drawing frames max16.8ms, import-lane dispatch max1.9ms, no50ms input stalls. These
are injected mouse/pen adapter measurements, not physical Wacom or end-to-end display latency.
Metadata save with original-asset verification measured92.6–97.5ms in the worker-backed flow.
Final English/Ukrainian wide/narrow design review and cross-owner code reviews pass after fixing
image deletion invalidation, abandoned-context GPU handles, and narrow notification overlap.
