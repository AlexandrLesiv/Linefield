# Typed catalogs and iPhone compose perimeter — 2026-10-17

Base revision: fa38072da22015a965da145d6635e4e6da8ba8d7, dirty uncommitted working tree. Exact final source fingerprints and host details: source-hashes.json. macOS27.0.1, arm64, Node24.12.0, pnpm10.26.0; installed headless Chrome155.0.8059.80. This verifies the browser prototype, not native UIKit/device rendering.

## Changes and acceptance

- WEB-CE01 (light/dark): iPhone compose origin gets a decorative1px source-colored perimeter during expansion/collapse. Canvas/artwork geometry is unchanged and steady full-screen has no visible border.
- WEB-CE02: reversal preserves current radius/edge opacity. WEB-CE03: resize/reduced motion settles cleanly. WEB-CE04: forced colors retains a real border; ordinary drawing transitions do not acquire one.
- CAT-01: trusted catalog modules permit literal data/type annotations/comments and reject executable expressions/imports. The root preflight is an authoring restriction, not a security sandbox; direct generator imports remain trusted code execution.
- CAT-02: actual compiler fixtures reject missing locale IDs/theme roles. Existing LOC-01–12 and THEME-01–04 retain runtime validation, plural/escaping/platform override and deterministic/stale-output checks.
- Typed TypeScript is the only authored locale/theme source. All12 generated locale files retain identical bytes and timestamps (catalog-parity.json). Native color generators and host consumers remain pending.

## Executed evidence

- Final pnpm check:14 localization/authoring tests +4 theme tests; root/web types, lint, formatting and <=200-source-line gates passed (check.log). Corrected tooling covers104 formatted files and91 linted TypeScript files (lint-file-inventory.txt).
- Full browser suite:112 passed,0 failures/skips/retries, approximately1.7minutes (browser.log, browser-results.json).
- Production build passed (build.log): index-C_6Bi2Ue.js44.81kB and index-C2t31wjb.css17.36kB.
- Clean bootstrap: disposable project copy without generated resources, using installed dependency symlinks, passed complete check/bootstrap (clean-bootstrap.log). Live resources untouched. This is a clean-output test, not a new dependency installation.
- Native resource syntax:8 XML and4 gettext resources passed (native-resources.log). Apple catalog compiler unavailable; native runtime/locale integration and linguistic review not run.
- Fresh independent reviewer passed13 focused motion/browser tests,18 catalog/theme tests, current fullcheck and byte/mtime equivalence; no actionable findings or product edits. Designer accepted sampled light/dark150ms captures; no native-device or independently observed continuous-playback claim.

## Repair history and limits

The initial mixed directory/glob formatting arguments selected only16 files. Root identified the coverage regression; directory arguments restored full104-file formatting and91-file lint coverage, independently verified. Final check.log is the corrected run; browser source was unchanged by the tooling repair. No baseline or threshold was weakened.

Node emits its experimental stripTypeScriptTypes warning; it is not suppressed. Screenshot captures are ignored disposable artifacts. Existing drawing editor, native integration and accessibility-device acceptance remain outside this memory-only prototype.
