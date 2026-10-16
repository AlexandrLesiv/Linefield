# Figma design and implementation handoff

Design is a day-one activity. No Figma file/frame is currently approved for Linefield.
The owner approves the identified version of every new page/screen/tool before implementation.
This applies to the drawing apps and any later developer dashboard. A task brief or a designer's
own approval is not the owner's approval.

## Organization

Use one Linefield Figma project/file initially, organized into shared product concepts,
platform-specific flows/components, developer workbench/report views, and approved snapshots.
Split files later only for a concrete collaboration need. Keep common terminology/actions
shared; native component appearance/layout follows AppKit/UIKit, Android Material, WinUI,
GTK or browser conventions. Do not generate native production controls from arbitrary Figma
rectangles or impose identical visuals on every OS.

Repository docs/design/ holds durable briefs, approval records and native behavior mappings.
For each feature record task/scenario IDs, Figma file/frame links and explicit version or
named immutable snapshot, target platform, owner decision/date/conditions, and implementation
revision later. Mutable latest-frame URLs alone do not establish what was approved. Where
permitted, retain exported reference images with attribution so review does not depend solely
on live Figma access. Exports are design evidence, not replacement approval.

The designer prepares blank/active/selected/disabled/loading/error/cancel states, light/dark
and resizing variants, keyboard/focus/gesture behavior, accessibility semantics and native
control mappings. Platform implementers check feasibility; rust_engine checks command semantics.
Link these expectations to shared E2E scenarios and platform-specific supplements.

## Handoff and drift

Flow: scope brief → platform feasibility → versioned Figma proposal → owner approval →
implementation with tests → running-app designer review → owner acceptance packet.
Record material deviations and return them for review. Routine corrections within an approved
design do not require repeating the entire design process.

Native controls use system metrics/appearance; portable design tokens cover only appropriate
shared elements such as canvas overlays and the future web workbench/report presentation.
Do not build a cross-platform widget framework or a token synchronization service now.
Accessibility and interaction semantics are as important as the mockup pixels.

Missing Figma access blocks new UI implementation, not authorized contract/engine/test work.
Do not upload private project material through an unapproved integration. Figma automation
and credentials require their own tool availability/access; no connector is assumed installed.

## Developer tool design

Plan navigation for documentation/tasks, decisions/contracts, dependencies, feature/coverage
matrix, run/build actions, logs/results, performance and Wasm preview. Present missing/stale/
skipped results distinctly from pass. Run buttons must show platform and whether desktop focus
is required. Reuse the future web report components/style in local and static CI presentations;
keep command execution out of published static reports. See ../developer-experience.md.

## Foundations and adaptive mockups

Begin with [design foundations](foundations.md) and task S00A before detailed macOS screens.
Require reusable components, semantic variables/native mappings and actual resizable frames
with explicit adaptive rules. Show foundations and screen flows for separate owner approvals.
Do not substitute multiple fixed screenshots for demonstrated resizing. No Figma design has
been created by adding these instructions.

Localization handoff: S00B defines language/resource policy; S00A and screen Figma reviews include expanded/RTL/Unicode cases from ../internationalization.md. Record tested locale/direction/text-scale variants, glossary context and native limitations. Approval of layout samples does not certify translations or real IME/accessibility behavior.

## Research before detailed design

Use [S00C](../../tasks/S00C.md) and the [research handoff](../research/README.md) for a bounded
competitor study. Both owner and designer receive sourced findings; designer records adaptation
and disagreements. Competitor features do not enter scope automatically. Shared foundations
may progress while research runs; resolve relevant findings before detailed screen approval.

## Interactive motion and navigation handoff

Follow [motion](motion.md), [navigation](../navigation.md) and [S00D](../../tasks/S00D.md).
Deliver destination/state graphs, browser URL examples/native equivalents, Back/dirty guards,
loading/error/cancel, restoration/focus and interactive transition specifications. Show normal
and reduced-motion prototypes, interruption/reversal and platform differences. Record exact
prototype versions with screen approvals; screenshots alone do not approve unshown motion.
Use native panels for the initial macOS file workflow unless a separate chooser is approved.

## UX/UI ownership

Follow [role split](roles.md): UX owns interaction briefs, routes and usability; UI owns visual
foundations, adaptive components and motion styling. Lead coordinates one shared handoff;
platform engineers validate feasibility. Use separately owned Figma sections and require both
behavior and visual review for substantial flows. Existing foundation/screen owner gates stay.

## Per-feature input coverage (decision 151)

UX uses [input inventory](../input/inventory.md) for each feature and platform; include OS/app menus
and Services, not only canvas gestures. Specify applicability, proposed action/context, native focus/
IME conflicts, availability, cancellation/interruption, alternatives and test IDs. Engineers check
feasibility; UI annotates these behaviors in the exact Figma handoff, including non-prototypable
hardware/system interactions. Owner approves the feature's interactions and design before code.
Do not make global shortcut/stylus decisions an up-front prerequisite or silently adopt old proposals.
watchOS/tvOS/Wear OS/Android TV are view-only; their designs cannot introduce editing behavior.
