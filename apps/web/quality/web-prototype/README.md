# Live prototype verification — 2026-10-17

Base revision fa38072da22015a965da145d6635e4e6da8ba8d7 plus the uncommitted files listed in source-hashes.json. Source hashes identify the actual tested prototype; unrelated prior plan edits are not attributed to this change. Chrome 155.0.8059.80 on macOS arm64, headless. No foreground native session or physical-device measurements.

## Results

- pnpm check: passed strict root/web types, Oxlint, Oxfmt and <=200-line owned source checks.
- pnpm web:build: passed Vite 8.3.4 production build after final menu fix.
- pnpm web:test: 13/13 passed; WEB-G01–G13. Raw browser-results.json retains test names, durations and outcomes. No retries configured.
- pnpm audit --audit-level high: no known vulnerabilities found at execution; this is an advisory lookup, not a security certification.
- Combined UI/UX designer inspected desktop/phone/watch stills, menu and settled canvas, then reviewed corrections: no remaining scoped visual blocker.
- Independent reviewer exercised rapid history, viewer mutation, focus, resize and menu interruptions. Three P2s fixed (history/presentation mismatch, viewer Undo, lost Undo focus); viewer empty state also fixed. Final independent review passed with no remaining actionable findings; see independent-review.md and independent-source-hashes.json.

## Failures retained and corrected

Initial menu-opacity assertion failed: easing across the entire close animation faded too early. Split geometry easing and terminal fade fixed it; assertion remains. Cold-load geometry test read a null bounding box before the card was ready; added a visible-source precondition and explicit null rejection, keeping bounds assertions. See initial-menu-failure.json and initial-readiness-failure.json.

Independent all-delete/empty-viewer test exposed queued focus-scroll dismissing a newly positioned menu. Menu now ignores scroll events whose anchor position already matches placement, while actual moved anchors still dismiss. G12 explicitly verifies each action and Undo slot. Earlier formatting/shadowing/escaped-quote lint failures were corrected without exclusions or weakened thresholds.

## Evidence limits

Screenshots in screenshots/ show desktop light, Apple dark, mobile A, Android dark, browser watch paging, menu and settled edge-to-edge drawing. They do not prove native Liquid Glass/Material/WinUI fidelity or animation smoothness. Automated geometry/opacity assertions verify motion state boundaries, not subjective feel or frame pacing. View-only browser modes are not native watch acceptance; preserved v3 references remain docs/design/references.

Not run: Safari/Firefox, screen reader, physical pen/touch/watch/TV, native E2E, persistent storage/recovery, drawing engine performance, full translated UX review. Sample editing is memory-only. No release, commit, push or merge performed.
