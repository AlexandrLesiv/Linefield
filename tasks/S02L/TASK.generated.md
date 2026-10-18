<!-- Generated from task.json. Do not edit. -->
# S02L — Durable library

The gallery prototype exists\. Durable implementation is blocked by storage safety and concrete scope review\.

Stage: blocked. Implementation: not-authorized.
Branch: milestone; child tasks own branches.
Base: afb82c5deb4cfa3d3e9a641659a20887b9689b8a.
PR: not linked.

## Scope

Create, list, open and rename app-managed drawings with verified durable state; native library follows web\.

Non-goals: No production storage adoption from this experiment; No real drawing engine; No stacks, sync or bulk tools.
Authority: Preparation and synthetic experiments are authorized; durable/native implementation remains gated\.
Security: existing-sensitive-boundary — Future persistence protects user drawings\. The observed synthetic truncation blocks adopting the storage candidate\.

## Dependencies

- S02-P01 [hard]: Non-destructive admission experiment must address the observed corruption failure\.
- S02 [contract]: Concrete storage/bridge/contracts and scoped implementation approval remain required\.

## Acceptance and test links

- LIBRARY-CREATE-001: Create without naming, restart and reopen the same identity\.
  Tests: PLANNED-CREATE. Evidence: none recorded.
- LIBRARY-RENAME-001: Native rename preserves identity, Unicode and metadata authority\.
  Tests: PLANNED-RENAME. Evidence: none recorded.
- LIBRARY-OPEN-001: Open failure/cancel preserves the prior valid route and content\.
  Tests: PLANNED-OPEN. Evidence: none recorded.
- LIBRARY-DELETE-001: Recoverable removal and same-slot Undo survive reviewed races and recovery\.
  Tests: PLANNED-DELETE. Evidence: none recorded.
- LIBRARY-FAILURE-001: Storage failures are visible; no phantom durable items or lost user content\.
  Tests: PLANNED-FAILURE. Evidence: storage-finding.
- LIBRARY-NAV-001: Keyboard, accessibility, history and reduced-motion navigation preserve focus\.
  Tests: PLANNED-NAV. Evidence: none recorded.

## Read only as needed

- Why this milestone is blocked: tasks/S02L/brief\.md
- Full milestone requirements and policy extensions: tasks/S02L\.md
- Proposed empty-library implementation scope: docs/reviews/durable-library-implementation-scope-v1\.md
- Storage experiment: findings and limitations: quality/browser-storage-v1/README\.md

Detailed test selectors, source links and artifact hashes are in task.json. Recorded historical
results are not current-code verification. No tool command or approval is implied by task data.

## Handoff

Continue the authorized S02-P01 synthetic investigation\. Resolve storage safety and concrete contracts, then obtain scoped durable-library implementation approval\. Healthy storage cases do not clear the preservation failure\.
