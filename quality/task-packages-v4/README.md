# Task tracker v4 — complete inventory and stable layout

Owner requested all tasks, concise labels and stable scrollbar space. All 44 task Markdown
files appear once; two structured packages override their source rows. Other pages preserve
source prose with an explicit unreconciled-status notice. README/template are not task rows.
Original task/evidence records are preserved, except the current DX-T02 handoff updated for this slice.

TASK-04 inventory/escaping/capacity coverage and TASK-05 browser coverage accompany this change.
Root check passed 127 tests, strict types, lint, formatting, generated drift and source-size gates.
Nine headless Chrome browser scenarios passed, including source navigation, keyboard focus,
closed disclosures, overflow and unchanged heading x/width when disclosures open. Root computed
scrollbar-gutter is stable. Headless results do not claim physical assistive or other-engine coverage.

Exact source/output hashes: tested-source.json. Logs: root-check.log, browser.log.
Browser/host versions and seven screenshot hashes: browser-results.json. Captures stay local in
.build-cache/task-preview-v4. Visual and independent findings: design-review.md and
independent-review.md. Earlier v1/v3 evidence is unchanged; this is tooling UI, not app behavior.
