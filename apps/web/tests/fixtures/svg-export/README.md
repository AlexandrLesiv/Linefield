# SVG checkpoint fixture

Experimental E2E fixture, never a product route. See `tasks/SVG-01.md` and the Rust
`svg_checkpoint/README.md` for scope and ownership. `hybrid`, cropped `raster`, nested
`padded` and `whole` modes exist to reproduce adoption/rejection evidence; they are not
shipping alternatives. Do not interpret a completed test as final appearance approval.

Build vector-engine for wasm32-unknown-unknown with `--features svg-checkpoint` into an
isolated target directory; copy its vector_core.wasm to the fixture output as core.wasm.
Build with Vite using this directory's vite.config.ts and a new ignored output directory.
Serve that immutable output on an unused localhost port. Never reuse an owner preview.
For settings-probe.mjs also supply the same feature build as core-v2.wasm.

Browser runners accept LINEFIELD_SVG_URL for the fixture and LINEFIELD_EVIDENCE_DIR for
images; snapshot/settings runners use LINEFIELD_PREVIEW_URL. Read each runner's output
environment variable before execution to avoid overwriting an earlier evidence set.
Run corpus, consumers, ink-edges and background-probe independently. Independent-consumer
comparisons include resampling a flattened reference; native placement and transformed
compositing results must be reported separately. The primary witness must match the
actual app's geometry-detail tolerance before interpreting antialiasing differences.

The same-owner responsiveness runner requires a separate frozen actual-app build whose
engine includes svg-checkpoint, plus this fixture's hashed assets. LINEFIELD_PREVIEW_URL
points to that app and LINEFIELD_SVG_SCRIPT to its copied module asset. The runner injects
only test APIs into the real editor frame and captures from that same canonical engine.
Warm app startup separately, then perform paired baseline/export runs with identical
visible source data. Retain cold results too. Synthetic pen/mouse dispatch is not physical
Wacom or input-to-photon evidence. Saving must settle and raw samples match after each run.

Recovery runner covers malformed/preflight/cancel/stale/error handling; context-loss runner
uses WEBGL_lose_context at actual render/readback/encoding boundaries and checks that no
blank success escapes. Retry must reproduce the original result. This is distinct from
proving graceful browser-wide GPU exhaustion or Rust allocator failure.

Static checks: isolated tsconfig, scoped oxlint/oxfmt, Rust formatting and
`node scripts/svg-checkpoint-boundary.ts --check`. Keep measurements/images/build hashes
in ignored .build-cache/svg01, not in Git. No product renderer source is modified here.
