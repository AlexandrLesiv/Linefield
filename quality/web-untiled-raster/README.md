# Untiled retained-path feasibility checkpoint

[P05-R07](../../tasks/P05-R07.md) records the approved frozen scope and stop rules.
This isolated browser-hosted synthetic experiment tests existing Rust geometry with
CanvasKit0.41.1 whole-surface CPU rendering and current-mapping path reuse. It does not
change the production app, certify physical-input latency or authorize adoption.

## Reproduction

Use the dedicated P05-R07 worktree and pinned repository dependencies. Build production
bindings first because TypeScript declarations resolve there:

```text
node scripts/web-memory/build.ts
node scripts/web-memory/build.ts --fixtures
node scripts/localization.ts
pnpm --filter @linefield/web exec tsc --noEmit
pnpm --filter @linefield/web exec vite build --mode memory-e2e
pnpm --filter @linefield/web exec playwright test --config playwright.untiled.config.ts
```

Dedicated port65149 is reserved for the fixture runner with strict port/no server reuse.
Do not use the default production preview command or existing preview build directories.
Generated evidence belongs in ignored `.build-cache/web-memory/untiled-checkpoint`.
Keep this acceptance guide in source; exclude generated JSON/images/logs.

## Interpretation

- Fresh whole-CPU references must repeat and match retained candidate/submitted pixels exactly.
  Known painted controls prevent blank-equals-blank acceptance. No tolerance changes.
- CPU/GPU differences are diagnostics, not evidence that CPU parity failed or appearance is approved.
- Cache membership follows current Rust queries. Undone retained paths are not visible; mapping
  changes force fresh projection. A final page's zero cursor is a sentinel, not an append position.
- Cold/warm/evicted are distinct resource conditions; reclaimed warm rows must be relabelled.
- Count complete-path snapshot/draw, geometry/query/copy, conversion/transfer/submission and queues.
  Bounded pages do not bound indivisible raster work.
- An operation above8ms or a nonreturning5s stage rejects feasibility; preserve the first failure.
  A watchdog reports elapsed wait/last stage, not a precise duration of the interrupted operation.
- Later gates remain unrun after decisive failure. No retries, alternative renderer, altered
  resolution, larger cache or omitted workload can turn that result into acceptance.
- Raw canonical samples are not exposed by the approved Wasm API. Runtime checks cover input
  sequence/counts, IDs/colors/history and exact projected pages, supplemented by unchanged Rust
  source review. Do not claim direct raw-sample runtime equality.
- Synthetic headless submission timing cannot certify physical Wacom latency, visible FPS,
  power/thermal stability or native-host behavior.

## Acceptance mapping

| ID | Evidence required | Current disposition |
| --- | --- | --- |
| WMP-R07-01 | 32 corpus pairs, known coverage, exact repeat/reference/submission, lifecycle identity | All32 pairs and both lifecycle rows completed; exact CPU parity |
| WMP-R07-02 | Four frozen large shapes, cold/warm/evicted, +256 same interaction | First cold coincident case rejected at129.5ms; remainder unrun |
| WMP-R07-03 | Accepted EndA/BeginB and complete B preview while A outstanding | Unrun/unimplemented after early rejection |
| WMP-R07-04 | Undo/Redo membership and held-pan coverage before release | Small command-driven history assertions passed; held-pan/large-history timing unrun |
| WMP-R07-05 | Cancellation/remap/stale completion/failure and production isolation | Synthetic lifecycle/fault controls and production isolation passed; no native focus claim |

CT-02/03/04/06/08; INV-01–04/08/09/11; SU-03/04/13/14/16/20; SEC-02/03/09/13.
## Observed outcome

The candidate is rejected. Clean executable source:
`c5427c774677c31c51b218d24955ea9c4d48c062`, run2026-10-20.
All16 corpus cases at both sizes and both lifecycle controls completed before performance.
Known ink, independent reference repeatability, same-prefix End, cache eviction, Undo/Redo,
bitmap parity and stale/failure assertions passed in the bounded synthetic corpus.
This is not a universal raster-equivalence proof.

