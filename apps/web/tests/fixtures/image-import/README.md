# Image import checkpoint

Isolated IMG-01 E2E investigation, not a product route. No document/asset schema or image
editing/persistence is enabled. See tasks/IMG-01.md. Default linear sampling is retained to
reproduce the rejected minification result; the explicit mipmap variant is the recommendation,
not an already-adopted production feature. Existing drawing shaders are imported unchanged.

Build with Vite using this directory's vite.config.ts, then copy the resulting ignored output
to a fresh frozen directory and serve on an unused localhost port. Do not replace user previews.
`probe.js` is also a stable module entry that installs window.imageProbe without inserting DOM.
For actual-app responsiveness, copy an existing frozen app into a new ignored directory and
place the fixture output under image-import/. Import the module into the real editor iframe;
a second tab/worker alone does not measure competition on its UI thread.

Maintained browser runners in apps/web/tests:
- image-import-checkpoint.mjs: LINEFIELD_IMAGE_URL and LINEFIELD_IMAGE_OUT.
- image-import-budget.mjs: final exact mip bytes and recovery admission witness.
- image-import-orientation.mjs: LINEFIELD_IMAGE_URL and LINEFIELD_EVIDENCE_DIR.
- image-import-minify.mjs and image-import-mipmap.mjs: inspect their environment options
  before running; use distinct evidence paths for linear and mipmap variants.
- image-import-responsiveness.mjs: LINEFIELD_PREVIEW_URL, LINEFIELD_EVIDENCE_DIR,
  LINEFIELD_IMAGE_SIZE, optional LINEFIELD_IMAGE_SAMPLING, LINEFIELD_IMAGE_PAIRS and
  LINEFIELD_IMAGE_MODES. Counterbalance lanes; retain cold results/outliers.

Only one GPU measurement runner at a time. Generated input is synthetic; never use user images
or modify their drawings. Readback belongs to quality tests, not responsiveness measurements.
Report upload/mipmap API submission separately from GPU execution (not measured here). Decode
in the main realm is asynchronous too. Deferred upload delays readiness intentionally; it is
not faster decoding. Physical pen latency and real production multi-gesture gating are untested.

Fixtures retain decoded bitmaps for an independent Canvas2D reference. PNG/JPEG/WebP headers
are bounded admission checks, not a full secure codec validator. Exact mip-level bytes determine
texture admission; logical memory excludes transient/browser/driver allocations. Rust owns any
future image identity/order/history/save semantics. A host-only overlay is not integration.

Keep raw measurements, images, frozen builds and manifests under ignored .build-cache/img01.
Static checks: strict fixture tsconfig (included separately in web typecheck), scoped lint/format,
and <=200-line authored modules. No product or reference source changes are required.
