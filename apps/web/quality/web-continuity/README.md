# Gallery continuity verification — 2026-10-17

Base fa38072da22015a965da145d6635e4e6da8ba8d7 plus uncommitted exact sources in source-hashes.json. Chrome 155.0.8059.80 headless on macOS arm64. Capture environment is in screenshots/environment.json. Previous web-feedback evidence remains historical.

## Executed

- pnpm check: strict types, lint, formatting and <=200 physical source-line checks passed.
- pnpm web:test: 34/34 passed, no retries, final run 21.3s. Prior WEB-G/R/F/SC regression coverage retained.
- WEB-M01 (desktop/mobile) compares whole shell and inner artwork at opening start, closing last frame and static return within 0.5px, with hidden-origin handoff. WEB-M02 covers interrupted opening/return and resize. WEB-M03 covers compact icon/New Apple toolbar, accessible name, target dimensions and last-card clearance. WEB-M04 observes actual unforced animation progress in both directions without assigning time/finishing animations.
- WEB-RA01–RA04 cover anchored Rename after cleanup, edge/resize constraints, validation, early save, reduced motion and injected keyboard visual viewport bounds. The viewport injection is boundary coverage, not physical keyboard acceptance.
- pnpm web:build passed. Vite 8.3.4 emitted index-CBPF1qPj.css (12.26kB) and index-CJTzExZw.js (23.10kB). No dependency changes.
- Fresh independent gallery_continuity_review initially identified a P1 animation-clock defect below. After correction, independently passed 9/9 focused tests and separate unforced playback sampling: both animations running at identical timestamps, artwork progressing through 782px opening and 537px closing, restoring 293.328px gallery width. P1 resolved; no other actionable findings. Reviewed surface-motion.ts SHA256 5b324118e15a625096a2ccc1e48c86eb1cfa35062f7b2faf9da8586bc21630c6.
- Combined gallery_feedback_design reviewed light/dark toolbar, menu/Rename pair and last/static collapse captures plus source. No visual blockers. Captures were refreshed against final code after the clock fix; frame geometry is unchanged. Reviewer independently verified continuous playback, which stills cannot establish.

## Corrections retained

Initial strict check required narrowing AnimationEffect to KeyframeEffect before setKeyframes, and the test image to HTMLImageElement before decode. Initial toolbar test found108px bottom clearance because the redundant prototype footer added space; hid this footer on narrow Apple previews while retaining header Browser simulation, yielding compact clearance without relaxing the test. Rename test used a near-center fixture; taller viewport now demonstrates anchoring with identical geometry assertions. One early Rename run lost its dialog during concurrent HMR; stable-source reruns passed.

Independent review found that assigning artwork.startTime from the still-null shell.startTime paused the image. Frame-stepped tests had masked this. Removed that assignment so both pending animations start on the same document timeline tick, added WEB-M04 real playback checks, reran all34 tests/build and obtained independent re-review. Earlier33-pass results are not evidence that this defect was absent.

## Limits

Memory-only browser prototype, no native implementation or persistence. No Safari/Firefox, physical iPhone keyboard/safe-area, screen-reader or performance certification. Browser symbol/material approximations are not UIKit/SF Symbols or native Liquid Glass. No commit, push, merge or publication.
