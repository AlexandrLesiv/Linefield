# P05-S01 local styles and cleanup evidence

Base: b0cb531b331371493792355a3baaddca61632709; branch: codex/p05-s01-local-styles,
stacked on PR #2. Exact tested inputs and built asset hashes: [source manifest](tested-source.json).
This verifies a browser prototype and repository cleanup, not native UI or durable storage.

- [Root checks](root-check.log): 106 tests passed; strict type checks, lint, formatting,
  generated resource drift and 200-line source limits passed.
- [Web build](web-build.log): passed, index-BjDhnKYu.css and index-Diz_-CZy.js.
- [Browser results](browser-results.json), [run output](browser.log): 121 passed, no skips/retries.
  Includes WEB-STYLE-01 local-class isolation and WEB-STYLE-02 touch dialog backgrounds, plus
  existing gallery/history/focus/motion, drawing controls and English/Ukrainian scenarios.
- [Designer review](visual-review.md): 32 before/after screen pairs match exactly across desktop/
  mobile, light/dark, English/Ukrainian and gallery/menu/Rename/drawing. Screenshots remain local;
  [manifest](visual-manifest.json) records hashes. This is not universal visual coverage.
- [Independent review](independent-review.md) records findings and remediation.

## Review findings and cleanup

The reviewer caught a secondary Cancel background incorrectly restricted to hover-capable input.
It was fixed and covered by WEB-STYLE-02. An intermediate 119-case run had one assertion failure:
a test compared the entire class string, including new generated classes. The test now checks
actual event-target identity while retaining native trust, prevention and routing assertions.
The final 121-case run above supersedes that intermediate result; no behavior assertion was removed.

Obsolete publication gates, fabricated replacement path labels and stale historical locators were
corrected. Eighteen superseded reports were retired whole, with original Git objects and SHA-256
in [the history ledger](../historical-records.json). Unresolved storage canaries remain intact.
Current tracked text/path inspection includes hidden specialist configuration. Git history and
ignored private captures/backups are preserved, not rewritten or published.

Schema fixture changes are editorial only: a provenance path became a Git blob identity and
project-note terminology was normalized. Independent comparison confirms unchanged tables,
columns, indexes, relationships, groups and reference SQL. New fixture SHA-256:
`b023939466f45b15d14331b4ba839ea5ffed3f345e60496c07869c26ae120653`.
Original fixture/report bytes remain in Git; old results were not rewritten into current passes.

Owner integration remains pending. Merge parents first, retarget this task and repeat affected
integration checks. Browser evidence uses headless Chrome on this macOS host, not native E2E.
