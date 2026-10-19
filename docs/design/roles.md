# Combined UI/UX design responsibility

Status: owner restored one ui_ux_designer (decision 213, 2026-10-17), superseding the earlier
split. The lead coordinates assignments and native feasibility; concurrency limits are unchanged.

| Work | Accountable role | Required partners |
| --- | --- | --- |
| User goals, competitor synthesis, journeys and information architecture | ui_ux_designer | Owner and competitor_researcher |
| Routes, input/focus/IME, accessibility semantics, interruption and recovery | ui_ux_designer | Rust/native engineers validate contracts and feasibility |
| Shared Linefield visual foundations, adaptive design, themes, typography and components | ui_ux_designer | Platform engineers validate consistent presentation and native behavior |
| Motion purpose, state timing, choreography and reduced-motion equivalents | ui_ux_designer | Native/rendering engineers validate behavior and performance |
| Locale glossary, en/uk layouts and terminology review coordination | ui_ux_designer | Proficient language reviewer; engineers own resources/tests |
| Running-interface usability, visual, adaptive and motion review | ui_ux_designer | Platform engineers and independent reviewer |
| Native implementation, tests, logging and platform API feasibility | Platform engineers | Designer supplies observable acceptance criteria |
| Shared commands/document invariants and typed contracts | rust_engine | Designer supplies user-visible outcomes |
| Runners, evidence, packaging and coverage reporting | build_reliability | Implementers own feature tests |
| Independent correctness/security/performance assessment | Fresh reviewer and relevant specialists | Lead scopes review; designer does not replace independence |
| Scope, identified design approval and final acceptance | Owner | Lead presents the integrated packet |

## Technical design before implementation

The lead is the technical design coordinator; ui_ux_designer owns user experience and visual
design, not the engine architecture. Before implementation, rust_engine and the relevant
rendering/platform specialist prepare one bounded technical plan in the executable task.
The lead integrates it, an independent reviewer checks consequential boundaries, and the
owner approves unresolved material choices. No additional permanent agent role is required.

The plan must assign each responsibility explicitly:

| Layer | Required ownership declaration |
| --- | --- |
| Shared Rust | Document/editing/history and interaction rules; canonical geometry and coordinates; viewport mathematics and admission; authoritative visibility queries and typed immutable projections |
| Host adapter | Actual pointer/keyboard acquisition, focus/IME/lifecycle translation, platform event ordering and forwarding to shared commands; no second editing engine |
| Host presentation/renderer | UI/localization/accessibility, GPU/surface resources, rendering scheduling and disposable caches; consume shared geometry/transforms, never redefine coordinate or editing policy |
| Shared boundary | Exact named calls/results, generation and identity checks, allocation/copy/disposal ownership, invalidation, failure/recovery and limits |
| Verification | User-visible E2E scenarios, browser-hosted boundary fixtures explicitly distinguished from real user-action E2E, static checks and measured performance obligations, with owners and evidence gaps |

Separate a shared rule from its platform mechanism: Rust decides whether a gesture is
admitted and what it means; the host acquires events and owns device resources. Cache
eviction cannot alter artwork/history. An immutable render request must have an identified
owner and lifetime; it cannot become another mutable editor. Resource failure must preserve
accepted work where possible and must not be hidden by presentation.

Design the whole operation before optimizing one part. For viewport navigation, include
already-visible and newly revealed strokes, min/max zoom, rotation, clipping/paint extent,
continuous motion, cancellation and accurate-frame replacement. "The old image moves" is
not sufficient acceptance for live canvas panning. Record known compromises as limitations
and return material alternatives for owner review before coding them. The same checklist
applies to remaining work in an active task; small fixes may use a short plan.

## One integrated feature packet

Research -> combined interaction/visual design -> native feasibility check -> owner approval
of identified design -> engineer implementation -> combined running-interface design review
and independent technical review. Foundations and actual screen versions retain their existing
approval gates. Do not add an extra coordinator or designer per platform.

For each scoped feature, the same designer maintains both checklists:

- Behavior: goals, route/state graph, input/focus, accessibility, error/recovery, locale wording,
  motion interruption, acceptance/invariant/test IDs and unresolved choices.
- Presentation: common Linefield component styles with host behavior mappings (decision 232), resizable design review, minimum/intermediate/maximum windows,
  tablet orientations/split windows, light/night/contrast, en/uk/text expansion, motion and
  reduced-motion variants, exact versions and native limitations.

Use one linked brief and repository design collection; never edit a frame concurrently. Small fixes need a
focused review; substantial flows require both checklists. Preserve implementation boundaries:
shared Rust commands remain authoritative; designers neither implement native adapters nor
certify runtime security, accessibility or performance from mockups.

The benefit is one accountable feature owner with less handoff drift and duplicated context.
The risk is a broad workload and less internal design cross-checking: mitigate with small
assignments, the two checklists, platform feasibility and fresh independent review.

## Input, stores and evidence

S00F uses the input inventory per feature. The designer proposes behavior and discoverable
native affordances together; engineers check acquisition, OS shortcuts and native text/IME
priority. Exact behavior and design review require owner approval before implementation.
S00G keeps technical store compliance with platform engineers, packaging/provenance with
build reliability, applicable disclosures/flows with the designer, and scope with the lead.
Security findings inform both design and engineering; owner responsibilities are unchanged.

This is project-local configuration. Existing running agents are not renamed by file edits;
new role discovery must be checked in a Linefield-scoped session. No new design review artifact or
native acceptance is implied. Earlier role-split decisions and review evidence remain history.
