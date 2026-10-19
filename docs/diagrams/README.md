# Shared diagram sources

Diagram content lives in [shared/diagrams/definitions](../../shared/diagrams/definitions);
[shared DTCG tokens](../../shared/diagrams/style.tokens.json) apply the
[current style](../design/diagram-style.md). Agents read these data-only sources and
relevant contracts. Generated SVG files are local review outputs and are not versioned.

| View | Source |
| --- | --- |
| Developer evidence | [definition](../../shared/diagrams/definitions/developer-evidence-flow.json) |
| Git integration | [definition](../../shared/diagrams/definitions/git-integration-loop.json) |
| Task lifecycle | [definition](../../shared/diagrams/definitions/task-pr-lifecycle.json) |
| Fresh-chat handoff | [definition](../../shared/diagrams/definitions/next-chat-handoff.json) |
| Parallel tasks | [definition](../../shared/diagrams/definitions/parallel-task-lanes.json) |
| Local coordination | [definition](../../shared/diagrams/definitions/incremental-coordination.json) |
| Recovery authority | [definition](../../shared/diagrams/definitions/recovery-authority.json) |
| Durable acknowledgement | [definition](../../shared/diagrams/definitions/recovery-durable-ack.json) |
| Reconnection | [definition](../../shared/diagrams/definitions/recovery-reconnect.json) |
| Gallery departure | [definition](../../shared/diagrams/definitions/gallery-departure.json) |
| Localization | [definition](../../shared/diagrams/definitions/localization-boundaries.json) |
| Shared E2E | [definition](../../shared/diagrams/definitions/shared-e2e.json) |

Generate when visual inspection is needed using the commands in the
[shared source guide](../../shared/diagrams/README.md). Read generation failures and
inspect the actual result; a generated diagram does not prove implementation or approval.
[Database views](../database/README.md) use the same tokens with SQL and shared annotations
as their content authority. Authored UI design boards remain source artifacts.
