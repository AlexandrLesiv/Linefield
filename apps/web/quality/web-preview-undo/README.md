# Blank-preview and Undo verification — 2026-10-17

Base fa38072da22015a965da145d6635e4e6da8ba8d7 plus uncommitted sources in source-hashes.json. Headless Chrome 155.0.8059.80 on macOS arm64. Browser prototype only; no native, editing, persistence or dependency changes.

## Acceptance and results

- WEB-N01 (Web/iOS): repeated New/Back retains six sample identities/order and restores creation focus.
- WEB-N02: Back/Forward, interrupted collapse and reload never add blank tiles.
- WEB-N03: reduced-motion empty gallery stays empty across blank preview visits.
- WEB-UM01: immediate restoration, exact start/end bounds and single ellipsis handoff.
- WEB-UM02: immediate Undo starts at the currently moving Delete surface; resize cleans up.
- WEB-UM03: normal playback and reduced motion leave no stale presentation.
- WEB-UM04: next keyboard activation removes obsolete motion without consuming input.
- Existing creation, history and deletion tests retain their geometry/continuity assertions; count expectations now reflect no new record and Web Undo focus returns to ellipsis.

Final full suite: 63/63 passed in 51.6s, no skips/retries. pnpm check passed strict types, lint, formatting and source size. pnpm web:build passed with Vite 8.3.4: index-EziZWDYw.css 12.83kB; index-BSZDkIsR.js 32.69kB.

Fresh preview_undo_review independently passed 8 scoped cases and 2 iOS/Android regressions; observed unforced 79px-to-44px Undo progression, exact handoff, Reset cleanup and no browser errors. No actionable findings. Source/tests unchanged by reviewer.

Early test-harness repairs: narrowed DOM click types, settled unrelated CSS transitions before pausing Web Animations, and sampled rapid Delete/Undo synchronously to avoid measuring an already-removed element. Endpoint assertions were not relaxed. Added next-input cleanup after lead identified possible obsolete motion over a subsequent action.

Screenshots show sampled start, mid, final-hold and completed Web Undo motion at 1280x900. Mobile push-out Delete and fade-form Rename are documented proposals only. Native touch/device accessibility, other browser engines and real editing/storage were not tested. No performance claim, commit, push, merge or publication.

Combined gallery_feedback_design reviewed the source and all four captures: no blocking findings, no duplicate label/opacity dip at final handoff, interrupted Delete capture and cleanup paths accepted. Screenshot/source review only; no independent native-device validation.
