# Gallery return-motion verification — 2026-10-17

Base fa38072da22015a965da145d6635e4e6da8ba8d7 plus uncommitted exact sources in source-hashes.json. Chrome 155.0.8059.80 headless on macOS arm64. Capture environment is in screenshots/environment.json. Prior web-continuity evidence remains historical.

## Executed

- pnpm check passed: strict types, lint, formatting and <=200 physical source-line checks.
- pnpm web:test: 44/44 passed, no retries, final run 31.3s. All previous 34 regression cases retained.
- WEB-RX01–RX06 cover outside press versus inside-to-outside drag, Cancel geometry/content pinning, immediate single save before animation, replacement trigger/focus, interrupted opening, resize cleanup, reduced motion and validation. Escape uses the same exit path and remains covered by WEB-R03.
- WEB-C01 (light/dark) verifies interpolated background, plus/name/border fading and both endpoint handoffs. WEB-C02 observes unforced real playback and reversal from an interrupted current color/opacity. WEB-C03 checks reduced-motion cleanup.
- pnpm web:build passed. Vite 8.3.4 emitted index-CBPF1qPj.css (12.26kB) and index-L6ey8cn8.js (26.36kB). No dependency changes.
- Fresh independent gallery_return_review passed 9/9 focused browser cases and separately sampled unforced playback. No actionable findings. Confirmed Rename contracts to its current live 44px ellipsis, outside dismissal does not activate the underlying drawing, save commits immediately once, and continuous New color/label progress. No browser errors observed. An initial sandbox-blocked Chrome launch was rerun with approved execution permissions; it was not counted as a product pass.
- Combined gallery_feedback_design reviewed source and refreshed captures: New appearance is coherent in light/dark; the ellipsis handoff finding below is resolved, with no remaining visual blockers. Stills cover light/dark opening/return and Rename open/mid-return/closed; stills alone do not certify playback.

## Corrections retained

First full test run: 40 passed, 3 new creation-animation cases failed because the label inherited the shell's fast geometric easing and was already fully transparent at the sampled intermediate time. Gave label/border opacity its own linear timing while preserving the shell motion curve. Focused 4/4 creation cases then passed, followed by the complete 44/44 run. No threshold was relaxed. Existing Rename focus expectations now explicitly target the ellipsis that receives the visual handoff, rather than the drawing-opening tile.

Design review identified an ellipsis visibility gap at final dialog removal: cancelling its animation before focus restoration could start a second CSS opacity transition. Temporarily disable that transition through focus/style resolution, then restore it. WEB-RX06 now asserts opacity exactly1 at removal with the pointer away; the independent reviewer reran all6 Rename tests and found no actionable findings. The final44-test run/build passed. Strict checks initially caught an unused test variable and an unused-expression style flush; removed the variable and marked the intentional flush with void. All strict checks then passed.

## Limits

Memory-only browser design prototype. No native implementation, persistence, Safari/Firefox, physical touch/keyboard, screen-reader or performance certification. No commit, push, merge or publication.
