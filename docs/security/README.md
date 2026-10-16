# Security review index

The initial [threat review](day-zero-review.md) and [gates proposal](gates-and-response.md) retain their
[reviewed snapshots](review-record.md). SEC-01 through SEC-16 are proposed initial risks, not proven
runtime defects or implemented mitigations. No application/security tests have executed.

Current mandatory process: [development workflow](development-workflow.md), task template and
independent review record. Review automation is planned, not installed.

## Boundary changes after the initial assessment

No application boundary changes implemented yet. Use [threat-change template](threat-change-template.md)
for each sensitive task and add an index row below. Preserve stable SEC IDs and old review evidence.

| Task/change | SEC risks/boundary | Threat delta | Independent review | Current mitigation/evidence status |
| --- | --- | --- | --- | --- |
| None implemented | Initial SEC-01–16 | Initial proposal above | Initial review above | Planned; no runtime verification |

Lead maintains this index; feature owner updates the delta and reviewer checks coverage against the
actual change. A new dependency advisory/platform behavior may invalidate evidence without a code
change. No periodic monitoring or automation is created by this index.

## S00F/S00G planning cross-check

[Input proposal](../input/README.md) and [distribution register](../distribution/README.md) add no runtime
boundary or implemented mitigation. They identify implementation review triggers under SEC-02/03/04/
10/11/12/13/14/15: input capabilities/focus, ABI/native dependencies, packaging privilege, privacy,
standalone acquisition and future publication. Preserve the original hashed threat assessment.
Use a concrete threat delta when implementing these boundaries; source research is not security proof.


S02 v2 sensitive design update: [threat delta](S02-v2-threat-delta.md), edit-capable peers/replay/receipt privacy/lifetime and cross-file recovery. Independent snapshot assessment is recorded in ../../quality/S02-v2-review.json; runtime mitigations/tests remain unimplemented.
