# Owner approval — workflow and diagram style

2026-10-19, explicit owner instruction: approve diagram style v2 and proposed workflow; start
repository/workflow bootstrap, preserve existing work, convert existing diagrams and document
workflow using SVG. Later explicit reply permits public reviewed source/documentation publication
to the owner-configured AlexandrLesiv/Linefield repository. Decision238 records this disposition.

## Exact approved artifacts

| Artifact | SHA-256 at approval |
| --- | --- |
| docs/design/diagram-style-v2.md | 0f2a839f97895997a1972b26f14d5b882cc8aa960678218baa5dfbb9030b18a7 |
| docs/design/diagram-style-v2/review-board.svg | b8b3600325abb41deada050a87cde0fd14020fcd7920bb6424bcf26fc3f7375d |
| docs/workflow/task-pr-chat-plan.md | 9d505829076ac556a0aed9edd28d5be3aca9f60aef62a7e998cf2259e3abfaea |

Their proposal-era status text remains part of the identified snapshot; this record supplies the
actual owner disposition without silently rewriting that reviewed version. V2 inherits v1's
semantic conventions where explicitly stated. V1 alone was not selected as the visual style.

Applies to new/substantively updated diagrams, not app UI themes or example architecture adoption.
Preserve historical review sources and approved snapshots. Native SVG conversion must preserve
technical meaning and status; diagram appearance cannot approve an old mechanism. DBML/dbdocs
remains authoritative for hosted schema review; no new publication to that service is implied.

Workflow adoption authorizes a bounded leaf task/branch/PR with owner integration and a verified
next-chat handoff. The bootstrap is a one-time preservation/integration transition: old local
work does not gain fabricated historical PRs. Public publication excludes private local evidence,
credentials, downloaded dependencies and local backup. No main feature merge or release authorized.
