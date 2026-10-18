# DX-T02 task package pilot evidence

Base afb82c5deb4cfa3d3e9a641659a20887b9689b8a, branch codex/dx-t02-task-packages,
explicitly stacked on PR #3. The visual preview is proposed v1 for owner review.

- [Root checks](root-check.log): 124 tests passed (106 existing +18 task tests), strict root/web
  types, lint, formatting, generated drift and source-size gates. No dependency upgrades.
- [Browser checks](browser-results.json), [run log](browser.log): 8 passed in headless Chrome.
  Desktop/narrow index and two task pages, keyboard links/disclosure/focus, blocked versus recorded
  outcome labels, hostile text/long-label layout, no embedded script/media requests and route bounds.
- [Exact source/output hashes](tested-source.json) identify the tested working tree; the outputs
  are generated HTML/Markdown, not a separately compiled product build.
- [Preserved evidence](preserved-evidence.json): all 15 committed source/evidence references match
  their original Git bytes and declared hashes. Both original task files remain unchanged.
- [Designer review](design-review.md) and [independent review](independent-review.md) record scope,
  findings, fixes and limits. PNG captures remain local under .build-cache/task-preview; their
  hashes are in the browser manifest. No private captures or original failure fixtures were moved.

Reviewer findings fixed: generated-page inventory now rejects orphans; generated Markdown escapes
active markup/link syntax; immutable artifact revisions are separate from runtime source identity;
long labels wrap; metadata typography uses the approved 14px minimum and shared tokens.

This pilot validates task record shape, reference integrity and safe presentation. It does not
prove source selectors discover tests, verify remote GitHub state during generation, compare old
runs to current product code, scan for secrets or certify product/native accessibility. Public
inputs were explicitly reviewed. The original styling/browser and storage results are historical
records, not tests rerun by this task. The drawing application is unchanged; no drawing-app test
rerun is claimed. Native/physical input and a full rich-text renderer are outside this preview.

PR integration and approval of the preview layout remain with the owner. Future task migration,
result adapters, current-source freshness and an executable workbench are separate slices.
