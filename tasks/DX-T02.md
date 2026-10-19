# Structured task records

**Task:** DX-T02 · **Review:** [PR #4](https://github.com/AlexandrLesiv/Linefield/pull/4)
**Depends on:** [P05-S01](P05-S01.md). Owner acceptance is pending.

## What changes

A task links its goal, scope, PR, app tests and design sources in one structured record.
A short authored brief makes it readable in GitHub. Shared requirements stay in their original
source documents rather than being copied into every task.

## Current boundary

Task records are documentation. They do not run tests, start a task UI, grant approval, merge PRs
or synchronize status from GitHub. Local validation checks records and references. The owner
requested the source-only presentation during PR review; DX-C01 applies that cleanup.

## Acceptance

- TASK-01: versioned JSON validates explicit fields and rejects unsupported or malformed data.
- TASK-02: linked authored sources use safe paths and honest byte/revision identities.
- TASK-03: PR identity and dated status agree; test links distinguish planned and implemented cases.
- TASK-04: one readable authored brief and structured metadata, without duplicate generated views.
- TASK-05: independent review checks readability, approval boundaries and preserved app coverage.

## Examples and contract

- [Local styles](P05-S01.md) · [JSON](P05-S01/task.json)
- [Durable library](S02L.md) · [JSON](S02L/task.json)
- [Task format](../docs/workflow/task-packages.md) · [Schema](../shared/tasks/task.schema.json)

No drawing app, storage or engine changes are included. Broader record conversion must preserve
real statuses and requirements; incomplete evidence must not become an inferred pass.
