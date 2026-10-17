# Shared locales and direct swipe verification — 2026-10-17

Tested base: fa38072da22015a965da145d6635e4e6da8ba8d7, with uncommitted changes. Exact handwritten/generated source and production bundle SHA-256 values: source-hashes.json. This is a memory-only browser prototype, not a native drawing editor.

## Results

- pnpm web:test: 82 passed, 0 failed, 0 skipped, 0 flaky; duration 66 seconds. See browser-results.json.
- pnpm check: passed strict root/web types, lint, formatting, source-size, generated resource validation and all 11 LOC tests. See check.log.
- pnpm web:build: passed; index-ClG3OKxM.js 41.32kB and index-EziZWDYw.css 12.83kB. See build.log and exact hashes.
- pnpm locales:native-check: xmllint validated eight actual/synthetic XML/RESW files; msgfmt compiled four actual/synthetic PO catalogs. See native-resources.log. This checks syntax/format consistency, not native runtime loading.
- Fresh independent review: no remaining actionable findings, 22 scoped browser tests and locale/resource validation passed. See review.md and independent-review-hashes.json.
- Combined designer: no blocking visual findings in light/dark captures and source; rail opacity polish implemented. Completed handoff and interruption are covered by browser tests.

## Acceptance and environment

WEB-SL01–SL04: direct drag, iPad always ellipsis, phone controls based on actual single-column layout, safe adaptation during Rename/navigation, full card/rail Delete handoff. WEB-SI01–SI05: foreign pointers, same-column resize, early Undo, mid-settle grabs and vertical cancellation. WEB-ST01: trusted browser touch dispatch preserves each 30px movement across implicit capture transfer, release reveal and native browser vertical scrolling. Existing WEB-MM and WEB-RX cases protect Delete/Undo and Rename/focus continuity. LOC-01–LOC-11 cover schema/translation completeness, argument contracts, plural categories, overrides, escaping, collisions, output staleness, web formatting, CR and symlink safety.

macOS arm64; installed Chrome headless (exact version and capture time in captures/environment.json). Browser tests exercise 390px phone and wider/tablet/desktop layouts, light/dark and reduced motion where relevant. CDP touch is browser input simulation, not a physical iPhone/Android test. Captures include paused geometry frames plus direct drag; real playback checks are separate browser cases.

## Failures and limits

First full run: 80 passed, WEB-RX03 failed. Initial action installation was incorrectly deferred under Rename, losing the live exit target; fixed and rerun. Retained browser-first-run.json. Earlier scoped attempts hit a cached Vite missing import during catalog migration; restarted preview and reran rather than counting them as passes. Other independent findings and corrections are recorded in review.md.

Apple xcstringstool unavailable; Apple catalog compilation not run. Android/Windows application resource compilation, actual native host adapters, device/screen-reader E2E and independent linguistic review were not run. Windows plural category adapter remains future host work. No Figma/native product approval, merge, release or persistence claim.
