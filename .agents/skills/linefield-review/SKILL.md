---
name: linefield-review
description: Coordinate an on-demand Linefield milestone architecture review with relevant specialists and produce one evidence-based owner handoff. Use for milestone or architecture audits, not routine fixes or implementation requests.
---

# Linefield milestone review

Use the Linefield repository containing this skill. Read its AGENTS.md, tasks/README.md and the
requested milestone/task, then follow docs/workflow/milestone-review.md and
 docs/owner-responsibilities.md (paths relative to repository root).

Identify scope and reviewed revision/base/working-tree state; if no commit exists, record exact
file hashes. State inferred scope when the request omits it; clarify only material ambiguity.
Respect current documentation-only versus implemented status and existing owner approvals.

As lead, delegate read-only review to relevant configured specialists under the workflow's routing
matrix, at most three subagents concurrently. Include a fresh independent reviewer for substantive
changes. Assign outcomes, snapshot, owned review scope, applicable contracts, evidence and stopping
condition. No recursive delegation. Record unavailable roles and review gaps honestly; when needed,
explicitly assign an available agent to the responsibility without claiming that configured role ran.

Check architecture/command/thread/data/security boundaries, native UX/UI and input approval, quality/
performance evidence and applicable store requirements. Prioritize affected domains; an all-platform
request still accounts for planned/unverified hosts. Preserve view-only TV/watch scope and feature-
level input design. Specialist recommendations do not approve material architecture changes.

Lead alone writes a unique report under ignored .build-cache/milestones/ with exact snapshots, reviewer coverage,
findings, evidence gaps, recommended follow-up task briefs and owner decisions. Preserve older reports.
Return the report link and concise verdict for the requested next stage. Missing runtime evidence
cannot pass native acceptance, even when the architecture review finds no issues.

Review invocation authorizes review/reporting, not repairs, new designs, installs, foreground tests,
benchmarks, credentials/permission changes, account/store actions, external messaging, merge or
publication. Reuse evidence by default; follow existing authority for any checks. Do not schedule
recurring reviews. Stop after the consolidated handoff unless the user separately authorizes work.
