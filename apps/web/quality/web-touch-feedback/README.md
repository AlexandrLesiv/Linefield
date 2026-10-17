# Touch feedback and app-local evidence — 2026-10-17

Base: fa38072da22015a965da145d6635e4e6da8ba8d7, dirty uncommitted workspace. Exact scoped source fingerprints: source-hashes.json. macOS27.0.1 arm64, Node24.12.0, pnpm10.26.0, installed headless Chrome155.0.8059.80 and Playwright WebKit27.2 build2370. Not physical iPhone/Safari or native UI acceptance.

## Acceptance and results

- WEB-TH01 (light/dark): New drawing hover matches drawing-card soft shadow, preserves dashed border/bounds and keyboard focus. Shadow applies only to fine pointers with hover support.
- WEB-TH02: actual headless WebKit touch context verifies transparent browser tap highlight on tile, drawing, menu trigger, select and Back; tap opens/returns and leaves no sticky hover shadow. Existing explicit pressed/focus styling remains.
- All13 root quality/web-* folders moved under apps/web/quality with all176 files and6,528,501 bytes unchanged at relocation. relocation-before.json records the premove inventory. Independent reviewer rehashed all files with zero differences. Later browser runs may regenerate ignored captures. Root shared quality stays; active links/capture destination and ignore rules updated. Historical reports retain recorded original paths, explained by the parent index.
- Final full browser suite:115 passed,0 failed/skipped/retries (browser.log/browser-results.json), approximately1.7minutes. Includes114 Chrome cases and1 WebKit case.
- pnpm check:14locale/authoring +4theme tests, root/web types, lint, formatting105files, source-size passed (check.log).
- Production build passed (build.log): index-Cn1Dw0mq.js44.81kB, index-Ds1G_1Pi.css17.40kB.
- Fresh independent focused3-case review passed; see independent-review.md.

## Repair history

Early WebKit fixture inherited the Chrome channel and failed before launch; explicit default WebKit channel fixed it. Required pinned build2370 was absent (older2359 installed), so matching browser was installed and its prerequisite documented. Actual WebKit then exposed a native select UA tap-highlight rule overriding root inheritance; explicit universal style fixed that product issue. The initial390px fixture addressed a hidden New tile replaced by the responsive creation action;840px touch-tablet fixture uses the visible tile. The return assertion then needed a gallery-scoped selector to exclude the animation clone. Final frozen focused and full runs passed without retries. No baselines/thresholds or assertions were removed to hide failures.
