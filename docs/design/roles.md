# UX and UI responsibilities

Status: owner requested the split on 2026-10-16. The combined role is replaced by ux_designer
and ui_designer. This changes responsibility, not product scope or implementation authority.
No additional design coordinator: the lead schedules work, integrates artifacts and escalates
scope decisions to the owner. Existing concurrency limits remain unchanged.

| Work | Accountable role | Required partner |
| --- | --- | --- |
| User goals, competitor synthesis and workflow priorities | UX | Owner, researcher, UI |
| Navigation/routes, Back/dirty guards, interaction state diagrams | UX | Rust and native engineers validate semantics/feasibility |
| Low-fidelity flows, error/recovery wording and glossary | UX | UI for fit, native engineers for conventions |
| Keyboard/IME, input/focus, accessibility semantics and acceptance scenarios | UX | Native engineers and build reliability implement/verify |
| Native visual foundations, typography/color/spacing, icons and components | UI | UX and platform engineers |
| Adaptive high-fidelity Figma layouts, theme/RTL/text-scale presentation | UI | UX validates flow and reading order |
| Motion purpose, interrupt/commit/cancel behavior and focus timing | UX | UI designs presentation; engineers validate native behavior |
| Motion choreography, visual easing/timing and reduced-motion appearance | UI | UX validates semantic equivalence |
| Runtime usability/interaction review | UX | UI for integrated review; actual user studies separately identified |
| Runtime visual/adaptive/motion fidelity review | UI | UX, platform and performance engineers |
| Native code, tests, logging and platform API selection | Platform engineers | UX/UI specify intent, not implementation ownership |
| Rust command/document invariants and concrete boundary contracts | Rust engineer | UX supplies expected observable behavior |
| Scope, identified Figma approval and final acceptance | Owner | Lead presents one coherent review packet |

## Small, explicit handoff

Research evidence -> UX interaction brief/low-fidelity flows -> UI foundations/adaptive screens
and motion -> joint consistency check -> one owner review packet -> authorized implementation
-> UX behavior and UI visual review. Foundations and screen versions still have separate owner
approval checkpoints; no automatic extra sign-off ceremony is added for each small change.

UX brief includes scope, task/contract/scenario IDs, route/state graph, edge cases, input/focus/
accessibility/locale rules and pending decisions. UI returns exact Figma versions, component
mappings, resize/motion evidence, reduced-motion variants and annotated native limitations.
After approval, behavioral changes return to UX; visual changes stay with UI unless they affect
interaction or approved scope. Lead resolves ownership conflicts; owner decides material changes.

Use the same design brief/glossary and one Figma project with separately owned sections. Do not
write the same frame concurrently. Involve both roles for substantial new flows; route minor
visual fixes to UI and behavioral clarifications to UX with a focused partner review as needed.
The UI role covers all planned platforms with native engineer input, not a designer per OS.

Benefits: narrower context, explicit behavioral specification and independent design cross-check.
Costs: handoff drift, extra coordination/tokens and possible slow iterations. Mitigate with short
linked briefs, one accountable owner per artifact and no duplicated specification. The split
is not permission to run more concurrent agents or delegate implementation to designers.

Role files follow the existing project configuration. Parsing proves syntax only; availability
must be confirmed in a new Linefield-scoped session. Existing running agents are not renamed by
editing files. No runtime discovery or new Figma artifact is claimed.

## Pending cross-platform input and distribution reviews

S00F requires UX to coordinate a device/shortcut/gesture/focus-context matrix with Rust and each
native engineer; UI presents discoverability and adaptive native affordances in approved Figma.
Shared semantic behavior can live in Rust without replacing native event acquisition, OS shortcuts
or text/IME priority. Exact declarative binding profile is still a reviewed contract.

S00G evaluates store requirements: native engineers own technical feasibility/compliance evidence,
build reliability packaging/signing checks, UX/UI user-facing flows/disclosures and lead applicability/
scope. Designers alone do not certify SDK, entitlement, signing, privacy-data or distribution rules.
New roles remain for review. S00E security findings inform both designs and engineering contracts.
