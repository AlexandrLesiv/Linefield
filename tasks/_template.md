# TASK-ID — Outcome

Template only. Copy/adapt for new tasks; existing tasks must add these fields before implementation.
An empty checkbox or default text is not evidence. No application implementation authorized yet.

Type: executable leaf / milestone (milestones aggregate child tasks; no single implementation branch).
Parent milestone: pending. Task ID/title: pending.
Status: planned / ready / in-progress / internal-review / owner-review / changes-requested /
blocked / integration-pending / done / cancelled. Current status: planned.
Branch: codex/TASK-ID-purpose. PR URL: not opened. Intended repository/base: pending.
Current writer/chat/worktree: pending; transfer only after previous writer is stopped/idle.
Dependency task IDs and verified merged revisions: pending.
Scoped entry reading: pending. See docs/workflow/task-pr-chat-plan.md and decision238.
Owner: unassigned. Scope/non-goals: pending. Dependencies: pending.
Base revision or exact uncommitted snapshot: pending. Owned paths: pending.
CT/INV/SU/SEC acceptance IDs: pending. Independent reviewer: unassigned.

Completion handoff: PR/merge SHA and required integration verification pending; next eligible
task and150–300-word fresh-chat prompt supplied after owner notification and verified integration.
Before merge keep the task owner-review; GitHub supplies its future merge identity. Never push
a post-merge status-only change directly to main to fill this template. Record nonblocking gaps;
required unresolved verification blocks dependent tasks. A closed-unmerged PR is not Done.

## 1. Security impact — completed before implementation

- Classification: not assessed / no boundary change / existing sensitive boundary / new or changed boundary.
- Untrusted inputs and who controls them: pending.
- Data read/written/exposed and granted authority: pending.
- Trust, lifetime, ownership, persistence, dependency or privilege changes: pending.
- Concrete failure/abuse scenarios and affected SEC/invariant IDs: pending.
- Existing approved design reference, or proposed design packet: pending.
- No-impact rationale when applicable: pending; a label alone is insufficient.
- Lead classification confirmation, assessor/date/snapshot: pending.

## 2. Design gate — before sensitive implementation

- Interface/state/data-flow proposal with alternatives, bounds and rejection behavior: pending.
- Independent design review record and reviewed snapshot: pending or justified not applicable.
- Findings and disposition: pending; no silent waivers.
- Owner approval of material architecture/security choices: pending; link actual approval and version.
- For unchanged approved mechanisms: link that approval and explain why scope stays within it.
- Required design review approval reference: pending or justified not applicable.
- General implementation authorization: pending; design approval alone is not this authorization.

Lead may mark ready only when applicable reviews/approvals are real and outstanding blockers resolved.
Independent authorized work may continue while a sensitive slice waits. Material design changes reset
the affected gate; do not ask again for ordinary fixes within already approved design scope.

## 3. Negative acceptance and implementation evidence

| Scenario/SEC ID | Trigger/hostile condition | Required outcome and state that must stay unchanged | Layer/platform | Executable test ID | Result/revision/artifact |
| --- | --- | --- | --- | --- | --- |
| Pending | Pending | Pending | Core/boundary/process/native E2E as applicable | Not implemented | Not run |

Cover relevant malformed/unauthorized/stale/duplicate/overload/crash/permission cases alongside happy
paths. Implementer owns tests with the feature. Tests must assert rejection, no unauthorized side
effects and useful bounded diagnostics; absence of a crash alone is insufficient. Link exact builds,
configuration and artifacts. Distinguish planned, implemented, passed, failed, skipped and flaky.
Native replay does not replace real native E2E. No relevant case is silently dropped as inconvenient.

## 4. Independent implementation review and completion

- Actual diff/revision or exact snapshot reviewed: pending.
- Independent reviewer identity/date and security focus: pending.
- Matches approved design; deviations and renewed approval: pending.
- Tests inspected/executed, missing evidence and limitations: pending.
- Findings, fixes, re-review or explicit owner exception (scope/expiry): pending.
- Threat model/invariant/task documentation updated with the change: pending.
- Lead acceptance decision with evidence: pending.

Use quality/security-review-template.md for the review record. Author self-review is not independent.
Required unresolved review/test evidence prevents complete status. Merging/release still needs owner
approval. Process requirements are mandatory; no automated template checker exists yet.

## 5. Automated gate evidence and threat-model delta

- Applicable automated actions and why any are not applicable: pending.
- Exact revision/build/tool/config/advisory snapshot, results and artifacts: pending.
- Missing/skipped/stale gates and scoped exception/expiry/approval: pending.
- Changed SEC risk/boundary records and diagram links, or specific unchanged rationale: pending.
- Mitigation state (planned/implemented/verified), residual risk, owner and next review trigger: pending.
- Independent check that actual changes match declared impact and threat delta: pending.

No missing evidence becomes pass; no historical review is silently reused for changed assumptions.
These fields are future validator inputs, not proof an executable validator currently exists.

## 6. Edge-case design and verification

Follow docs/quality.md#edge-case-design-review. Fill before behavioral implementation;
reuse section3 security cases by ID/link instead of duplicating them. For low-impact
nonbehavioral work, provide a specific not-applicable rationale.
Happy-path assumptions/state transitions: pending.
Applicable boundary/order/lifecycle/capacity/native-UX/security categories: pending.
Relevant exclusions with reasons: pending. Designer/platform consultation: pending.
Independent design reviewer/snapshot/findings/disposition: pending or justified not applicable.

| Case / existing scenario ID | Starting state + trigger/event order | Risk/priority | Expected outcome + preserved state | Owner | Test layer/platform + test ID | Evidence/status or unresolved decision |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | Not assessed | Pending | Unassigned | Not implemented | Not run |

Include consequential combinations and boundary pairs, not a fixed quota of cases.
Link tests/artifacts/actual revisions during implementation; never mark a planned test passed.
Update this table for reviewer-discovered cases and meaningful regression tests.
Unresolved required outcomes/review block affected readiness; missing required evidence blocks
completion. Owner review applies to material policy changes, not routine tests within approval.
This workflow is mandatory; automated table validation remains pending S01.
