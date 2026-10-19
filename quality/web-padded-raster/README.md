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

## Current finding

Gate 1 rejects the candidate; Gate 2 remains unrun. No halo passed the frozen corpus.
This is a successful bounded investigation with a failed acceptance test, not a green
renderer acceptance or a large-stroke performance result.

| Padding | First decisive small-view result | Differing pixels | Maximum channel delta |
| --- | --- | --- | --- |
| 0, legacy | Original 256-sample control mismatch | 24 | 33/255 |
| 0, viewport clip | Same mismatch; clipping alone does not fix it | 24 | 33/255 |
| 1 | Original control mismatch | 3 | 8/255 |
| 2 | Original control mismatch | 3 | 2/255 |
| 4 | Original control mismatch | 3 | 3/255 |
| 8 | Six cases match, then thin diagonal mismatches | 192 | 48/255 |

The large-view zero controls also reproduce 24 differing pixels with maximum delta 33.
Exactly 14 rows executed: four zero controls plus ten padded rows. Each candidate stopped
at its first mismatch; do not claim all 32 case/viewport pairs were exercised per halo.
At padding 8, the six matching small cases are control-256, coincident-integer,
coincident-half, internal-vertical-edge, internal-horizontal-edge and thin-horizontal.
The thin-diagonal failure has 576 differing RGB channels; only 33 of its 192 differing
pixels are within 8px of tile boundaries. Cause remains unresolved. Repeated CPU whole
renders and submitted candidate bitmap readbacks match exactly on all executed rows.

Separate GPU correctness finding: control-256-small-h8 has CPU whole/candidate ink counts
69/69 and GPU count 0. CPU/GPU difference is 207 channels, maximum 255. Do not describe
this as harmless antialiasing variance or attribute prior user stroke losses to it without
a dedicated check. GPU comparison is distinct from the failed CPU tile/whole gate.

## Evidence identity and acceptance

Tested clean source: `d61863f50f6d1d080b9efeeb4de61bf5a9de150a`, 2026-10-19.
Host: Apple M2 Pro, Darwin 27.0.0 arm64; headless Chromium 155.0.8059.80 at 1280×900;
Node v24.12.0; Rust 1.99.0; wasm-bindgen 0.2.129; CanvasKit 0.41.1.
Display refresh, power and thermal conditions were not measured. No physical-input,
native-host, performance deadline or broad product E2E claim follows.

Generated evidence root: `.build-cache/web-memory/padded-checkpoint`.
`results.json` discovers one test, `WMP-R06 frozen padded-tile correctness selection`,
which fails with `No approved halo passed the frozen correctness corpus`.
The artifact directory contains `identity.json` (source, catalogue and asset hashes),
`selection.json`, 14 case records and whole/raw/submitted/GPU images. Keep these generated
files ignored; preserve them locally for review instead of copying them into source.

| Acceptance | Disposition |
| --- | --- |
| WMP-R06-01 controls/classification | Executed; original mismatch reproduced at both sizes; stable CPU reference |
| WMP-R06-02 halo corpus/publication | Candidate rejected; all executed bitmap submissions exact; later pairs unrun |
| WMP-R06-03 large cold/warm/evicted work | Unrun because Gate 1 failed |
| WMP-R06-04 continuation/queue | Unrun because Gate 1 failed |
| WMP-R06-05 failure/isolation | Fail-fast selection executed; production isolation checked; allocation/crash injection unrun |

Strict root/web types, lint, formatting, source-size/generated-resource checks, production
and fixture release Wasm builds, fixture Vite build and production Vite build passed.
The browser experiment failed its unchanged acceptance assertion as described above.
Production manifest has no fixture entry. Production app SHA256
`448ff09a7f3737a91ecfa063ba917624113246eba8359b33ab319d2ef99239cf` and render-worker SHA256
`88a9645703e40d2b535422cd56cb68b40e1011575bee9f505fb71a111635be3f` match the parent build.
Existing previews were not rebuilt, restarted or navigated.

Independent review confirms valid Gate 1 rejection and no remaining source blocker.
Designer review inspected six original comparison images and confirms uneven thin-diagonal
coverage plus the separate blank GPU control. Both support a rejected-checkpoint handoff,
with Gate 2 unrun and no production adoption. Reviews do not imply owner acceptance.
