# DX-T02 — task packages and read-only review pilot

Type: executable leaf. Status: owner review. Owner: lead/current chat.
Branch: codex/dx-t02-task-packages. Base: afb82c5deb4cfa3d3e9a641659a20887b9689b8a.
Stacked on P05-S01 / PR #3 because the pilot references its exact retained evidence.
Owner merges parents first; retarget and verify integration afterward. PR: [#4](https://github.com/AlexandrLesiv/Linefield/pull/4).

## Scope and authority

Owner approved structured task documentation, schema/pilot conversion and visual preview,
including PR and applicable automated-test links. Deliver JSON schema, two supplemental packages,
validation, compact generated Markdown and static HTML review pages. The preview is proposed UI
for owner review, not a complete execution workbench. No drawing app, storage or engine changes.
Preserve original task documents and evidence bytes. No automatic GitHub mutation or test execution
from task data. Repository publication remains authorized; only the owner merges.

Lead owns pilots, rendering/generation, root integration and handoff. build_reliability owns
schema/model/validator/tests. Designer specifies and reviews the preview; fresh reviewer audits.
No competing writers; isolated worktree. Shared contract frozen before consumer implementation.

## Acceptance and edge cases

- TASK-01: versioned JSON and strict bounded validation reject unsupported/unknown fields, bad
  types, duplicate IDs and unresolved references. Required authority/security/scope retained.
- TASK-02: preserve historical bytes; hash-check regular in-repository sources; reject path escapes,
  symlinks, missing files and digest mismatches. Recorded outcomes never imply current freshness.
- TASK-03: PR URL/repository/number agree; observations have dates and revisions. Planned tests
  differ from executable tests. Criteria link test/evidence IDs; completion is not PR closure.
- TASK-04: deterministic HTML/Markdown generation and drift checks. Safe text-only rendering of
  imported prose/logs, no executable HTML/commands/network loading. Failed evidence stays visible.
- TASK-05: desktop/narrow, keyboard/disclosure/navigation and malicious-text headless browser tests;
  designer plus independent review. Shared approved tokens provide the visual proposal.

Security: existing sensitive boundary, repository data becomes browser-visible output. Treat
source content as untrusted display text; validated repository paths and pinned hashes, escaping, CSP and no JS or
command endpoints. Existing local action contract is reused as context, not extended execution.
Reject malformed evidence before generation; do not replace originals or infer missing approval.
No native or production implementation authorization follows from a pilot task record.

Stop with verified pilot, visual review and one PR ready for owner review. Wider migration and
execution/edit controls are separate slices. Root check, focused unit and preview browser checks
are required; drawing-app browser rerun is unnecessary when its inputs are unchanged.
