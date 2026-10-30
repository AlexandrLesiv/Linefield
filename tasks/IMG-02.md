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
Place upright at view center, preserve aspect, fit within80percent of view without changing
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
files, streaming metadata updates without rewriting pixel bytes, failure-safe orphan cleanup.
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
