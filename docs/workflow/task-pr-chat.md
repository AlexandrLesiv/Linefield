# Task → branch → PR → next chat

Adopted2026-10-19 by decision238. [Exact approved plan](task-pr-chat-plan.md) and
[approval record](../reviews/workflow-style-approval-2026-10-19.md) record the historical approval; decision239 overrides serial scheduling.
This is the current visual entry point. Bootstrap: [DX-G01](../../tasks/DX-G01.md). Decision239 adds [parallel task lanes](parallel-tasks.md).

![One task, one branch, one PR](../diagrams/v2/task-pr-lifecycle.svg)

Assign one ready executable task in a fresh chat. The harness checks authority/dependencies,
creates or reuses its branch, coordinates scoped design/implementation/tests and independent
review, and opens one PR in the approved repository. The owner reviews or requests changes;
fixes remain in the same branch/PR. The owner merges. Missing approvals or required evidence
block dependent work rather than silently expanding the task.

![Verified completion and next-chat handoff](../diagrams/v2/next-chat-handoff.svg)

After the owner reports completion, verify the intended PR is merged and record its merge SHA.
Compare tested and integrated content, run affected checks when required, and confirm acceptance.
Only then issue that task’s completion receipt. Independent ready tasks may receive a fresh-chat
prompt while another PR awaits review; their dependencies and ownership must be explicit. If verification is
missing, keep integration pending. A replacement chat for an unfinished task reuses its branch
and PR only after the prior writer stops and ownership transfers.

Milestones such as S02/P05 contain multiple executable tasks; one child PR does not close the
whole milestone. Use [the task template](../../tasks/_template.md), [Git strategy](git-strategy.md)
and repository PR template. No automatic merge, release or scheduled review polling is enabled.
Diagrams explain the adopted process; they do not claim every proposed feature is authorized.
