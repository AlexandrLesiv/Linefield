# Linefield diagrams

Native SVG uses owner-approved [style v2](../design/diagram-style-v2.md), decision238.
[Full migration map and text equivalents](migration-v2.md) accounts for all16 original Mermaid
blocks and the two new workflow views. Each SVG is editable, selectable-text, self-contained
source; open at full size for dense sequence/state diagrams.

Start with the [task/PR workflow](../workflow/task-pr-chat.md),
[Git integration](v2/git-integration-loop.svg), [developer evidence](v2/developer-evidence-flow.svg),
[localization](v2/localization-boundaries.svg) or [shared test scenarios](v2/shared-e2e.svg).

Current general documentation embeds its replacement SVG. Five original Mermaid blocks are
preserved verbatim in [source history](mermaid-source-history.md). Historical or approval-bound
architecture documents remain unchanged; their explicitly labeled SVG counterparts are linked
from the migration map. A historical diagram is not a current architecture recommendation.
UI mockups and original style comparison/approval boards remain design snapshots.

Database ER diagrams still use versioned DBML/layout plus hosted dbdocs. The storage-boundary
SVGs depict file/authority relationships only; no schema authority or publication is replaced.
