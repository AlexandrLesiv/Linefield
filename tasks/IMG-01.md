# IMG-01 — image import fidelity and performance checkpoint

Owner approved checkpoint only on 2026-10-30. Product integration requires results and
subsequent approval. Branch codex/img01-import-checkpoint stacks on SVG-02 7c3cb75 / PR35.
Preserve all current previews, source drawing behavior and accepted input. Do not merge.

## Scope

Isolated PNG, JPEG and static WebP import: worker versus main-thread decode, disposable
ImageBitmap transfer, WebGL upload and rendering. Verify transparency, ordered composition,
transforms, orientation/color handling where evidence exists; explicitly report untested
profiles and formats. Measure decode, transfer, upload submission, first correct image,
main-thread stalls, paired drawing responsiveness and estimated decoded/GPU memory separately.
GPU submission timing is not GPU execution timing. No capacity claims from compressed bytes
alone. Establish bounded jobs and explicit rejection/cancel/retry behavior.

Rust remains authoritative for future object identity, regional transforms, ordered document
content, history, save schema and asset references. Hosts decode and render disposable image
resources. This checkpoint does not add image objects or mutate production documents/schema.

## Acceptance

Reproducible browser E2E comparisons at Retina resolution, transparent/opaque images,
rotation/zoom, interleaved translucent strokes, cold/warm and repeated imports, malformed
inputs, cancellation and safe resource rejection. Paired actual-app drawing checks retain
all accepted samples and verify saving. Report measured hardware/browser/DPR/workload and
limits versus estimates, including any blocked checks. Static/build checks and independent
architecture/design review. Evidence under ignored .build-cache/img01.

## Proposed follow-on architecture (not implemented by this checkpoint)

Separate immutable encoded assets from placed image objects. Rust owns typed object/asset
references, regional anchors and similarity transforms, opacity, layer membership and mixed
stroke/image paint order. Keep existing stroke IDs, source data and Slice-group order stable.
A host overlay is insufficient because it would bypass save, history and export membership.
Host decoders produce disposable resources; no per-frame image copies cross the Rust boundary.

Stage and verify asset bytes before publishing one AddImage history command. A Saved receipt
must cover complete asset content and the referencing document revision. Failure before object
publication leaves an orphan staging asset, not a broken saved drawing. Undo/redo, pending
imports and durable replay reachability must participate in asset cleanup; append-only history
can still need an asset removed from the current view. Geometry edits save metadata only.
The versioned save/object format and deterministic migration require product-stage review.

Preserve original encoded bytes. Color/orientation normalization, display assets, rectangle
selection, initial layer placement, image exclusion from Slice and SVG embedding must be
approved alongside integration. This checkpoint cannot certify native codec parity or asset
storage recovery before those paths exist. Validate the integrated SAVE07 base rather than
assuming the SVG task branch contains every independently stacked saving change.

## Checkpoint conclusion

Completed isolated E2E measurements and independent review. Recommend worker decode plus
input-aware scheduling of upload/first presentation and budgeted mipmaps. Reject plain linear
sampling for strong minification: visible aliasing is a correctness failure, not edge AA noise.
The initial measured desktop envelope is16MiB encoded/16,777,216 decoded pixels, device texture
limits, one job and128MiB retained texture budget using exact mip-level sums. Bitmap+texture
logical residency is bounded separately from transient/browser/driver overhead. This is not an
unlimited capacity, hostile-decoder memory guarantee or native/mobile certification.

Five paired16MP mipmap drawing trials preserved all241 samples and saving: worst dispatch was
4.1ms baseline,58.5ms immediate worker upload/presentation,3.7ms when gated after the stroke.
A prior300ms cold upload outlier remains documented despite five non-reproducing fresh-process
follow-ups.32 EXIF cases pass exactly; mipmaps eliminate tested minified checker interior error,
while gradient interior differences reach2/255 and silhouette AA differences reach64/255.
No exact pixel parity claim. Final recovery/admission checks pass, including cancel/retry and
worker/context failure. Raw evidence and a detailed report are under .build-cache/img01/results.md.

Product integration remains unapproved and unimplemented: image asset durability, mixed object
history/order, regional editing, SVG membership, color-profile policy and repeated-gesture
upload rechecks need the subsequent integration task. All existing previews remain unchanged.
