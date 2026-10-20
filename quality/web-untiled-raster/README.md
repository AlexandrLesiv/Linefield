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
| WMP-R07-01 | 32 corpus pairs, known coverage, exact repeat/reference/submission, lifecycle identity | Pending |
| WMP-R07-02 | Four frozen large shapes, cold/warm/evicted, +256 same interaction | Conditional on Gate1 |
| WMP-R07-03 | Accepted EndA/BeginB and complete B preview while A outstanding | Conditional |
| WMP-R07-04 | Undo/Redo membership and held-pan coverage before release | Conditional |
| WMP-R07-05 | Cancellation/remap/stale completion/failure and production isolation | Pending |

CT-02/03/04/06/08; INV-01–04/08/09/11; SU-03/04/13/14/16/20; SEC-02/03/09/13.
Exact revision/build, per-case results, resource counts, static checks, designer review and
independent review will be recorded after execution. A rejected checkpoint is a bounded
investigation outcome, not a passing renderer or completed production performance requirement.
