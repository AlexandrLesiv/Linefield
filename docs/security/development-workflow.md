# Security during development

Status: owner-approved workflow, decision 150 (2026-10-16). Application implementation remains
unauthorized. These are mandatory agent/process requirements; automated gates are not installed.
The [S00E review](day-zero-review.md) supplies threat context, not blanket mechanism approval.

## Before a task starts

Lead records security impact: untrusted inputs, data/authority accessed, changed trust boundary,
relevant CT/INV/SEC IDs, negative acceptance cases and accountable implementer. A routine change
may state no boundary change with a reason; do not require a separate threat document for every
visual edit. Lead verifies that classification rather than accepting an unexplained no-impact label.

Sensitive triggers: import/parser/migration; ownership/persistence/deletion/export recovery; IPC,
authorization, FFI/unsafe memory; privileges/secrets/network/cloud; native dependencies/build scripts;
production test hooks, signing/update trust or changes to private-data handling. A relevant change
triggers review when introduced, not only at a release milestone. Updating a related boundary or
fixing a security issue triggers re-review; unrelated harmless edits do not require a ceremony.

Before implementing a material sensitive design, provide a compact interface/data-flow/state proposal,
trust assumptions, alternatives, failure modes, bounds and adversarial tests. An independent reviewer
challenges it and the owner approves material architecture/security choices. Previously approved
mechanisms need not be reapproved for ordinary fixes within scope; deviations must return for review.

## Ownership and independence

Existing implementers own controls and their tests: Rust shared authority/validation, platform
engineers native capabilities/unsafe wrappers, database specialist schema/transaction design,
rendering specialist workload safety, build reliability checks/provenance/evidence. UX/UI design
honest consent/rejection/recovery with platform feasibility; designers are not technical certifiers.
Lead integrates risk decisions and ensures required reviews occur. The owner approves material
choices, significant residual-risk exceptions and releases.

Use the existing reviewer with an explicit security focus for sensitive designs and changes. Reviewer
must not be the author of the assessed design/implementation; do not call self-review independent.
Review the actual artifact/diff and tests, identify bypasses and residual risks, and return severity,
trigger, impact, evidence and disposition. Missing expertise or evidence is a gap to escalate, not
approval. If no independent reviewer is available, keep affected work review-pending.

No permanent security implementer or new security agent is added. Lead may propose a scoped
security-review role when repeated workload/expertise needs justify it, especially before cloud;
owner approval precedes configuration. External expert assessment remains an option for high-risk
claims; an agent report cannot certify security or replace specialist expertise by assertion.

## During implementation and acceptance (when authorized)

Implement feature-specific negative cases with happy paths. Update affected threats/invariants in
the same change. Exercise malformed inputs, unauthorized requests, stale ownership, lost acknowledgements,
resource exhaustion and crash/permission races as applicable. Link scenario IDs to actual discovered
test IDs and exact-build evidence; core/process/replay/native E2E are distinct evidence classes.

Independent reviewer checks implementation against the approved design, not just a checklist. Lead
tracks each finding to repair and re-review or explicit scoped owner disposition. Do not mark an
unresolved required review/test or missing platform evidence passing. Serious unauthorized mutation,
data exposure/corruption and unsafe-memory findings block affected acceptance until resolved or an
explicit owner decision changes scope; never weaken tests/thresholds to create a pass.

Build reliability installs approved local checks when authorized: advisory/provenance/license/secret
checks, relevant unsafe/native/hostile-input tests and artifact entitlement/test-hook inspection.
Later CI reuses these actions. Planned tooling is not enforcement; routine static checks alone do
not prove trust behavior. Document any gate exception with impact, owner and expiry/recheck, obtain
appropriate owner approval, and never hide failures behind broad exclusions. No new uploads/services
or scanner dependency is adopted merely by this workflow.

Reassess at each sensitive boundary introduction/change, preview acceptance and before a new platform,
cloud/agent capability or release trust mechanism. Keep private vulnerability handling and evidence
rules in [gates and response](gates-and-response.md). Source documents remain a review snapshot;
this workflow does not retroactively claim implementation or independent assessment of new code.

## Concrete workflow artifacts

