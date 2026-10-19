# DX-T02 minimal preview v3 — independent review

Reviewer: `review_task_packages`, 2026-10-19. Reviewed the working tree on
`codex/dx-t02-task-packages` above `2db0cd6aa528ebcdcc64988048f97422ac12ea3f`.
The 35 entries in [tested-source.json](tested-source.json) identify the exact source,
generated outputs and selected reference inspected. This is the same DX-T02 / PR #4
revision, not another executable task or implementation branch.

Verdict: no blocking technical finding in the bounded v3 presentation change.
Owner selected the minimal reference and authorized updating the HTML. Technical
review does not replace designer assessment, owner integration or merge approval.

## Actual changes and challenged cases

The renderer now places supporting information in four initially closed native
`details` elements. The 672px reading column and simpler index change presentation;
the schema, validator, evidence readers and local-server authority remain unchanged.
P05-S01 title/summary are editorial changes to pilot metadata. Original task briefs,
source reports and v1 evidence are preserved.

Checked the consequential hidden-content case: scope/authority/dependencies,
acceptance and test references, evidence limitations, independent review, dated PR
metadata and handoff are still rendered and reachable through ordinary disclosures.
The blocked S02L state and concrete next-step limitation remain visible before any
disclosure opens. P05-S01 still says it awaits review; the primary PR control is a
link, not an approval or merge command. Historical verification limits remain with
the evidence and technical information rather than being removed.

Checked nested disclosure keyboard behavior, focus indication, re-closing the parent,
narrow overflow and long unbroken text. The browser tests now explicitly assert four
closed groups at entry, keyboard opening of Verification, nested opening/focus,
return to all groups closed, and visible PR/blocked states. Existing hostile-text,
no embedded active content and closed route-boundary assertions remain in place.
No hidden retry, broader tolerance or historical-pass substitution was introduced.

## Verification

- Independently reproduced all 18 task unit tests, `generate.ts --check` and
  `git diff --check`: passed. The original source/evidence hashes continue to
  validate through the package loader and generation check.
- Independently hashed all 35 tested inputs/outputs: exact match with the v3
  manifest. Checked all seven local capture hashes against the eight-scenario
  browser report: exact match.
- Inspected the fresh root log: 124 tests and strict root/web types, lint, formatting,
  generated checks and source-size gates passed. Reviewed the fresh browser runner
  and report: eight scenarios passed in headless Chrome. Did not run a competing
  browser suite or claim independent full-root execution.
- Visually inspected the P05-S01 desktop and S02L narrow captures. Content fits the
  single reading column; the blocked milestone shows its limitation immediately.
  These spot checks are not a comprehensive accessibility or design certification.
- Inspected the diff: no original task documents or historical evidence files were
  changed. V1 records retain their original source identities rather than being
  rewritten to claim they tested v3. Generated Markdown changes match the two
  editorial P05-S01 metadata changes.

## Limits and integration

TASK-04/05 and CT-08 documentation/evidence behavior are the relevant scope. No
production CT/INV/SU acceptance, native runtime or physical-device claim is added.
The earlier pilot's trusted-root, publication-selection, historical freshness and
declared PR/test-link limitations remain applicable. Headless keyboard checks do not
cover physical assistive technology, all browser implementations or print behavior.

Designer review of the selected v3 presentation is a separate required handoff record.
Owner merge and parent-first integration remain pending. Re-review source changes or
integration conflicts that invalidate this exact working-tree evidence.
