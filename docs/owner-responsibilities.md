# Owner responsibilities and approval boundaries

Current workflow, 2026-10-16. This is the single responsibility index; actual choices and approvals
remain in [decisions](decisions.md), identified design/schema records and task/release evidence.
It consolidates existing authority rather than transferring engineering work to the owner.

## What you decide or approve

| Area | Your responsibility | Agents prepare / timing |
| --- | --- | --- |
| Product scope and priorities | Select milestones, approve new features/platform extensions and material scope changes | Lead/UX provide a bounded proposal with benefit, alternatives and cost before implementation |
| Feature interaction and visual design | Approve identified Figma version/frames and behavior, including relevant inputs, adaptive states and motion | UX/UI plus platform feasibility; inputs are reviewed with each feature, not a global shortcut questionnaire |
| Material architecture | Approve concrete ABI/language boundaries, document format/schema, mutable ownership/thread topology, custom protocols, renderer/framework or trust-model changes | Rust/native/DB/performance engineers supply interfaces, diagrams, alternatives, risks, migration/removal and tests before code; existing approved choices aren't reopened casually |
| Database design | Review exact schema proposal with rendered DBML diagram, relationships and migration/recovery behavior | database_designer and rust_engine; visual review precedes schema implementation |
| License and identity | Select project license, legal/publisher identity and controlled production identifiers; resolve concrete legal/commercial uncertainties | Lead/build/platform specialists provide dependency obligations and channel implications before reuse/provisioning/publication |
| Distribution and business | Select channels, audience/territories, pricing if any, account enrollment/fees and factual declarations | Platform/build agents prepare current requirements and release packet; proposed channels are not selected by reviewing them |
| Host/account permissions | Provide sign-ins or OS security permissions that tools cannot/should not grant; authorize desktop sessions when needed | Lead completes preparation first, asks only for required access, continues independent work while blocked |
| Quality and residual risks | Review material unresolved limitations and justified proposals affecting acceptance; no false pass or silent threshold weakening | Engineers measure/propose budgets; independent reviewer checks evidence; you need not invent technical limits |
| Implementation and delivery authority | Authorize implementation beyond current documentation scope; approve main merge and publication separately | Lead supplies complete reviewable change/evidence before merge/release request |

## What agents own without routine owner approval

Research current requirements, recommend designs, own technical implementation within approved scope,
add tests/logging, diagnose failures, perform authorized background checks, maintain threat/evidence
records and obtain independent review. Routine fixes/extraction within approved contracts proceed.
Engineering owners choose ordinary implementation details and propose measured defaults. You do not
need to manually coordinate specialists, write acceptance reports or choose each keyboard binding now.
Read-only milestone reviews can be requested through [linefield-review](workflow/milestone-review.md).

## How requests reach you

Lead presents one consolidated packet: decision, recommendation, credible alternative/tradeoff,
exact artifact/version, affected scope, evidence/gaps and required timing. Bundle related questions;
don't ask again for already-approved routine work. Approval is recorded with date, scope, artifact
identity and conditions. Agent consensus, a passing test or silence is not owner approval.
New material deviations return for review. Critical missing evidence stays visible; an owner choice
cannot turn an unrun test into a pass. Live secrets never belong in prompts or committed documents.

## Current status to avoid accidental decisions

- Documentation/configuration workflows only; no Linefield application implementation authorized.
- Local macOS developer preview selected; public channels in S00G remain recommendations.
- Skia/shared Rust/native controls and recorded architecture policies remain selected. Concrete S02
  contracts, schema/mechanisms and identified Figma still need their specific approvals.
- watchOS, tvOS, Wear OS and Android TV/Google TV are view-only. Toolkit/acquisition and standalone
  claims remain separate; no editing capability can be inferred from attached input devices.
- Project license/production identity, public channel/commercial choices and actual releases are pending.
- No standing desktop reservation, account enrollment, certificate purchase or publishing approval.

Update this index when responsibility changes; do not duplicate every decision here. Milestone reports
list only approvals actually needed next and point to existing decisions instead of asking again.
