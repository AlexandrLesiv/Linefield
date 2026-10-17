# Shared theme and Apple compose refinement — 2026-10-17

Decisions224–225; memory-only browser prototype. Base fa38072da22015a965da145d6635e4e6da8ba8d7 plus uncommitted changes. Exact source/config/generated-resource/build hashes are in source-hashes.json. No commit, merge or release.

## Approved result

The owner superseded the interim top +New action by explicitly choosing a bottom-right glass compose button. iPhone uses a56px icon-only control with a localized New drawing accessible name, safe-area offsets, final-card clearance, creation-origin motion and Back/Forward focus restoration. Empty galleries keep only centered creation. iPad retains its previous placement; creation/Back use restrained Apple-style material. The browser approximation follows the supplied Notes reference; it is not native Liquid Glass. Dialog actions retain readable hover/pressed fills without geometry changes.

shared/theme/colors.json is the framework-neutral semantic palette consumed by the typed web adapter. Native hosts may map this catalog later; no native color adapter/generator was added. The owner subsequently authorized softer charcoal night surfaces and off-white display paper. Light colors remain unchanged. Isolated darken compositing softens baked-in sample white consistently across gallery, canvas and motion; original image bytes remain unchanged. Pale highlights can be capped by the display paper, so this is not a color-critical editing/export policy.

## Acceptance and evidence

WEB-H01 covers English/Ukrainian portrait/landscape, fixed compose geometry, history and focus. WEB-H02 covers Cancel/Rename hover and held-press fills across Web, iPhone, iPad and Android previews in both themes. WEB-M03 verifies final-card clearance; WEB-F01 and existing blank-preview tests preserve iPad/Android and empty-state behavior. WEB-GL01 covers glass hover/press, stable geometry and opaque reduced-transparency/forced-color fallbacks, including actual iPad toolbar containers; WEB-GL02 checks modal outside dismissal cannot activate compose underneath. THEME-01–04 validate exact semantic modes/roles, hex syntax, critical text contrast and the approved palettes. THEME-05 checks paper/compositing through both directions of navigation.

Results are retained in check.log, build.log, browser.log and browser-results.json. Captures/environment.json record headless installed Chrome on macOS arm64. Captures are ignored local PNGs; reports/hashes remain versionable. No physical iOS/iPadOS/Android/native host test, screen-reader speech or performance measurement is claimed.

## Iteration record

Before the credits interruption, independent review found hover styles overriding pressed styles; :hover:not(:active) fixed the conflict and all eight feedback variants passed. The initial resumed full run passed97/98: one old gallery test still expected the former near-black palette and old mobile-create selector. Those expectations were updated to the explicitly approved values/control, retaining the one-column assertion.

Fresh independent review found reduced transparency only disabled blur on buttons, leaving iPad toolbar backgrounds translucent. The first container correction lost to a later equal-specificity rule; two targeted tests reproduced it. A narrow body-qualified selector now gives the fallback deliberate precedence, and all three glass tests passed. Logs retain that failed attempt separately. Production build and root checks passed after the correction.

Combined designer inspected nine final normal-theme captures plus source and reported no blocking visual findings. This was screenshot/source review, not physical-device acceptance. Independent review results are recorded below after completion.

Final independent review: no unresolved actionable findings. Sixteen header/feedback/theme/motion browser checks, four catalog tests and three final glass/fallback/modal checks passed independently. The reviewer reproduced and reverified the container fallback repair. macOS27.0.1 arm64, Node24.12.0, headless Chrome155.0.8059.80. Final reviewed material SHA-256:76a5a34807a53019faa34f6d301c05221553d13388e762fc5be66b056038a291. One intermediate dark-case connection refusal during test server shutdown was not a pass; final persistent-server retry passed.

Final integrated result:101/101 browser tests passed with no skips or flaky results (1.6minutes). Root check passed12localization tests,4theme tests, strict types, lint, format and source-size gates. Production build passed: index-DL_4zBOc.js43.74kB and index-DXFeMTpy.css17.25kB (raw). Final browser-results.json and source-hashes.json identify the tested dirty snapshot.
