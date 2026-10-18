# Verification evidence

This folder contains **proof of checks and reviews**, not application source or runtime data.
It grew as each task retained its results; it is not a requirement to keep every historical run
in the current checkout. Test implementations live in scripts/ and apps/web/tests/.

## Where to look

| Need | Entry point | Why retained |
| --- | --- | --- |
| Current style/cleanup task | [Local styles](local-styles-v1/README.md) | Fresh checks and visual/behavior preservation |
| Shared diagram/schema tooling | [Shared documentation](shared-documentation-v1/README.md) | Generator checks, semantic review and render evidence |
| Delivered baseline | [Bootstrap inputs](bootstrap-v1/tested-source.json) | Exact source hashes used by independent task launch briefs |
| Unresolved storage failures | [Storage experiment](browser-storage-v1/README.md) | Actual corruption canaries/results and adoption blockers; do not prune |
| Durable-library design | [Review packet](durable-library-review-v1/README.md) | Identified design snapshots, reviews and limits |
| Web UI checks | [Web evidence index](../apps/web/quality/README.md) | Browser-specific results owned beside the app |
| Older removed reports | [Historical record ledger](historical-records.json) | Original Git objects and hashes; not fabricated current passes |

## What the files mean

- JSON manifests bind a result to source/build hashes, tool versions and test IDs.
- Logs/TAP files preserve actual check output; a passing old run does not certify changed code.
- Review notes and SVG/PNG boards identify the design that was inspected or approved.
- Synthetic failure fixtures preserve bugs we must not lose while choosing storage mechanisms.
- Templates describe evidence to collect; an empty template is never a pass.

The root tracked evidence was about 1.9 MiB before this cleanup; browser evidence is separate.
Most repository disk use comes from ignored downloads/dependencies/captures, not these records.
Those local files are not published. The eighteen obsolete or mixed historical reports retired
in this cleanup remain recoverable from Git b0cb531. Their raw contents were not rewritten to
pretend that old checks used today's tooling. Current links point to retained evidence or history.

## Retention rule

Keep the current task's concise result, exact tested identity, necessary review snapshot and any
unresolved failure fixture. Archive superseded raw reports in Git when no current check/task needs
their local path; repair links and name the revision. Never delete original drawings, credentials,
recovery data or private captures under this evidence policy. Large reproducible captures and
vendor downloads stay ignored locally. Do not auto-accept screenshots, hide failures or rewrite
historical hashes. Detailed native acceptance requirements remain in [quality policy](../docs/quality.md).

## Security task/review records

[tasks/_template.md](../tasks/_template.md) requires impact, design approval references, negative
acceptance cases and independent implementation review. [Review record](security-review-template.md)
keeps reviewer independence, exact snapshot, findings, remediation/re-review and limitations explicit.
No empty fields count as pass. Evidence registry must link those records once implemented; existing
tasks remain planned until their actual records/tests exist. No retrospective fabricated approvals.

S00F/S00G planning evidence: [input and distribution review](input-distribution-review.md).
This records document review only; no native/physical-input/store-compliance passes.

S00G channel-strategy assessment: [store strategy review](store-strategy-review.md), exact documentation snapshots only.

Milestone-command setup: [workflow validation](milestone-workflow-review.md), including independent scenario walkthroughs and explicit discovery/validator limits.

## Browser prototype evidence

Browser-only prototype reports and captures live in [apps/web/quality](../apps/web/quality/README.md), alongside the application that owns them. This root directory retains shared contracts, cross-platform reviews and repository-tooling evidence. See the browser evidence index for retention policy and the relocation of historical web-* records.
