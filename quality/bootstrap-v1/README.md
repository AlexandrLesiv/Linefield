# DX-G01 bootstrap evidence — 2026-10-19

Base: fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7 plus preserved delivered work.
Task branch: codex/dx-g01-workflow-bootstrap. This is a one-time consolidation;
new bootstrap changes concern workflow, publication preparation and diagram presentation.
The containing Git commit identifies this evidence revision. [Tested source hashes](tested-source.json)
identify the application/tool files actually checked, independently of later documentation edits.

## Verification

- Root aggregate: passed, 87 tests plus root/web type checks, lint, formatting and source-size gates;
  [raw output](root-check.log).
- Web production build: passed; assets index-DCSOpgQJ.js and index-z7JnId1S.css;
  [raw output](web-build.log).
- Full browser suite: 118 passed, zero failed/skipped/flaky, 135.4 seconds;
  [structured results](browser-results.json), [raw output](browser.log).
  Playwright 1.64.1 with Chrome channel; installed Chrome 155.0.8059.80 verified at handoff.
  Headless browser evidence on this macOS host; not physical device/native or all-browser coverage.
- SQLite reference-schema constraints: six tests passed, [TAP](schema-tests.tap).
- Deletion v4 DBML: valid, [output](dbml-validation.log). Validation does not approve mechanisms.
- SVGs: eighteen rendered at full canvas size; [source/render hashes and geometry](diagram-renders.json).
  PNG previews are retained locally under ignored .build-cache; editable SVG sources are published.
  Text bounding boxes are checked for clipping/overlap; designer and independent semantic review
  supplement those mechanical checks. Historical source snapshots remain unchanged.

## Preservation and publication boundary

[Preservation record](preservation.json): all 9,295 entries and 1,152,570,359 file bytes verified
before bootstrap changes. This same-disk copy includes ignored/private work and Git history;
it is not an off-device backup. Never publish or clean its .build-cache directory.
Private Concepts captures, dependencies, build products, downloaded SQLite vendor bundles and
local recovery/render copies are excluded. Small synthetic fixtures and authored review assets
are included. No new CI service, branch protection, merge or release is claimed.

Independent review checks publication paths/common credential patterns, approval hashes,
workflow gates, source-to-SVG semantic fidelity and rendered presentation. Routing ambiguities
and the planned Cargo/Xcode label were corrected before final review. A bounded credential scan
is not a proof that every possible sensitive string can be detected.
Final configured designer review and fresh independent reviewer clearance: no remaining publication
blocker. Reviewer verified all18 views,163 tested-input hashes,36 source/render hashes and448
publication paths; five archived blocks match verbatim and six historical documents are unchanged.

Staged whitespace inspection retains four pre-existing blank-at-EOF warnings in the hash-pinned
deletion DBML sources, published DBML evidence and historical motion report. These are cosmetic;
the preserved snapshots were not rewritten to obtain a clean whitespace report.

## Remaining limits

Durable storage adoption and production engine/library implementation remain gated. Existing
storage failure evidence is retained, including damaged SAH-pool metadata truncation and unproved
proxy retirement. Physical assistive/input/IME, native hosts, actual Zed UI and unavailable compiler
lanes are not passes. Owner PR review and merge remain required; subsequent integration must verify
the actual merged SHA/content before a next-task chat handoff.

## Publication receipt

[PR #1](https://github.com/AlexandrLesiv/Linefield/pull/1) is open against main at
fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7. Reviewed consolidation commit:7083fb4.
The subsequent handoff commit only records the actual PR/status; tested application inputs remain
identical to tested-source.json. Owner review/merge pending; no next implementation task started.
