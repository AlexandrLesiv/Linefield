# Live prototype refinement verification — 2026-10-17

Base fa38072da22015a965da145d6635e4e6da8ba8d7 plus uncommitted sources in source-hashes.json. This evidence supersedes quality/web-prototype for the current code; the earlier evidence remains historical. Chrome 155.0.8059.80 headless on macOS arm64.

## Executed

- pnpm check: strict types, lint, formatting and <=200 physical source-line checks passed.
- pnpm web:test: 18/18 passed, no retries. Existing WEB-G01–G13 now use overflow for web actions; WEB-R01–R05 cover stable ID/catalogue/placeholder parity, native browser gestures, direct Rename source bounds and early Escape, literal names, scrollbar geometry and smaller minmax tiles/dashed creation tile.
- pnpm web:build: passed Vite 8.3.4 production bundle with @vanilla-extract/css 1.21.3 and vite-plugin 5.2.6. Plugin documentation verified against its official Vite integration. Scripts disabled during dependency installation.
- pnpm audit --audit-level high: no known vulnerabilities reported at execution.
- Independent reviewer web_refinement_review: types/lint and 18 tests passed independently, plus overflow/no-overflow threshold geometry, resize during paused Rename, immediate Save during paused Rename, Escape/focus and literal hostile names. No actionable findings; no browser errors. Reviewer sorted-content hash ab57453463da2b0acaa7463464defe46bc990afc21647fabda66de0c7ce38a5f.
- Combined designer reviewed refreshed light/dark artwork, Android shapes and Rename endpoints; no material visual blockers. Source bounds morph and pinned form reviewed. Screenshots stored under screenshots/.

## Corrections during verification

The initial Vanilla Extract migration rejected a scrollBehavior value with !important; corrected to a typed value without suppression. Initial test discovery rejected JSON imports lacking Node import attributes; both runtime and test JSON imports now specify type: json. Neither failure was reported as a pass. Screenshot capture was corrected to await image decoding before recording dark-theme visual evidence.

## Limits

Browser simulations only; no native Liquid Glass, Compose or WinUI acceptance. No screen-reader, physical input, Safari/Firefox, full linguistic, persistent storage or performance certification. Samples stay in memory. Geometry/opacity tests and still review do not establish subjective motion smoothness. No commit, push, merge or publication.
