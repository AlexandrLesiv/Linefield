# Undo return and artifact policy — 2026-10-17

Memory-only browser prototype, base fa38072da22015a965da145d6635e4e6da8ba8d7 with uncommitted changes. Exact source/config/generated-resource/build hashes: source-hashes.json. No commit, merge or release.

## Verification

- Complete pnpm web:test: 86 passed, no failures/skips/flaky results, 69s. Browser-results.json and browser.log retain the results.
- pnpm check: 12 localization tests plus source size, type, lint and format checks passed (check.log).
- pnpm web:build passed (build.log); final JS index-CwzLqI4J.js 42.56kB; CSS index-EziZWDYw.css 12.83kB.
- Independent reviewer passed focused UI checks and verified a disposable source copy without generated locales: check bootstrapped and passed, existing stale output failed without repair, explicit web build regenerated successfully. Dependencies reused through fixture symlinks, not a fresh package install. See clean-source-check.json and independent-review-hashes.json.
- Combined designer accepted mobile full-rail return and identified initial desktop shell fading. Final artwork/title-only fade preserves opaque card/focus; final visual re-review is recorded below.

## Acceptance

WEB-UR01 checks Web/macOS-preview artwork+title opacity at 0/150/300ms, tile opacity1 and immediate focus, then interruption cleanup. WEB-UR02 checks settled mobile return including rail and fallback after rerender. Existing UM/MM/SI/ST cases cover early Undo, next activation, reduced motion, resize and touch. LOC-12 ensures unchanged generated files preserve timestamps so command preparation does not trigger unnecessary reloads. Ignore checks exclude generated locales and quality/web-* binary captures while preserving source catalogues, app artwork, retained design references, reports and hashes.

## Iteration record and limits

Two initial focused runs passed17/19; failures were test synchronization errors: resize event delivery and uncompleted rail-opacity setup. Fixed by waiting for delivery and settling the complete card subtree, keeping exact geometry/opacity assertions. First complete86/86 run then passed but designer found the entire card surface fading away. It is retained as browser-before-shell-fix.json; final code fades content only and new assertions keep the shell/focus opaque. Final complete run is separate evidence.

Captures are local ignored PNGs under captures/ with browser version/time in environment.json; selected frames are paused deterministic states, not performance measurements. They are not included in Git. Browser tests run headless Chrome on macOS arm64, including CDP touch simulation; actual iPhone/iPad/Android/native application E2E was not run. No artifact hosting configured. Source artwork/design references remain included. Prior native resource format checks are historical; this iteration changes write preparation, not generated content or native runtime integration.

Final independent follow-up passed eight Undo cases after the content-only correction, including persistent opaque shell/focus and child animation cleanup; no actionable findings. Earlier twenty-case mobile/Undo review and clean-source tooling review remain applicable. Final independent manifest is retained.

Combined designer final re-review: refreshed desktop0 retains an opaque card; desktop150 fades artwork/title inside it. Source confirms content-only opacity. No remaining visual blockers; mobile full-rail return remains accepted. This was source/still review, not independent native-device testing.
