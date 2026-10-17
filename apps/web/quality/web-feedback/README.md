# Gallery feedback verification — 2026-10-17

Base fa38072da22015a965da145d6635e4e6da8ba8d7 plus uncommitted exact sources in source-hashes.json. Chrome 155.0.8059.80 headless on macOS arm64; capture environment is in screenshots/environment.json. This iteration supersedes web-refinements for current-source evidence; previous evidence remains historical.

## Executed

- pnpm check: strict types, lint, formatting and <=200 physical source-line checks passed.
- pnpm web:test: 25/25 passed, no retries. WEB-G01–G13 and WEB-R01–R05 retain previous coverage. WEB-F01–F04 cover attached Apple creation, pointer-hover/focus separation, full-size committed menu fade and immediate same-slot Undo, including reduced motion. WEB-SC01–SC03 cover no reserved scrollbar width, native wheel scrolling, dragging, keyboard/track paging, hiding during drawing/dialog, resize and forced colors.
- pnpm web:build: passed. Vite 8.3.4 emitted index-CrQiiUW9.css (11.90 kB) and index-CrxsWnXb.js (20.82 kB). No dependencies changed this iteration.
- Fresh independent gallery_feedback_review reran 7/7 WEB-F/WEB-SC tests successfully (4.5s). Additional Ukrainian iPhone checks confirmed last-card toolbar clearance, full viewport width and an available creation control in landscape. Reviewed cleanup, immediate Delete/Undo, focus, observer disposal and hover separation: no actionable findings.
- Combined gallery_feedback_design reviewed light screenshots/source: no blocking issues. Lead refreshed settled hover and additionally inspected dark iPhone toolbar. Captures are under screenshots/; delete-midpoint intentionally freezes motion at 90ms and deleted shows its settled endpoint.

## Verification corrections

The first isolated scrollbar test incorrectly kept the New tile in its no-overflow fixture, leaving real 48px overflow. The fixture was corrected to remove all grid children, then all three scrollbar tests passed; implementation was not weakened. First hover capture was mid caption fade; replaced after waiting for animation completion. No failures were hidden as passes.

## Limits

Browser prototype with memory-only samples. No Safari/Firefox, real touch/screen-reader, native Liquid Glass/Compose/WinUI, persistence or performance certification. Geometry/opacity assertions and still inspection do not establish subjective animation smoothness. No commit, push, merge or publication.
