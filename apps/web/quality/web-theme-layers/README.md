# Three-layer theme and continuous elevation — 2026-10-17

Decision229. Base revision fa38072da22015a965da145d6635e4e6da8ba8d7 plus preserved dirty worktree; source-hashes.json identifies the tested integration source. Final source hashes rechecked after the browser suite. macOS27.0.1 (26A434), arm64; system Chrome155.0.8059.80 and headless WebKit27.2 (build2370). No physical-device/native-host acceptance.

## Results

- Root checks passed: literal catalog authoring, runtime theme validation, six theme tests,14 locale/authoring tests, TypeScript, lint, formatting and source-size checks.
- Web lint/format and production build passed. CSS index-GUGOXPPH.css17.52kB; JS index-Czr0zz85.js46.28kB. Vite reports are in build.log.
- Full browser suite:123 passed,0 failed/skipped on final run (122 Chromium,1 WebKit). See browser-final.log/json. A final narrow right-button guard landed during the run before native-context coverage; writer re-ran3 affected cases and independent reviewer re-ran all6 backdrop/context cases on that exact guard.
- Initial integration run:121 passed,1 failed (WEB-P02 second native right-click intercepted by backdrop). Preserved browser-initial.log/json. Repair retains backdrop identity while forwarding context intent only; no baseline weakened or test removed.
- Independent review: no remaining actionable findings; additional actual WebKit probes and designer visual/input review in review.md. Local captures are Git-ignored.
- color-parity.json proves every44 pre-existing light/dark role values unchanged. New overlay.scrim canonicalizes previous dialog #0005 as #00000055.

## Acceptance

THEME-06/07: exact semantic roles/modes, valid one-hop primitive references, no alias cycles, exact prior color parity. WEB-BD01–04: shared scrim from menu through Rename, transparent dialog backdrop, fade dismissal/Delete, no outside click-through, reduced-motion/resize cleanup and native context retarget. WEB-SE01/02: actual hovered card/New shadow persists during detached travel, fades at full-screen, samples interrupted state and settles on resize. Existing artwork geometry, mobile swipe, Undo and route regressions remain covered.

## Limits

This remains a memory-only browser design prototype. Native theme resource generation/consumption, native materials, physical iPhone/Safari, screen-reader and GPU performance acceptance are not supplied by browser tests. Primary-action default/on-surface semantic roles are a recorded follow-up before future recoloring. No merge/publish performed.
