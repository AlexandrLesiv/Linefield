# Clean paths and mobile motion verification — 2026-10-17

Base fa38072da22015a965da145d6635e4e6da8ba8d7 plus the uncommitted sources/build identified in source-hashes.json. Chrome 155.0.8059.80 headless on macOS arm64. Prior web-preview-undo evidence remains historical. No dependency, engine, persistence or native-framework changes.

## Acceptance

- WEB-URL01: platform selection leaves URL/history unchanged; Back/Forward retains the in-memory preview platform.
- WEB-URL02: ordinary drawing paths, direct links, reload and in-app Back with correct focus.
- WEB-URL03: unknown/malformed initial paths and blank viewer paths return to gallery.
- WEB-MM01 (iOS/iPadOS/Android): Delete starts at current swipe offset, travels left within the preserved slot; immediate Undo reverses from current position. Restored live tile keeps focus; native previews have no ellipsis.
- WEB-MM02: Rename retracts rail, fades without geometry morph, saves immediately and returns focus.
- WEB-MM03: resize/reduced motion remove obsolete presentation.
- WEB-MM04: incoming Undo keeps live keyboard activation; next Enter opens the drawing path.
- WEB-MM05: outside Rename dismissal fades and restores drawing focus.
- Existing blank-preview reload expectation now verifies the ordinary path reopens the transient preview without adding gallery records. Existing hash assertions migrated to paths; malformed-route rejection retained.

## Executed evidence

- pnpm check: strict types, lint, formatting and source-size gates passed.
- pnpm web:test: 73/73 passed in 59.9s; no skipped/flaky/retried cases. Exact results in browser-results.json.
- pnpm web:build passed; exact emitted assets in source-hashes.json.
- Implementer scoped mobile suite: 7/7 passed in 3.9s. Initial tests found actual focus loss from visibility-hidden live tile during Undo; opacity preserves focus/hit testing instead. An ambiguous Rename test locator was scoped to the dialog; path assertion excludes intentional initial review query. No geometry/behavior baseline weakened.
- Fresh mobile_route_review independently passed 17 navigation/mobile/blank/routes cases (25.5s), then final 10 mobile/routes cases (9.4s), plus a disposable mid-Undo keyboard probe. No actionable findings; no source edits.
- Captures show iOS/Android Delete at 80ms, Undo at 100ms and settled Rename at 390x844. They support visual placement; deterministic geometry tests and independent unforced probes support interruption semantics.

## Limits

Memory-only browser prototype. Real mobile touch arbitration, system keyboards, native controls, Safari/Firefox and hardware accessibility were not verified. Vite serves path fallback locally; production hosting must rewrite drawing paths to the entry document. No performance claim, commit, push, merge or publication.

Combined gallery_feedback_design reviewed all six iOS/Android light-theme captures and the motion/dispatch/route source: no blocking design findings. Same-slot movement, current-offset reversal, compact opacity-only Rename, rail closure and input focus accepted. Review did not independently exercise dark/orientation/software-keyboard or rerun tests. Production output: index-EziZWDYw.css 12.83kB and index-CgxIjE41.js 36.18kB.
