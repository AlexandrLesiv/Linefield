# Undo paper continuity — 2026-10-17

Decision226; basefa38072da22015a965da145d6635e4e6da8ba8d7 plus uncommitted changes. Memory-only browser prototype. Source/build hashes in source-hashes.json; no commit/merge/release.

## Repair

Undo previously faded artwork/name but switched the restored shell straight from the dark removal surface to off-white paper. It now captures the removal color before synchronous render, then animates opaque tile, artwork backing and title backing on the same300ms curve as existing content/morph presentation. Data and focus remain immediate. Reduced motion skips transitions. Theme changes, resize, scrolling, subsequent input and detachment clean up obsolete presentation. Mobile slide behavior is unchanged.

WEB-UP01 covers light/dark Web and macOS-preview source/midpoint/endpoint colors, equal artwork/shell backing, opaque shell and interruption cleanup. WEB-UP02 covers reduced motion; WEB-UP03 covers live dark-to-light interruption, current appearance, cleanup and focus. Existing Undo/mobile tests retain continuity and action semantics coverage.

## Review and iterations

Designer review of paused0/150/300ms frames found a transient lighter artwork area over a darker title strip in the first repair. Final keyframes blend all background areas together; refreshed captures and source pass the visual re-review. Native/device execution was not performed.

Initial focused worker run passed10tests. An initial root full107-case run passed while refinement was ongoing, so browser-during-refinement.log is historical and not the final frozen-source claim. Final results are recorded separately in browser.log/browser-results.json. Independent reviewer had one pre-freeze macOS-preview Undo timeout during source changes; it is retained in the review record and requires final recheck rather than treating it as a pass.

The user also requested cross-platform reduced-transparency documentation and shared-resource planning. See docs/design/accessibility-materials.md and shared-resources-plan.md. Existing native locale output generation is distinct from native runtime consumption; shared theme web integration is complete, native color generation is still pending. TypeScript authoring is recommended, not migrated by this change. JSON-only authoring wording was relaxed without silently creating a second source of truth.

Captures are local ignored PNGs under captures; frames are deterministic browser snapshots, not performance measurements. Tests use installed headless Chrome on macOS arm64. The prototype is not a native drawing editor.

Final independent review reported no actionable findings and passed17/17 focused tests without skips/retries. The earlier timeout did not reproduce; source-change/HMR interference is plausible but unproven. Final source/test sizes175/50/139lines. Reviewer platform:macOS27.0.1(26A434),Chrome155.0.8059.80,Node24.12.0,pnpm10.26.0.

Final frozen-source verification:107/107 browser tests passed in1.7minutes, no retries/skips. Root checks passed12localization+4theme tests, types/lint/format/source-size gates. Build passed with index-BBV7aCun.js44.18kB and index-DXFeMTpy.css17.25kB. Browser-results.json and source-hashes.json retain exact test/build evidence.
