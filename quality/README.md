# Acceptance and evidence

Planned registry fields: feature/acceptance/invariant ID, task, discovered executable test IDs, test layer, platform/device, applicability, exact source revision/build, execution result and artifact links. Keep automated coverage separate from whether the test was run successfully.

SU-01 through SU-20 are defined in docs/successor/delivery.md. Nothing has executed for the successor yet. Do not copy Native Sketch pass statuses. Build_reliability installs the registry and discovery/reporting checks when S01 is authorized.

The [contract catalog](../docs/contracts.md) defines CT/INV IDs; the [shared E2E plan](../docs/testing/shared-e2e.md)
defines scenario IDs. Registry records also include scenario/fixture versions and hashes,
capabilities, platform variants, driver/test IDs, retry history and freshness. A native UI
scenario must not pass through dispatcher injection. All catalog scenarios remain planned.

SU-20 and CT-09/INV-11 track i18n readiness; [locale scenarios](../docs/testing/internationalization.md) record language, region, direction, keyboard, resource/runtime version and translation review status separately. No real locales are yet certified.

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
