# Repository design and implementation handoff

Design is a day-one activity owned alongside implementation in this repository. Use versioned
specifications, approved reference assets, semantic resources and explicitly authorized live
web prototypes. External design-tool accounts, editing access and connectors are not prerequisites.
The owner reviews an identified design version before a new product/native screen or tool is
implemented. Existing explicit prototype authorizations, including decisions214,233–234, remain
valid; do not reopen their selected direction. Foundation approval does not approve unseen screens.

## Artifacts and ownership

Keep durable briefs, state/flow specifications, component inventories, host mappings and review
records under docs/design/. Keep executable prototype source in its authorized application or
prototype directory, and test/capture evidence in the corresponding quality directory. Record
reference provenance and preserve historical approval snapshots; an earlier proposal is not a
current requirement merely because it remains available.

Follow [combined ownership](roles.md): ui_ux_designer owns behavior, navigation, presentation,
adaptive layout, locale expectations and motion together. Lead coordinates scope and one review
packet. Platform engineers verify host feasibility; rust_engine checks authoritative command and
capability semantics; a fresh reviewer independently assesses substantive changes and evidence.
Use disjoint file ownership or isolated worktrees for concurrent writers. No extra coordinator
or recursive delegation is introduced by this workflow.

Each review packet identifies:

- Task/scenario and CT/INV/SU/SEC IDs, included behavior and explicit scope exclusions.
- Repository artifact paths, version or commit plus hashes for uncommitted reviewed files,
  screen/state identifiers, and reference provenance.
- Behavior checklist: triggers, preconditions, outcomes, guards, interruption, focus/IME,
  accessibility, locale differences and recovery where applicable.
- Visual checklist: component roles/states, semantic resources, adaptive rules, measured
  viewport/text-scale/theme variants, artwork separation and motion choreography.
- Exact prototype/build and browser/device, executed/failed/unrun cases, evidence paths and
  limitations. A mutable local URL alone cannot identify the approved version.
- Owner decision/date/conditions, unresolved questions and implementation revision when available.

Decision232 requires consistent Linefield styling across hosts, with adaptive space/input/
accessibility behavior. Host text/IME/focus, accessibility and OS-owned panels remain native.
Repository mockups and browser simulations do not prove native controls, durability or latency.

## Handoff and drift

Flow: bounded scope brief → behavior/visual specification and platform feasibility → identified
design review → required owner approval → authorized implementation with tests → designer review
of runtime evidence and independent change review → owner handoff.

Material behavior, design or architecture deviations return for review. Routine corrections
within the approved scope do not restart design selection. A missing required design/approval
blocks that UI slice; continue independent authorized documentation, tooling and contract work.
Unavailable evidence remains a gap, rather than a reason to invent a pass or a new access gate.

Shared theme/localization authoring remains trusted data-only TypeScript with generated host
resources; see [shared resources](shared-resources-plan.md). Component geometry, icon roles,
states and motion are specified as features need them. No universal widget framework, Rust style
migration, synchronization service or additional product feature follows from this workflow.

## Adaptive foundations and review evidence

Start with [foundations](foundations.md) and [S00A](../../tasks/S00A.md). Specify reusable components
through semantic roles, states and layout rules. Where a runnable prototype is authorized, use
its actual layout engine and resize the viewport through minimum, intermediate, typical and wide
dimensions. Fixed screenshots document samples; resize tests establish behavior between them.
For unimplemented hosts, record the proposed mapping and the missing runtime evidence explicitly.

Headless browser tests and local captures are the default web review evidence. Record their
configuration and exact source/build. Include focused keyboard/pointer/touch-emulation cases,
accessible labels/states, expanded text, English/Ukrainian, pseudo-RTL/mixed scripts, light/dark,
contrast and reduced motion where applicable. Review captures visually; do not auto-approve
baselines. Distinguish runtime artifact inspection from an interactive designer walkthrough,
screen-reader review, physical device input and user research. Honor current restrictions on
Computer Use and foreground reservations; headless evidence does not grant those permissions.

Follow [S00B](../../tasks/S00B.md) and [internationalization](../internationalization.md). Keep
wording context and linguistic review separate from layout/resource/runtime checks. Preserve
artwork and user names through locale/direction changes; pseudo-locales are test fixtures.

## Research and navigation

Use [S00C](../../tasks/S00C.md) and the research handoff for bounded evidence
before substantial new design choices. Record accept/adapt/defer/reject reasoning. Research does
not expand scope or require restarting the already-selected rail/top-settings direction.

Follow [motion](motion.md), [navigation](../navigation.md) and [S00D](../../tasks/S00D.md). Specify
state graphs, accepted route/history changes, Back/dirty guards, loading/error/cancel and focus
restoration. Provide timing/interruption/reversal/reduced-motion expectations and executable
examples only where authorized. Screenshots alone cannot demonstrate complete motion behavior.
Animation completion never owns document/save/discard mutations or delays input/ink. Use OS-owned
panels where the approved native workflow calls for them.

## Input coverage and planned developer tools

Use the [input inventory](../input/inventory.md) per feature: native fields/IME, keyboard, pointer,
touch/pen/accessories, app menus/Services, assistive input and lifecycle. Specify applicability,
availability, alternatives, interruption and scenario IDs. Annotate inputs the web prototype
cannot demonstrate. Engineers verify acquisition and host conflicts; no incidental global
shortcut/profile adoption. watchOS/tvOS/Wear OS/Android TV remain view-only.

Future developer-tool designs may cover tasks/contracts, coverage, run/build actions and evidence
under [developer experience](../developer-experience.md). Distinguish missing/stale/skipped results
from pass and identify foreground requirements. This is planning guidance, not authorization for
a dashboard, launcher or published command execution. Reuse approved presentation/resources when
that work is authorized, without coupling applications to developer tools.
