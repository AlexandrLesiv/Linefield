# Menu source tile elevation — 2026-10-17

Base revision: fa38072da22015a965da145d6635e4e6da8ba8d7 plus existing dirty worktree and this fix.

The backdrop intercepts hover. The existing menu-open state now retains the same 12% hover shadow until menu dismissal finishes. Rename retains its existing 16% elevation. No layer ordering, colors or interaction lifecycle changed.

Acceptance: WEB-ME01 (light/dark pointer hover → menu → Rename → Cancel), WEB-ME02 (keyboard opening and elevation through closing, then cleanup).

Executed on macOS 27.0.1 arm64, headless Chrome 155.0.8059.80, 1280×900. All 12 tests across menu-elevation, action-backdrop and feedback passed without retries. Project checks (24 catalog/resource tests, type/lint/format/source-size), web lint/format and production build passed. Full browser suite and native device acceptance were not rerun for this scoped CSS fix.

Visual inspection: menu-open.png shows source card elevation retained beneath the continuous dim backdrop; capture is disposable/ignored.

## Exact tested source/build SHA-256

- apps/web/src/cards.css.ts: c7b1f6106a08988d0451df3dc2f447360ef00d126d620637107b81ae09fd7839
- apps/web/tests/menu-elevation.spec.ts: 52e1271586c34d8d71bd6d77ceb99479ec4e7194c76ff940921023014dbf58a8
- apps/web/dist/assets/index-s1DoqqA6.css: c269b1a1ceb8f443cfa5548c15c9970b89cf2bb197bb6c6cd5acc5fab8261639
- apps/web/dist/assets/index-BSv1zgB7.js: b047c0bbfd3d3df78fc0266d53448b4024740da295caf9d4e330181142ab8c4b

Independent reviewer: no scoped code findings; confirmed state retention and synchronous Rename handoff. Reviewer browser rerun was blocked before execution by EPERM writing Vite temporary files outside its writable roots. Lead browser execution above passed; no independent execution pass is claimed.
