# Design foundations and adaptive Figma requirements

Status: documented workflow requested 2026-10-16. No Figma file, component library or mockup
has been created or approved. S00A prepares foundations before detailed macOS screen design.
This is a design system specification, not permission to implement custom widgets or features.

## What to establish first

1. Product principles: canvas-first hierarchy, restrained chrome, native behavior, readable
   state/feedback, accessibility and the intended visual character. Present a small set of
   visual directions for owner selection, without treating a moodboard as final UI approval.
2. Shared semantic roles: action names, typography roles, spacing relationships, icon meanings,
   focus/selection/error/success states and UI color roles. Define meanings before raw values.
3. Platform mapping: associate each role/control with actual native widgets, system metrics
   and semantic colors; show which properties are system-owned versus app-owned.
4. Figma reusable components and variants for the approved preview, then adaptive screen
   compositions. Review foundations and screen designs as separate approval checkpoints.

Suggested Figma sections: Brief and principles; Shared semantics; Native platform mappings;
macOS foundations/components; macOS adaptive screens/flows; Future platform directions;
Developer tool/report foundations; Approved versions. Keep unapproved explorations distinct.

## Shared semantics, native appearance

| Foundation | Shared meaning | Platform-specific expression |
| --- | --- | --- |
| Color | Surface, primary/secondary text, separator, focus, selection, destructive/error/success | Native semantic colors/accent/contrast settings; app-owned roles mapped separately |
| Typography | UI/body/caption/title roles and hierarchy | Native font family, scaling and readable metrics; no universal hard-coded point size |
| Spacing | Grouping, alignment and density intent | Desktop pointer, mobile touch, TV remote and XR target/context needs |
| Buttons/actions | Primary/secondary/destructive, selected/disabled/busy intent | AppKit/UIKit, Android Material, WinUI, GTK and semantic HTML controls |
| Input controls | Field validation, value editing and selection behavior | Native text field/stepper/segmented/menu/dialog conventions |
| Feedback | Loading, saving, recoverable failure, cancel and retry | Native presentations and accessibility announcements |
| Canvas overlays | Selection handles, active tool and pointer feedback | App-owned geometry/styles with platform input/touch target treatment |

Use official native design resources where available and permitted; record kit/version and
license constraints. Show ordinary controls using their real platform appearance; do not
redraw every OS control to force a universal look. Preserve native system accent, text sizing,
contrast and reduced-transparency/motion behavior. System-provided Liquid Glass is an Apple
platform treatment, not a custom blur effect to copy onto Android/Windows/Linux.

Separate UI theme colors from saved artwork colors and export backgrounds. Changing light/
dark mode must not recolor a drawing. Document sRGB/alpha decisions in the drawing contract,
not infer them from a Figma theme palette. Color is never the only signal for a state.

Inventory only controls needed by approved features. A control library entry does not approve
a new product tool or a color-picker rollout to another platform. Keep macOS color controls
within existing scope. Foundation approval does not approve every future screen using them.

## Resizable mockups are a deliverable