Use [task template](../../tasks/_template.md) and separate [design/implementation review records](../../quality/security-review-template.md).
Existing tasks adopt the fields when activated; no bulk declaration that unassessed tasks are safe.
Lead assigns reviewers and enforces transitions, implementer provides test/evidence rows, reviewer
records actual scope/results and fixes. S01 will implement field/link/status validation when code is
authorized, then reusable reporting can feed CI later. A validator checks presence/consistency, not
the truth of approval or quality of a security design; human/independent review remains necessary.

## Automated gates: when, what and who

These checks are planned for authorized implementation, not currently installed. Build reliability
owns orchestration/reporting; implementers own meaningful checks; reviewer assesses results and
coverage. Avoid unsupported claims of automatic enforcement from a Markdown checklist.

| Stage | Required applicable checks | Failure handling |
| --- | --- | --- |
| Task readiness | Required impact fields, concrete design/approval references, threat/test mapping and review state | Incomplete/unverifiable records prevent ready status; independent review verifies substance |
| Relevant background development/commit checks | Format/type/lint, changed-boundary negative tests, secret detection; dependency/native provenance/license/advisory checks when relevant | Failure is visible and blocks affected acceptance; no automatic risky fixes or blanket ignores |
| Sensitive code/dependency/entitlement changes | Compare boundary/dependency/entitlement/test-hook changes with declared impact; bounded fuzz/sanitizer checks where supported | Flag inconsistent classification for human review; path matching cannot prove no security impact |
| Before relevant native acceptance | Actual signed artifact/entitlement inspection, process/access/permission cases and native E2E as applicable | Unsupported/unrun evidence remains missing; reserve foreground session if needed |
| Milestone/release review | Broader advisory freshness, hostile-input/unsafe campaigns, artifact/privacy and threat-model reconciliation; expiry check for exceptions | Re-review unresolved risks and evidence; owner approval still required for release |

Versioned Node .ts actions should produce structured results with task/SEC IDs, exact revision/build,
platform, tool/config/advisory version/date, executed/skipped/failed status, artifact and exit outcome.
S01 implements local actions first; future CI invokes the same actions instead of a parallel ruleset.
Do not schedule recurring jobs, install tooling or configure remote merge rules without that scope.
Native checks retain foreground permission rules. An unavailable scanner/advisory source is an
explicit limitation; a stale scan is not a fresh pass. Review metadata sent to external services.

After authorized installation, a required local action returning failure prevents the agent from
marking the task accepted. Later CI/branch protection can enforce merge gates when configured;
currently neither exists. Exceptions are scoped, justified, owner-approved where required and
expire/recheck. Do not lower thresholds, delete fixtures or reclassify impact to bypass failure.

## Threat-model maintenance: change together with the feature

Keep the initial day-zero report as a hashed review snapshot. Maintain later threat changes in
versioned boundary review records linked from the task and current security index; do not quietly
rewrite the historical assessment or treat its no-blocking-findings disposition as covering new code.

For each affected SEC risk/boundary, record: asset and adversary; entry point/authority; trust/data-flow
change; abuse/failure case; proposed or implemented mitigation; accountable owner; linked invariant/
negative tests; evidence revision; residual risk; review date and next trigger. Distinguish mitigation
states planned, implemented, verified, ineffective and superseded. A retired risk needs a rationale,
not deletion of history. Existing SEC IDs stay stable; new risks receive new IDs.

Mandatory update triggers include new/changed parsers or formats, IPC/FFI and process ownership,
permissions, native dependencies/build execution, persistence/export/delete/backup/retention behavior,
new private-data flows, vulnerability findings, new platform, network/agent/cloud boundary or update
mechanism. Repeat review if assumptions change even when source code does not, such as a new advisory
or changed platform permission behavior. No need to rewrite all threats for an unrelated visual edit.

Implementer supplies the threat-model delta or a specific unchanged rationale in the same change.
Lead confirms classification/coverage. Independent reviewer compares the actual diff/architecture
with that delta, checks missing edges and test coverage, and invalidates stale review evidence where
necessary. Security fixes add regression cases and update the affected risk. At preview/release
milestones reconcile the actual system/data flows with the index and recheck exceptions. Missing
required update/review blocks affected acceptance; automatic checks can require records and flag
sensitive changes but cannot establish that all threats have been discovered.
