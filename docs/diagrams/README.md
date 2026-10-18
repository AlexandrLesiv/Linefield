# Linefield diagrams

Decision239 selects generated native SVG with owner-approved [style v2](../design/diagram-style-v2.md).
Shared definitions live in shared/diagrams; DTCG2025.10 tokens define diagram colors, typography,
spacing and shape. Generate/check with the repository diagram commands. Generated SVGs are review
artifacts: edit inputs, regenerate and review the diff. They remain self-contained/selectable text.

Start with [parallel task lanes](../workflow/parallel-tasks.md),
[task/PR workflow](../workflow/task-pr-chat.md), [Git integration](v2/git-integration-loop.svg),
[developer evidence](v2/developer-evidence-flow.svg), [localization](v2/localization-boundaries.svg)
or [shared test scenarios](v2/shared-e2e.svg). The [migration map](migration-v2.md) identifies the
original architecture/status of each view. Historical views are labeled; they are not new approvals.

[Schema views and dictionary](../database/README.md) are generated from SQL/shared annotations and
proposal definitions using the same style pipeline. Schema content is separate from design tokens.
Future platform adapters can consume shared token/schema data; generation does not implement native
consumers or authorize production schema changes. UI mockups and approval boards remain design
snapshots, not hand-maintained duplicates of current architecture diagrams.

Retired source notation/tool comparisons are removed from the active checkout. Original approval
bytes and older render evidence remain retrievable from Git commit e08f304. Current migrated prose
must not be compared with historical approval hashes as if the bytes were unchanged.