Use nested Auto Layout for normal UI flow with suitable Hug/Fill/Fixed sizing, minimum/maximum
bounds and wrapping where appropriate. Use constraints for overlays/ordinary frames where
applicable; don't assume constraints operate the same way inside Auto Layout. Keep components
reusable through properties/variants instead of flattened screenshots. Figma supports these
responsive layout mechanisms. [Auto Layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma),
[constraints](https://help.figma.com/hc/en-us/articles/360039957734-Apply-constraints-to-define-how-layers-resize).

Use semantic variables and suitable modes for light/dark/platform treatments, within the
available Figma plan capabilities. Record any library/mode limitations; no paid upgrade or
new subscription is implicitly approved. [Variable modes](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables).

Distinguish fluid resizing from adaptive layout transitions. For each screen define supported
minimum/maximum viewport, what grows/anchors/scrolls, overflow behavior and any compact/regular/
wide mode changes. Use explicit alternate layouts when hierarchy changes. Do not claim that
manually selecting a Figma variant demonstrates automatic breakpoint switching; document the
intended runtime rule separately and verify the actual prototype behavior.

Absolute positioning is appropriate for canvas content and deliberate overlays, not as a
substitute for resize rules on every toolbar button. The canvas can grow without scaling
native controls or changing the drawing's world-space geometry. A visual prototype cannot
prove native layout engine behavior, pen physics, performance or accessibility implementation.

## Resize and state acceptance

Designer provides a reproducible resize check with named frames, version and tested dimensions:
- Minimum, typical and wide/tall layouts plus intermediate widths/heights; resize the actual
  parent frame without manually repositioning children to make the result look correct.
- No accidental overlap, inaccessible controls or clipped required content; document intentional
  truncation, wrapping, scrolling and approved overflow behavior rather than hiding failures.
- Longer sample labels and increased text-size representations; verify focus indicators and
  touch/remote targets. Record limitations that require real native/accessibility testing.
- Light/dark and relevant accessibility variants; distinguish native system behavior from
  custom app tokens. Show normal, hover where applicable, focused, pressed, selected, disabled,
  invalid/error and busy states only where relevant to each control.
- Empty/drawing/selected and native file/recovery flow states, with keyboard/pointer/pen
  expectations and links to CT/INV/SU/shared-scenario IDs.
- TV: remote focus, viewing-distance layout and read-only navigation. Android XR/visionOS:
  approved 2D surface sizing/input, not implicit immersive tools. Mobile: portrait/landscape
  and applicable split-window layouts; do not merely shrink the desktop mockup.

Acceptance is visual/interaction design evidence. The later implementation still needs native
E2E, accessibility checks, resizing tests and running-app designer review on each host.

## Sequence and review packet

S00A first defines shared principles, semantic roles and a lightweight mapping for every
planned platform. Detail the next authorized web slice first, then the macOS component set
and adaptive preview screens in S00, with macos_ui feasibility and owner approval. macOS
remains the primary product target (decision 231). Exhaustive designs for every future OS
are not a prerequisite to either milestone. Each later platform deepens its
foundation/components before its own screen approval and implementation.

Deliver: versioned foundation/component sheets, native mappings, variables/mode documentation,
resize rules/evidence, scenario/state coverage, Figma links, unresolved decisions and owner
approval record. Show a few meaningful visual-direction options before polishing one.
Ask the owner to select/approve; do not assume the current system theme settles product choices.

No additional design coordinator is needed. competitor_researcher supplies bounded evidence;
ui_ux_designer owns visual foundations and behavior, and lead coordinates; platform engineers verify native
feasibility; rust_engine checks shared action semantics; reviewer checks traceability and
approval. Follow workflow.md for missing access, exact version/frame records and drift.

## Internationalization foundations

Follow [i18n](../internationalization.md) and [locale tests](../testing/internationalization.md). Include pseudo-expanded LTR/RTL chrome, mixed-script/CJK labels, larger text and numeric-locale examples in resizable components. Preserve identical artwork/coordinates across direction variants; handedness is a separate concern. Use native logical alignment and review icon mirroring, reading/focus order, accessibility labels and IME behavior with platform engineers. Do not embed translatable text in images or treat pseudotext as an approved translation. English and Ukrainian are required launch languages; show both in approved adaptive Figma. English is source/fallback; concrete resource mappings remain S00B work.

## Motion foundations

Motion is part of the foundation, not an implementation embellishment. Follow [motion](motion.md):
semantic purposes, native platform mappings, normal/reduced-motion policies, input responsiveness
and focus rules. Detailed screens include interactive versioned prototypes, timing/interrupt
tables and native limitations. A library of static frames alone is insufficient.

## Active-stroke style availability

Decision 50 requires disabled color/width/approved style controls and actions while drawing a
stroke. Show the disabled states/accessibility semantics in Figma; native presentation reflects
shared Rust availability. Do not propose a deferred style change or automatic stroke cancellation.
An already-open color panel cannot bypass the shared guard. Restore availability after end/cancel
subject to other state restrictions, without stealing canvas focus. Pressure variation is normal
input behavior, not a disabled settings action. No new style controls are authorized here.

## Export availability during editing gestures

Decision 52 disables native-document and PNG export during active stroke/move/scale interactions.
Menus, controls and shortcut availability reflect shared Rust state. Show disabled/accessible
states without queuing an export or interrupting the gesture. Availability returns after end/
cancel subject to other guards; the user must request export again. Review destination-panel
lifetime/focus with ui_ux_designer and the S02 capture contract. No new pan/zoom restriction is implied.

## Gallery preview framing

Decision 62 requires gallery thumbnails to fit all artwork with a small margin. Do not crop to
last editor view or drop distant marks. Opening still restores the user's local viewport.
Use approved artwork background/color semantics and no interaction overlays. Propose thumbnail
size/margin and empty/loading/error/accessible states in Figma; empty PNG export dimensions do
not prescribe thumbnail size. Distinguish preview failure from unavailable/corrupt artwork.

## Consistent interruption behavior

Decision 73 requires every tool to cancel its unfinished interaction on drawing-window focus
loss, restoring that interaction's prior state without a history entry. Show preview cleanup
and resume behavior consistently; no implicit partial commit for one tool. Completed work and
history remain. UX/engine define the cancellation contract, UI reflects it, and platform adapters
map lifecycle events without overriding native text/IME controls. Future tools inherit the rule.

## Gallery loading stability (owner-approved decision 91)

For every planned platform, design on-demand gallery loading with stable placeholder/card/list
geometry. Reserve preview and metadata space before async content arrives; image decoding, page
completion and error/retry substitution must not shift existing items or scroll position. Use
stable item/focus/AX identities and native view recycling/windowing. Do not impose one fixed pixel
layout across platforms: respond deliberately to window size, locale and accessibility text size.
Figma must demonstrate placeholder/loading/loaded/error transitions at relevant sizes and locales.
Implementation starts on web, then macOS; every host requires its own real loading/scroll evidence.

Cross-platform material accessibility: [reduced transparency policy and host acceptance](accessibility-materials.md). Shared authoring status and TypeScript migration proposal: [shared resources](shared-resources-plan.md).
