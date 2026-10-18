# One task, one branch, one PR, one working chat

Proposed2026-10-19 in response to the owner's workflow request. This document plans the transition;
it does not restructure existing tasks, create a remote/PR or approve unreviewed implementation.
Read with [Git strategy](git-strategy.md) and [visual architecture](visual-architecture.md).

## Recommended operating model

Use a fresh chat for each **bounded executable task**, with one stable task ID, one branch and
one PR. The harness coordinates design, implementation, tests and independent review within that
scope. The owner reviews and merges on GitHub. After the owner reports completion, the harness
verifies integration and supplies a short prompt for the next ready task in a new chat.

Keep review replies and fixes in the task's original chat/branch/PR. If a chat must be replaced
because it is long or interrupted, resume the **same task and PR** with a checkpoint; never create
a duplicate branch merely to obtain fresh context. One chat per task is the normal lifecycle,
not a reason to abandon recoverable work or split a review into unrelated tasks.
Before a replacement chat writes, confirm the previous writer is stopped/idle, transfer checkout
ownership explicitly, and verify no other agent is still mutating that branch/worktree.

Fresh chats avoid carrying the entire conversation into the next task, but do not guarantee a
particular token saving. Governing instructions, scoped source and evidence still need reading.
The practical goal is a small reliable entry packet instead of an ever-growing transcript.

## Task and milestone structure

Keep existing S02, S02L, S02M, P05, S00A–D and DX00/01 records as **milestones/workstreams**.
They track multiple outcomes and partially completed platform/evidence work; they are not each
one PR. Preserve their IDs, historical evidence and links. P05-G01/P05-D01 are examples of smaller
deliverables, although their delivered dirty-tree changes are not thereby GitHub-integrated.

Create child task briefs only as they become ready. Each must have one reviewable outcome and
include its source, tests, diagrams and documentation together. Do not split every role or file
into a task. A feature that can be safely reviewed as one coherent change stays together.

A task is appropriately sized when its acceptance criteria, rollback and approval scope can be
explained in a short review; it can be verified independently on its stated dependencies; and
the next task does not require unfinished changes hidden in the working tree. Prefer a few focused
working sessions, but use semantic boundaries rather than time or line-count quotas.

New schema/topology/security/product choices should be separate **proposal/probe tasks** before
the implementation task where needed. A negative experiment result can complete its investigation
task while leaving the feature blocked. Merging a design/probe PR does not automatically authorize
production implementation. Routine design details within approved scope remain inside the feature
task; do not create an approval round for every edit.

## Task brief: required entry packet

Extend the existing task template during migration; do not replace its security, CT/INV/SU,
scenario and evidence requirements with a lighter checklist. A ready child task needs:

| Field | Content |
| --- | --- |
| Identity | Stable ID/title, parent milestone, type: implementation/proposal/probe/fix |
| Outcome and exclusions | Observable deliverable and explicit non-goals |
| Dependencies | Prerequisite task IDs and merged revisions or exact approved artifacts |
| Authority | Scope/design/mechanism approval references and unresolved blockers |
| Work location | Repository, base branch/SHA, task branch, worktree, PR link when available |
| Responsibility | Lead, implementation owner, scoped specialists, independent reviewer |
| Entry reading | Short current summary and exact relevant files/sections; historical links on demand |
| Acceptance | CT/INV/SU/scenario IDs, failure cases, required checks and review evidence |
| Exit/handoff | Current state, blockers, review result, tested source hashes, next candidate |

Aim for a concise current summary at the top, linking detailed contracts rather than copying them.
The task brief owns scope and agent evidence; GitHub owns observable PR/review/merge state; the
decision log owns approvals. These are complementary authorities, not three independent copies of
the same status. Keep tasks/README as a compact milestone/ready-task index and docs/RESUME as a
small project entry point. Put older narrative in linked history without rewriting approval records.
This proposed reading optimization never overrides required reads in governing instructions.

## Lifecycle and authority

1. **Ready:** dependencies and approval boundary are clear. Owner assigns the task in a fresh chat.
   Harness checks current Git/PR state and creates/reuses its `codex/<task-id>-<purpose>` branch.
2. **In progress:** scoped design, implementation and tests. Specialists contribute; one writer
   at a time owns the task checkout. Multiple specialists may review independently. Serial writer
   handoffs preserve the strict one-branch rule and avoid concurrent index/checkouts/conflicts.
3. **Blocked:** record the exact missing decision, dependency or evidence. Preserve work and
   provide a resume checkpoint. Never fill the gap with an invented approval or broaden scope.
4. **Internal review:** implementer supplies evidence; fresh reviewer and applicable designer
   review the exact candidate. Resolve findings and repeat affected checks. A human review is
   still required; agent review does not replace it.
5. **Awaiting owner review:** push authorized content to the configured GitHub repository and open
   one PR. Use draft status while required evidence is incomplete. Ready status requires applicable
   internal review/checks or clearly identified owner-disposition gaps, never hidden skipped tests.
6. **Changes requested:** handle owner comments in the same PR/branch; summarize changes and fresh
   evidence. Escalate material scope changes before coding. Do not start the next task meanwhile.
