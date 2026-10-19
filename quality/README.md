# Quality documentation

This directory keeps maintained explanations, verification boundaries and unresolved findings.
It does not store routine run output. Logs, result manifests, captures and generated resources
remain ignored; link exact-build evidence from the relevant PR or task when available.

| Topic | Maintained guidance |
| --- | --- |
| Browser storage | [Preservation blockers and adoption gates](storage/README.md) |
| Regional arithmetic | [Precision limitations and required proof](precision/README.md) |
| Shared resources | [Locale/theme validation and native-consumer limits](resources/README.md) |
| Repository tooling | [Action, generation and editor verification boundaries](tooling/README.md) |
| Web application | [App verification guidance](../apps/web/quality/README.md) |

Use [quality policy](../docs/quality.md), [shared E2E](../docs/testing/shared-e2e.md) and the
[task template](../tasks/_template.md) for test ownership and reporting. These pages retain
useful knowledge from previous reviews, not assertions that the current checkout passed those
runs. Record revision/build, environment, discovered scenarios, failures, skips and retries with
new executions. An old green result, unchanged file or successful generator exit is not current
application acceptance.

Keep unresolved findings until there is explicit resolution and supporting evidence. Do not
restore obsolete review copies, retired tools, generated artifacts or developer-tool test suites
merely to recover explanatory documentation. Primary-app tests and approved application-domain
constraint/precision fixtures remain separate from generated evidence.
