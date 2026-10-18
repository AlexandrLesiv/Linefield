# Competitor research and design handoff

Status: workflow requested 2026-10-16. Role configured; a bounded Concepts study is available
from 2026-10-18. This does not complete the broader multi-product S00C agenda.
The role is competitor_researcher, distinct from reviewer (implementation correctness/evidence).

## Current study

The [Concepts HTML report](concepts-2026-10-18/index.html) combines the
[official-source packet](concepts-official-sources-2026-10-18.md), physical-device observations,
motion evidence and [designer response](../design/concepts-study-linefield-adaptation-2026-10-18.md).
Read its evidence limits before using a finding as a requirement. The source is
[report.md](concepts-2026-10-18/report.md); regenerate local HTML with
`node docs/research/concepts-2026-10-18/build.ts`.
Private captures remain local under the study's ignored assets directory; do not publish it
or version the gallery capture containing unrelated drawings. Product scope, design and
implementation approvals remain separate.

## Purpose and authority

Study how other products solve an identified user problem, then recommend choices for Linefield.
Concepts.app, ProDrafts and Apple Freeform for macOS are the owner-selected initial references. See the [competitor catalog](competitors.md)
for sourced infinite-canvas notes and adjacent spatial-note candidates; choose others per workflow.
Do not turn a competitor checklist into Linefield scope or assume all their platforms are equal.
Research informs the owner and ui_ux_designer. It does not approve features, architecture or UI.

The lead assigns a bounded brief, starting document revision, target platforms, source/evidence
requirements, owned report path and stop condition. A focused initial report belongs in S00C;
repeat research only for a meaningful new design question, not every bug fix or routine change.

## Required report structure

1. Question, target user/workflow, Linefield scope, products/platforms and research date.
2. Evidence table: finding ID, source URL, product/platform/version (or unknown), method,
   observed/documented/reported/inferred status, confidence, limitations and relevant pricing tier.
3. Workflow comparison: steps, defaults, discovery, input devices, focus/cancel/undo, failure
   handling, accessibility, locale/RTL behavior and platform differences. Mark unverified items.
4. Ranked recommendations: problem, proposed adaptation, alternative, benefit, downside,
   implementation/maintenance/test cost and performance/security/data implications.
5. Scope classification: adapt within existing scope, investigate, defer or reject. Attach
   relevant CT/INV/SU/scenario IDs, or mark proposed new scope; never invent approval.
6. Handoff: designer response and platform feasibility; owner decision pending/accepted/rejected
   with artifact/date/conditions recorded by the lead. Link later design versions and test cases.

Prefer official manuals/release notes. Hands-on observations need an authorized device/session
and identified build; public user reports are secondary evidence, not established product facts.
A missing manual entry does not prove a feature absent. Distinguish platform and subscription
availability. Report uncertainty; do not infer competitors' internals or latency from their UI.
Research is not a benchmark or a substitute for usability testing with intended users.

No purchases, sign-ins, installations, vendor contact, private uploads or foreground automation
are implied. Use permitted public materials; credit sources and avoid wholesale asset/UI copying.
An unavailable paid feature is an evidence gap, not a reason to bypass access controls.

## Review flow

~~~mermaid
flowchart LR
    Brief[Lead: bounded research brief] --> Research[Competitor researcher: evidence and options]
    Research --> Owner[Owner: scope and priorities review]
    Research --> UX[UX: workflow synthesis and interaction brief]
    Research --> UI[UI: native visual adaptation]
    UX --> UI
    UX <--> Platform[Platform engineers: feasibility]
    UI <--> Platform
    Owner --> Scope[Recorded scope decision]
    UI --> Proposal[Versioned design review proposal]
    Proposal --> Check[UX and UI consistency review]
    Scope --> Proposal
    Check --> Approval[Owner: identified design approval]
    Approval --> Build[Authorized implementation and tests]
    Build --> Review[UX behavior, UI visual and independent code review]
~~~

New scope requires an owner decision before it enters implementation. Existing-scope design
exploration can incorporate research, but still needs identified design approval before coding.
Designer may disagree with the researcher and must explain why. The owner receives the evidence
and recommendations, not just the designer's final synthesis. Lead coordinates handoff within
the current task; separate-chat messages still require explicit authorization.

## Configuration and verification

The project role is defined in .codex/agents/competitor_researcher.toml. This follows the
[documented custom-agent format](https://learn.chatgpt.com/docs/agent-configuration/subagents).
TOML parsing verifies file syntax, not that an existing session has discovered a new role.
Run it in a Linefield-scoped session after the role appears in that session's available agents;
otherwise state the discovery limitation and use an explicitly assigned research subtask.
No global configuration or extra concurrent-agent allowance is needed.