7. **Merged / integration verified:** owner merges, then notifies the harness. Verify the actual PR
   destination, merged state and merge SHA; map tested tree to integrated changes. Fetch/read-only
   inspection does not permit overwriting a dirty checkout. Run affected integration checks when
   the merged tree differs; a merge flag alone is not proof that tests passed on changed content.
8. **Done and handed off:** confirm required acceptance and integration checks; record nonblocking
   limitations, then supply the next-task prompt. If merge destination/SHA or required changed-tree
   checks cannot be verified, label the task integration-pending and block dependent next tasks.
   A separately ready independent task may be suggested with that distinction explicit. A closed,
   unmerged PR is cancelled/superseded, not successfully delivered.

No automatic main merge or release. After the user approves this workflow and identifies the
GitHub destination/access, assigning an implementation task under it includes opening that task's
PR. This planning request alone does not authorize publishing the current working tree somewhere.

## PR and review handoff

Each PR includes the task ID, concrete before/after outcome, scope/exclusions, linked approval,
SVG architecture/UI evidence where relevant, test results with exact input/build identity,
independent findings/disposition, known gaps and rollback/migration implications. Keep large raw
logs out of the description. Link retained evidence; do not publish private captures or secrets.
Future CI should run existing checks before inventing new gates; absence of CI is explicit.

Before opening the PR, commit the task handoff as **awaiting owner review**, not Done. Its final
merge SHA cannot appear in its own pre-merge commit. GitHub is authoritative for merge state;
record the completion receipt in the final chat and a short next-task prompt. The next task may
add that verified receipt to the project index in its own PR. Do not silently push a post-merge
documentation commit to main or reopen the completed branch solely to store a SHA.

Reviewer comments after a merge are a new follow-up task/branch if new code is needed. Corrections
before merge belong to the existing task. Dependent tasks normally start from merged main;
stacked PRs are an explicit exception with a named base/dependency, not the default.

GitHub's review model supports comments, suggestions, approval and change requests; this project
adds its specialist/evidence and owner-integration rules around that normal loop.
[Official review guide](https://docs.github.com/en/pull-requests/get-started/reviewing-pull-requests-quickstart),
consulted2026-10-19. No automatic review polling or remote automation is configured here.

## Initial task separation proposal

These are proposed child tasks, not created/authorized implementation briefs:

| Candidate | Parent | Single PR outcome / entry condition |
| --- | --- | --- |
| Git/workflow bootstrap | DX | Preserve and inventory current work, propose reviewed baseline and destination; establish branch/PR conventions after owner choices |
| Task index migration | DX | Classify umbrellas versus executable leaves; add entry/handoff fields and next-ready index without losing evidence |
| Diagram style adoption | S00A | Final SVG specification and examples after owner accepts the exact version; no app theme changes |
| Storage preservation experiment | S02/P05 | Synthetic non-destructive admission/recovery evidence and honest adoption recommendation; no product persistence |
| Storage mechanism review | S02 | Exact chosen mechanism, threat/failure contract and owner disposition based on experiment |
| Empty-library format/service conformance | S02L/P05 | Reviewed Rust/typed-adapter/bootstrap validation subset; requires exact scope and mechanism approvals |
| Durable create/list/reopen | S02L/P05 | Smallest end-to-end durable empty-drawing path with faults and actual browser evidence |
| Durable rename/reconciliation | S02L/P05 | Atomic rename receipt and gallery repair with UI/error/recovery tests |
| Recoverable deletion | S02L | Separately reviewed Stage/Undo/departure implementation after durable base |

The implementation breakdown is provisional: resolve the storage mechanism before freezing
module/task boundaries. Each implementation slice includes the recovery it needs; do not defer
data preservation to a final polish task. Real stroke engine work remains a separate gated stream.

## Safe transition from today

There is currently no configured Git remote or local main, and substantial intentional uncommitted
work on codex/project-foundation. Follow the preservation-first Git plan before applying ordinary
task branching. Do not sweep all work into the first new task PR or claim previously completed
prototype work has already been merged. Agree the repository URL/privacy, review baseline and
first integration path; preserve source/evidence exclusions before pushing anything.

After this one-time transition, use the new lifecycle for newly assigned leaf tasks. A compact
handoff should be roughly150–300 words plus links, rather than a transcript or a new global plan.

## Next-chat prompt template

> Work on TASK-ID: TITLE in /Users/oleksandr/projects/linefield. Read AGENTS.md, the current
> docs/RESUME.md, tasks/TASK-ID.md and its scoped contract/approval links. Previous task TASK-PREV
> was merged in PR URL at MERGE-SHA; verification: RESULT. Confirm repository/base state before
> starting. Use branch codex/TASK-ID-purpose (reuse it if already present) and one PR for this task.
> Outcome: ONE-SENTENCE GOAL. Exclusions: NON-GOALS. Authority: EXACT APPROVAL REFERENCES.
> Design, implement, test and obtain specialist/independent review within that scope. Preserve
> unrelated work and observe approval gates. Open the PR in APPROVED-REPOSITORY, report evidence
> and wait for my review. Do not merge or start the next task. On completion notification, verify
> integration and provide a concise prompt for the next ready task in a new chat.

Replace every placeholder with verified facts. If the next task is blocked, state the blocker
instead of offering a prompt that falsely implies readiness. No repeated automation is required.
