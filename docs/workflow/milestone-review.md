# On-demand milestone architecture review

Use the repository skill from a Linefield-scoped chat:

~~~text
$linefield-review Review milestone S02 and identify architecture drift, evidence gaps and decisions needing my approval.
~~~

Other examples: review S08 against its accepted contracts; review current working-tree changes since
an explicitly named commit; review all planned platforms after a persistence milestone. These are
natural-language skill requests, not shell commands or parsed CLI options. If scope is omitted, the
lead infers it from the current task/status and states the assumption; asks only if materially ambiguous.
If skill discovery is unavailable, ask the agent to read .agents/skills/linefield-review/SKILL.md directly.

Project-local skills are discovered from .agents/skills; use a chat opened in Linefield, not the old
Native Sketch directory. Skill discovery/runtime availability must be verified in that session;
creation/validation here does not prove UI discovery. [Official guidance](https://learn.chatgpt.com/docs/build-skills).

## Scope and output

This is a review of the milestone's architecture and evidence, not an instruction to implement repairs,
run foreground tests or approve a release. Review source/contracts/task/decision drift, native behavior,
security/logging, performance/threading/resources, data/recovery, accessibility/i18n, tests/maintainability
and applicable distribution constraints. Planned and implemented platforms have different evidence.
No need to re-research every store on every invocation: check affected requirements and stale sources.

Lead records requested scope, repository root, HEAD/base/worktree status and exact reviewed artifacts.
When no commit exists or files are uncommitted, use file hashes and record that fact; never claim a
clean committed revision. Avoid reviewing moving targets: identify concurrent changes and recheck
changed files or label evidence stale. Old Native Sketch remains read-only reference, not current proof.

Delegate read-only specialist assessments in waves within the existing three-subagent limit:

| Role | Assessment / required output |
| --- | --- |
| rust_engine | Shared command authority, typed boundary/lifetimes, single writer, thread/cancel/revision semantics, viewer enforcement and architecture drift |
| Applicable macos_ui / ios_ui / android_ui / windows_ui | Native adapter/focus/lifecycle/permissions, host feasibility and actual input/device evidence; assigned Apple viewers explicitly included |
| rendering_performance | Skia/cache/GPU lifetime, resource limits and measurement validity; no unmeasured latency claims |
| build_reliability | Reproducibility, dependency/licenses, exact artifact/test/coverage freshness, packaging/signing/update evidence and missing gates |
| ui_ux_designer | Feature input inventory, routes, recovery and accessible task completion together with identified design/adaptive/motion/i18n/native-control fidelity; static planning is not a running-app review |
| database_designer when affected | shared schema/SVG approval, SQLite transactions/migrations/ownership/recovery and cross-channel/library implications |
| Fresh reviewer | Independent assessment of material findings and actual boundary/evidence; must not be the author of the change under assessment |

Lead explicitly assigns Linux/web/viewer coverage and records excluded platforms/reasons. Normally
invite applicable specialists, not every role irrespective of scope. A full all-platform request
covers every host's status in the report, including planned/unverified ones. Missing configured roles
must be disclosed; assign an available agent to the scope or report the gap, never fabricate a review.
Do not recursively delegate. Read-only specialists need no writer worktrees; lead alone writes the
report. If later repairs are authorized, follow normal writer isolation/contract approval rules.

Each specialist returns severity, concrete location/trigger, violated decision/contract, impact,
evidence, recommended repair/alternative, owner and whether a new owner decision is required. Mark
no finding versus not assessed distinctly. Disagreements go to lead with rationale, not majority vote.
Avoid broad redesign because another style is preferred. Preserve the feature-level input approval
workflow and view-only TV/watch scope. Check [store strategy](../distribution/channel-strategy.md)
when applicable; responsibility does not permit signing/accounts/submissions or new product features.

## Review report and handoff

Lead writes a new report under quality/milestones/ with a unique milestone/date/run name; preserve
previous reports. Include scope/snapshot, actual reviewers and exclusions, assessment by domain/host,
findings with evidence, approval drift, missing/stale tests, prioritized follow-up tasks and a small
owner decision list linked to [owner responsibilities](../owner-responsibilities.md). Verdict is ready
for the next stated stage, needs changes, or incomplete evidence; never a generic production-safe seal.
Architecture review alone cannot complete a milestone whose native/runtime acceptance is missing.

Provide recommended task briefs in the report; don't silently mark existing work complete or create
product changes. Existing evidence inspection is the default. Background tests require applicable
implementation/test authority; do not install tools or execute untrusted repo scripts just to review.
Native/GPU checks require an active explicit reservation; list them pending otherwise. No account/
security changes, external messages, merges or publishing. No recurring review automation created.

Suggested invocation points: before approving S02 concrete contracts, after gallery/persistence or
canvas integration, before S08 acceptance, before a new platform and before release/cloud changes.
These are review opportunities, not scheduled jobs or new approval barriers for routine fixes.