The first Gate2 case has65,537 coincident samples at1024×768. Its full-path draw returned
in **129.5ms**, exceeding the unchanged8ms operation guard. This is a returned measurement,
not an inferred watchdog duration. The driver correctly failed and stopped after35 rows.

| Recorded stage | Observation in that one cold case |
| --- | --- |
| Rust geometry queries/copies | 97 pages;25.6ms total;0.7ms largest page |
| Retained builder page append | 58.8ms total;2.4ms largest page |
| Active path snapshot | 3.1ms |
| Whole-path draw | 129.5ms; decisive rejection |
| Longest recorded uninterrupted worker segment | 133.8ms |
| Worker wall time | 201ms |
| Capture→failed result | 687.2ms partial interval; not complete-frame latency |

The path contains393,222 verbs; copied geometry totals6,160,478 bytes. The worker returned
zero tracked paths/builders/snapshots after failure. CanvasKit heap capacity was128MiB;
that is neither live path storage nor peak system residency, and no total-memory pass is claimed.
The frame was not submitted. Flush/readback/conversion and large reference/parity were not
reached, nor warm/evicted/+256, the other large shapes/viewport, EndA/BeginB, held pan,
history timing or Gate3. No p95 or same-host relative performance claim follows.

The separate GPU256-coincident diagnostic reproduces at both sizes: CPU69 ink pixels,
GPU0;207 differing channels with maximum delta255. Preserve that unexplained discrepancy.
It neither invalidates exact CPU parity nor establishes a safe GPU visual oracle.

## Evidence, checks and review

Environment: Apple M2 Pro; Darwin27.0.0 arm64; headless Chrome155.0.8059.80 at1280×900;
Node24.12.0; Rust1.99.0; wasm-bindgen0.2.129; CanvasKit0.41.1.
Display refresh, power and thermal conditions were unmeasured.
`identity.json` records clean source, fixture assets, fixed generator/catalogue and runtime hashes.
Fixture Wasm SHA256:
`65cef60924060c9689fc77f7ac6491918dd39dafe677c93b00a2fe27c52bc883`.

Generated evidence root: `.build-cache/web-memory/untiled-checkpoint`.
One discovered test, `WMP-R07 retained whole CPU correctness then early falsification`,
fails at the unchanged performance assertion. `sequence.json` lists34 completed correctness/
lifecycle rows and one failed cold-performance row. Per-case JSON and PNGs are retained locally.
Do not commit generated reports or reinterpret the failing renderer assertion as green acceptance.

The initial57aba0a run is preserved at `.build-cache/web-memory/untiled-run-57aba0a`.
It stopped on invalid large-fixture metrics, not renderer failure:4096×2048 with backing1.25
exceeded the existing8M-pixel limit. The one-line correction uses half logical dimensions with
backing2, retaining exactly the same allowed backing extent and active-cancel/remap assertions.
The independent reviewer verified that no bound or acceptance test was weakened.

`pnpm check`, complete web formatting, strict types/lint/source-size checks, generated resource
checks, release production/fixture Wasm builds and production/fixture Vite builds passed.
Production manifest contains no fixture. App SHA256
`448ff09a7f3737a91ecfa063ba917624113246eba8359b33ab319d2ef99239cf` and worker SHA256
`88a9645703e40d2b535422cd56cb68b40e1011575bee9f505fb71a111635be3f` match the parent exactly.
Existing preview worktrees, builds and servers were not changed.

Rust specialist source review found no remaining identity/ownership or ABI blocker.
Designer reviewed actual small/large CPU ink controls and the blank GPU diagnostics.
Painter-order pixel assertions passed, but a separate colored-state screenshot is absent;
do not call that a visual approval. Raw samples are not directly observable through this ABI,
and individual cleanup timings are not exhaustive. These limitations prevent broader acceptance
claims; they do not undermine the measured draw rejection.
Independent implementation/evidence review disposition is recorded with the PR.

The checkpoint demonstrates bounded correctness of retained paths, not sufficient performance.
Do not adopt this candidate or infer a warm Undo/pan improvement from unrun rows. Further
representation/raster changes require a new concrete owner-reviewed proposal.
