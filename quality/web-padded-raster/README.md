# Padded CPU raster checkpoint

See [P05-R06](../../tasks/P05-R06.md) for the approved two-gate scope. This is an isolated
browser experiment consuming real Rust geometry, not a production renderer or physical-input
latency benchmark. Keep previews65142/65145 unchanged.

In a fresh worktree first build production bindings with `node scripts/web-memory/build.ts`.
Run `node scripts/web-memory/test.ts --fixtures --config playwright.padded.config.ts`.
The runner builds fixture release assets and uses its own temporary preview on65148.
Generated identities, reports and comparison images belong in ignored
`.build-cache/web-memory/padded-checkpoint`; current task and this guide are maintained source.

## Interpretation rules

- Confirm the zero-padding failure and reference repeatability before attributing changes to padding.
- Keep original R05 zero-padding and new zero-padding-plus-viewport-clip controls distinct.
- Original whole-viewport CPU pixels are the exact oracle, including outermost rows/columns.
- Test only1/2/4/8px halos. A mismatch rejects that halo; advance within this approved search.
- Select the smallest halo passing the complete frozen corpus at both viewport sizes. Do not
  select on one example, remove edge pixels or replace the reference with padded output.
- No passing halo means no performance run. A passing halo stays fixed during performance.
- Actual submitted bitmap pixels must equal the candidate, independently of CPU/GPU comparisons.
- Small scratch dimensions bound pixel storage, not contour traversal or continuous worker work.
- Include geometry/copy/build/crop/bitmap costs; a returned draw duration alone is not input latency.
- Later continuation must append to the same Rust stroke; queue evidence needs an actual accepted
  next stroke and its complete preview submission. A ping/fresh longer fixture is insufficient.
- Keep zero controls, failures and unavailable evidence. Watchdog elapsed time is not exact
  raster time. No headless synthetic result certifies physical pen latency or universal bounds.

Execution result and review disposition: pending.
