# Linefield Git strategy

Adopted under decisions 238–239. Follow [parallel task rules](parallel-tasks.md). The owner merges main; authorized task work may be committed and proposed through its PR.

## Selected model

The owner adopted the [task → PR → fresh-chat lifecycle](task-pr-chat.md).
Under that plan, each executable leaf task owns exactly one branch and one PR; parent milestones
do not get implementation branches. Independent ready tasks may overlap owner review under decision239.

Use a single integration branch, `main`, with short-lived `codex/<task>-<purpose>` branches.
Keep the monorepo together: shared contracts, Rust, hosts, resources, tests and documentation
evolve in one reviewable change. Avoid permanent web/macOS/engine branches or a separate develop
branch: they would delay integration and split contract truth while this small project evolves.
One branch represents one bounded deliverable, not five hours of unrelated work.

Examples: `codex/p05-library-admission`, `codex/s02-create-contract`,
`codex/dx-documentation-checks`. Platform work can have separate task branches once independently
authorized, but shared contract changes need one owner and an agreed base before parallel work.

[Git integration workflow source](../../shared/diagrams/definitions/git-integration-loop.json)


## Daily change and agent workflow

- Start from the latest reviewed integration state. Record base SHA, task, owned paths, approval
  scope, contract/invariant/scenario IDs and stopping condition. Inspect status before switching.
- Prefer an isolated worktree for implementation writers, as AGENTS requires. A worktree starts
  from committed state and does not inherit the current dirty checkout. First preserve and commit
  the required base; never let an agent unknowingly work from stale contracts.
- Respect at most three concurrent subagents and two implementation writers; independent ready tasks can overlap.
  Give shared contract/schema files one owner. Read-only reviews need no separate writer checkout.
- Commit a coherent behavior plus its tests, relevant documentation and evidence references.
  Titles explain the outcome, e.g. `fix(web): preserve keyboard focus in settings` or
  `docs(storage): record recovery adoption blocker`. Task IDs belong in the body when useful.
  Conventional prefixes are a readability convention, not a new commit-lint dependency.
- Keep commits small enough to review/revert; do not split tests away from the behavior they prove.
  Separate unrelated dependency upgrades, formatting churn and generated-resource changes.
- Rebase only private, unshared task history when safe. Once other work depends on a branch,
  coordinate integration without rewriting it. Never force-push shared history. Resolve conflicts
  by preserving both intentions and repeating affected tests, not blanket ours/theirs selection.

## Integration and verification

Use a local review packet now; use a draft PR once remote publication is authorized. Include
problem/result, scope and exclusions, approval references, contracts/diagrams, exact evidence,
risks and rollback. A PR is a review mechanism, not automatic main-merge permission.

Prefer squash integration for a single bounded task with fixup/checkpoint commits. Preserve a
reviewed multi-commit series when individual steps are useful and coherent. Decide before final
verification. Verify the actual integration tree after conflict resolution; a squash changes the
commit identity even when its tree matches. Never relabel pre-integration results as a new run.

Require applicable checks, fresh independent review and designer review for UI changes. Record
base/commit and tree or source hashes, tool/browser versions, test IDs, results and gaps. For dirty
builds retain exact hashes as already practiced. Reports should identify their tested input without
requiring a self-referential commit hash. Add the final integration reference as provenance; retain
the original report. Re-run affected checks whenever the tested source changes.

Current local commands exist: `pnpm check`, focused package checks and browser tests. They are
not remote required checks until CI actually runs them. Future hosting protection should prevent
direct main pushes/force-pushes and require review plus applicable checks; configuration is a
separate action. Do not add branch rules that depend on nonexistent CI jobs.

## Recovery, artifacts and later releases

Revert a bad integrated code change with a new commit; never reset published main. A code revert
does not undo an on-disk schema migration or recover overwritten data: those need their reviewed
compatibility/recovery plan. Keep task branches/worktrees until integration and evidence are verified;
archive only when needed untracked/ignored data is separately preserved.

Commit authored specifications, tests and necessary source fixtures. Generated reports, logs, captures and diagram exports remain local and untracked.
Keep regenerable downloads, bulk captures and profiles out of ordinary history. Record hashes,
tool versions and retrieval/retention instructions for external artifacts; do not claim a hash
alone preserves the artifact. Propose artifact hosting/LFS only if actual size needs justify it.
No cleanup may remove unresolved failure evidence under existing retention rules.

No release branch now. When real distribution exists, tag an owner-approved tested revision;
create maintenance branches only for versions actually supported. Hotfixes go through the same
review and verification, then propagate to affected supported lines. Signing, remote hosting,
release automation and publication remain separately scoped.

Background reference: [Git's workflow documentation](https://git-scm.com/docs/gitworkflows).
Linefield's recommendation is intentionally simpler than a multi-integration-branch workflow.
