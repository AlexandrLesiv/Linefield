# Security review — TASK-ID

Record template, not a completed assessment. Review type: design / implementation / repair re-review.
Reviewer: pending. Date: pending. Author(s): pending. Independence check: pending.
Exact revision/build or document/diff snapshot hashes: pending. Scope/exclusions: pending.
Approved policy/design references and owner approvals: pending.

## Findings and evidence

| Finding ID | Severity | Location/boundary | Trigger and consequence | Evidence | Required repair or owner disposition | Re-review status |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | Pending | Pending | Pending | Pending | Pending |

Assess actual authorization, untrusted input validation, state ownership, memory/lifetimes, failure/
recovery races, resource bounds, permissions, privacy and dependency/artifact changes where relevant.
Reference the task's security classification and negative acceptance matrix. Explain exclusions.

Design review: inspect proposed interfaces/trust/state diagrams and alternatives; identify explicit
assumptions and needed owner decisions. Reviewer acceptance does not approve material architecture.
Implementation review: inspect actual diff, tests and results against that approved design. Record
what was reproduced versus inspected/reported; implementation review cannot be replaced by an earlier
design review. Author cannot approve their own work as independent. Missing expertise is a limitation.

## Disposition

- Ready for next gate / changes required / evidence missing. Selected: pending.
- Open findings and blockers: pending.
- Residual risks and proposed exceptions with owner/scope/expiry/recheck: pending.
- Actual owner exception approval references, if any: pending; never invent consent.
- Checks run, checks not run and reason: pending.
- Lead follow-up: pending.

No findings is not a security guarantee. Do not claim native acceptance from replay or claim a
scanner result proves design safety. Record fixed findings and re-review, not only the final green
result. Preserve earlier reviewed snapshot references when later changes invalidate the assessment.

## Gate and threat-model maintenance assessment

Verify declared gate applicability against actual changed boundaries/dependencies/permissions. Record
failed, missing, skipped or stale results and exception expiry; a tool success is not a complete
security conclusion. Inspect threat-model delta/unchanged rationale against actual code/data flows,
mitigation status and negative tests. Identify stale assumptions or omitted edges; require an updated
record and re-review rather than inheriting approval from the initial day-zero report.
