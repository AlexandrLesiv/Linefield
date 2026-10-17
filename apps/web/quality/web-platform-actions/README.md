# Gallery platform-action verification — 2026-10-17

Base fa38072da22015a965da145d6635e4e6da8ba8d7 plus uncommitted exact sources in source-hashes.json. Chrome155.0.8059.80 headless on macOS arm64. Prior web-return-motion evidence is historical. No dependencies or native/storage/engine boundaries changed.

## Acceptance

- WEB-P01: centered three420px desktop tracks, adaptive two/one columns.
- WEB-P02: native pointer menu anchoring, repeated right-click reposition and edge clamping; no native ellipsis.
- WEB-P03 (iOS/Android): no long press, vertical gesture cancellation, swipe reveal, explicit Rename/Delete, keyboard access and Undo.
- WEB-P04: menu animation keyframes contain no blur.
- WEB-P05: reverse/outside/keyboard dismissal, one rail at a time, full swipe never deletes, closed actions inert.
- WEB-P06: delayed vertical-drag release never opens a drawing; next ordinary click does.
- WEB-P07: cancelled touch never consumes subsequent keyboard activation.
- WEB-DM01–DM03: interruption starts at current menu bounds, immediate live Undo, normal playback/resize cleanup and exact final geometry/background/opacity with one label owner. WEB-F03 updated from the superseded full-size fade to the owner-requested morph; prior gallery/rename/navigation/scrollbar cases retained.

## Iterations and review

First platform run8/10 passed: vertical drag cancellation discarded gesture state and could activate the drawing on release. Initial timed suppression fixed the short case; fresh reviewer reproduced delayed-release activation, then identified a cancelled-pointer flag swallowing keyboard Enter. Replaced timers with pointer-lifetime direction/drag state and distinguished pointer-generated clicks. Added P06/P07. Independent platform rerun8/8 passed after fixes.

Designer identified closed-rail red corner leakage; closed rails now fade to opacity0. Designer identified gray/doubled Undo near completion: complementary alpha surfaces were replaced with one opaque shell reaching exact destination before atomic handoff. Fresh reviewer reproduced a2px clone offset caused by retained menu scrollTop; committed visual now resets scroll and uses overflow clip. Endpoint assertions were retained and strengthened with forced source scroll.

Early capture frames had decoded but incompletely painted artwork. Final captures wait for complete/naturalWidth, two frames and paint settling; source behavior was not altered to hide the issue. These captures are visual evidence, not native-device certification.

## Final executed checks

- pnpm check passed strict TypeScript, Oxlint, Oxfmt and source-size gates.
- pnpm web:test:55/55 passed, no skips/retries,39.9s. Exact IDs/results in browser-results.json.
- pnpm web:build passed: Vite8.3.4 emitted index-EziZWDYw.css12.83kB and index-CxPqxXl9.js29.43kB.
- Fresh platform_action_review independently passed8 platform cases and7 Delete/feedback cases after fixes; earlier18-case focused regression also passed. Reproduced and verified all three reported gesture/scroll findings. No remaining actionable findings.
- Implementer repeated exact Delete endpoint with forcedscroll5/5 passed. Initial repeat4/5 had a teardown lookup after legitimate scroll cleanup; made teardown optional without changing exact geometry/style assertions.
- Combined gallery_feedback_design reviewed final screenshots/source: no remaining scoped interaction-design blockers; opaque Undo, exact handoff, centered cards, swipe corners and pointer placement accepted. Some non-target thumbnails remain blank in pointer-menu/light-delete captures, so those frames support control geometry only; loaded overall-gallery captures support layout. Designer did not independently run tests or native devices.
- All changes remain local/uncommitted. Source-hashes.json identifies tested files separately from the base revision.

## Limits

Browser simulation with in-memory samples only. Swipe automation uses real mouse drags and injected pointer cancellation in headless Chrome; physical mobile touch/pan arbitration, native accessibility, Safari/Firefox and native host controls were not verified. No performance claim, commit, push, merge or publication.
