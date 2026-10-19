# CPU raster feasibility checkpoint

P05-R05 is an isolated browser-hosted experiment using real Rust geometry and pinned
CanvasKit0.41.1. It is not a production renderer or physical-input performance measurement.
Keep the application previews unchanged. See [task scope](../../tasks/P05-R05.md).

## Verification and evidence

Build the production bindings first with `node scripts/web-memory/build.ts` in a fresh
worktree. The isolated runner is
`node scripts/web-memory/test.ts --fixtures --config playwright.cpu-raster.config.ts`.
It builds the release fixture runtime and serves the isolated fixture on65147 while running.
No unit/developer-tool suite is introduced. Do not point the existing app preview at this build.

Exact source status, bundle/runtime hashes, browser/OS/CPU identity, case reports and comparison
captures belong in ignored `.build-cache/web-memory/cpu-checkpoint`. Reports must distinguish
returned operation time, watchdog elapsed wall time, complete-frame submission and pixel checks.
Headless runs do not establish GPU completion, physical pen latency, thermal stability or full
performance-profile-v1 acceptance. Do not turn a rejected candidate into a green performance claim.

## Interpretation

- CPU whole-surface versus tiled output must match exactly under frozen format/mapping settings.
- CPU/GPU differences are a separate finding; no tolerance relaxation or owner acceptance follows.
- MakeSurface uses sRGB/RGBA8888/Unpremul; account for current GPU Premul storage and conversion.
- A128px tile bounds pixel storage only. Concentrated long paths can still be expensive, and
  whole-frame work repeats across tiles. Include path construction and export/copy/submission.
- Begin with small/thin cases, then the65,537-sample concentrated case early. Stop on a decisive
  failure. Report later cases as unrun rather than inferring their results.
- Returned synchronous units above8ms or complete cold work above500ms reject the candidate.
  These maximum guards do not certify the stricter p95 profile or the4ms target.
- A5-second nonreturning-stage watchdog contains the experiment. Its elapsed wall time is not
  an exact draw duration. No candidate image means no pixel verdict.
- Do not substitute lower resolution, smaller tiles, masks, PathOps, contour reduction or a
  new renderer after failure. Return results for the owner's next decision.

Current execution and review disposition: pending; maintained task records the final finding.
