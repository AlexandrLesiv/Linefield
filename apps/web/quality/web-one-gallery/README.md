# One Web gallery — 2026-10-18

Owner request: remove the hidden platform switch and use Web everywhere in the gallery.
Decision233; task [P05-G01](../../../../tasks/P05-G01.md). This is browser-prototype acceptance,
not native host, persistent library or Rust/Wasm editor acceptance.

## Result

One responsive Web gallery now handles every viewport and legacy query link. Platform selector,
reset/simulation controls, platform appearance overrides, native-preview context/swipe actions,
viewer simulation and Apple-only creation controls are removed. Existing Web ellipsis menus,
responsive New control, Rename/Delete/Undo, drawing routes, artwork transitions, shared theme and
browser-selected English/Ukrainian remain. Browser context menus and long press are unclaimed.

WEB-ONE01–04 cover query independence, action availability, responsive continuity and retained
flows. SEC-WEB-QUERY-01 maps to WEB-ONE01 and existing malformed-route/safe-name checks. Query
parameters no longer choose capabilities. Future native viewer-host policy remains unchanged.

## Executed verification

- Full migrated suite: **88 passed**, 0 failed/skipped/flaky/retries, 89.85s. This run preceded the
  final obsolete-backdrop-handler cleanup. See [full summary](full-summary.json) and
  [original report](full-results.json).
- After final source cleanup and its new secondary-click regression: **30 focused passed**,
  0 failed/skipped/flaky/retries, 34.22s. Files: action-backdrop, refinements, preview-controls,
  responsive-actions, menu-elevation, delete-morph and rename-exit. See
  [focused summary](followup-summary.json) and [original report](followup-results.json).
- Final discovery: **89 cases in 25 files**. The two runs overlap; this is not 118 unique tests
  or a claim of a full-suite rerun after the last cleanup.
- `pnpm check`: 24 shared catalog/resource tests plus type checks, lint, format and source-size
  gates passed. [Exact log](checks.log).
- `pnpm web:build`: passed. [Exact log](build.log). Final assets:
  `index-BVUJskKH.js`, `index-IAO9o_Hw.css`.
- `git diff --check`: passed. Static runtime scan found no platform-selection, custom contextmenu,
  swipe or compose path remaining in apps/web/src.

[Source/build manifest](source-build-manifest.json) records base revision, current uncommitted
source hashes, generated resources, build assets and environment. Chrome155.0.8059.80 ran
headlessly; the suite also includes actual Playwright WebKit touch/menu/Rename coverage.
These are browser tests and emulated touch viewports, not physical phone/native UI certification.
Initial sandbox server/browser launch limitations were handled by approved isolated headless
execution; no desktop focus or phone automation was used. A capture attempt while the temporary
test server was stopped failed with connection refused; restarting the preview produced the four
reviewed captures. No failed browser acceptance was relabeled as pass.

## Independent and design review

`proposal_review` independently inspected source/test diffs, ran additional Chrome checks,
audited both reports and all126 manifest hashes. It found leftover native-preview backdrop
contextmenu forwarding; lead removed it and the worker added a regression using both synthetic
event observation and an actual trusted secondary click. Re-review found no remaining blocker.
Known-route validation, literal text handling, focus, mode removal and unchanged trust boundaries
were included. Independent checks covered Ukrainian/dark narrow Rename, Delete/Undo, menu Tab,
legacy watch query/blank route reload/Back and malformed routes, with no page errors.

`drawing_design` inspected [desktop light](desktop-light.png), [desktop Rename](desktop-light-rename.png),
[narrow Ukrainian dark](narrow-dark-uk.png) and [narrow Rename](narrow-dark-uk-rename.png).
Visual review passed: grid/New placement, visible narrow ellipses, clear input focus and unclipped
dialog text/actions. Static review does not certify animation, linguistic quality or native behavior;
browser regressions provide interaction/motion evidence. Captures are disposable ignored local files.

## Explicitly retired assertions

Historical evidence remains unchanged. Removed cases target superseded browser simulations:

- Apple material GL01/GL02; compose perimeter CE01–CE04; native compose H01/M03/F01.
- Phone-specific motion MM01–MM05; swipe SI01–SI05, ST01, SL01/SL02/SL04; SL03 migrated
  to WEB-ONE04 resize/active Rename continuity.
- Native-only platform action P02/P03/P05/P06; retained common layout P01/P04/P07.
- Viewer simulation G05/G10/G12 and native-context backdrop retarget BD04.
- Mobile rail Undo UR02; common Undo UR01/UP01 retain legacy-query variants using ellipsis.
- Preview selector PC01–PC03 and URL01 replaced by query-independent WEB-ONE01; malformed
  route URL02/URL03 remain without obsolete viewer restrictions.

H02 button-state coverage retains Web light/dark; N01 blank preview now covers1280/390 widths;
TH02 keeps real WebKit touch and adds narrow Rename/Cancel/focus; core gallery, safe names,
routes, backdrop, animation interruption, theme, localization and resource checks remain.
Native VIEWER-001 is still future host acceptance, not replaced by editable Web query tests.

Lead acceptance: scoped gallery implementation complete after independent/design review and the
checks above. Existing unrelated documentation/research work is preserved. No commit, merge,
release, framework migration or real drawing implementation is implied.
