# Isolated web repaint feasibility

P05-R01 investigates disposable CanvasKit PathOps unions using unchanged Rust-generated
viewport geometry. The normal application and preview servers are not changed.

From this worktree root, build release fixture assets with:

`node scripts/web-memory/test.ts --fixtures --config playwright.repaint.config.ts`

The existing runner builds fixture assets as documented in scripts/web-memory/build.ts; a fresh checkout first runs
`node scripts/web-memory/build.ts` for production declarations used by TypeScript.
The dedicated Playwright configuration starts its own headless Chrome and preview on port 65146,
with one worker, no retries and output under ignored .build-cache/web-memory/repaint-checkpoint.
It does not reuse ports 65142/65143/65145. Run static checks separately with pnpm check and
apps/web lint/format:check; normal production build remains pnpm web:build.

Current acceptance outcome: **rejected**. The first 256-coincident-sample case does not complete
its first Union(empty, grouped path) before the 5-second inactivity watchdog. The runner exits
nonzero and does not run the remaining matrix. Do not invert the assertion to make this pass.
This known-failing experiment is opt-in; it is not primary-application E2E or a unit/tool suite.

## Reading evidence

- identity.json records source state, every built asset hash, Wasm/tool versions and host/browser.
- Per-case JSON records copied geometry counts, reference repeatability, candidate stages and
  available timing. The last progress stage identifies where progress stopped.
- Watchdog elapsed wall time includes scheduling/message delivery. It is not an exact CPU/GPU
  operation duration. A timeout without a candidate yields no candidate pixel verdict.
- Candidate preparation is separate from reference construction; cold candidate timing includes
  preparation. Full geometry scans are allowed here and reported separately from Boolean work.
- Complete candidates compare exact RGBA channels on the same surface/backend. Partial/stopped
  candidates do not receive a parity verdict. No tolerance or quality reduction is introduced.
- Control-point path bounds only skip definitely disjoint halo regions. These are disposable
  projected renderer bounds, not new canonical coordinate/editing policy.
- Power/thermal/display conditions and physical pen latency are unmeasured. Small headless
  observations can reject this candidate, never establish profile-v1 p95 or primary-app acceptance.

See tasks/P05-R01.md for contract/invariant mappings, review disposition and unrun cases.
Any smaller grouping, alternate ordering or raster mechanism is a revised investigation;
this failure does not authorize R02 or an automatic renderer fallback.
