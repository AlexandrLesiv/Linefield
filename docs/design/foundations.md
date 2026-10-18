# Design foundations and adaptive review requirements

Status: repository-owned foundation specification, updated 2026-10-18. The authorized web gallery
and drawing-shell prototype provide component and runtime evidence; no complete foundation
version is owner-approved. [S00A](../../tasks/S00A.md) records a bounded existing-component inventory
and readiness. Detail web first, followed by macOS and later platform slices. This specification
does not authorize new widgets, product behavior, native applications or a universal UI engine.

Decision232 selects one consistent Linefield visual system across hosts and retires the wheel.
Decisions233–234 select the responsive Web gallery and slim left rail/top contextual settings
prototype. Preserve those selected designs; older platform-style/wheel explorations remain
historical. Do not restart direction selection to satisfy this foundation task.

## Principles, resources and host mappings

1. Canvas-first hierarchy, restrained chrome, readable feedback and visible focus support the
   selected direction. Explore alternatives only for an unresolved, scoped choice.
2. Define semantic color, text, spacing, shape and icon roles before introducing shared values.
   Record normal, focused, pressed, selected, disabled and applicable error/loading states.
3. Map common Linefield appearance to each selected host toolkit while preserving native text,
   IME, focus, accessibility, lifecycle and OS-owned panels.
4. Specify reusable components for authorized features, followed by adaptive compositions.
   Foundation approval and screen/flow approval are separate checkpoints.

Keep briefs, component/state inventories, host mappings, adaptive rules and approval snapshots
under docs/design/. Link authorized executable web prototypes and exact quality evidence rather
than flattening the design into screenshots. Keep future-host proposals and unapproved
explorations distinct from current implementation and owner-approved records.

| Foundation | Shared meaning | Host-specific responsibility |
| --- | --- | --- |
| Color | Surface, text, separator, focus, selection, destructive/error/success roles | Generated resources and high-contrast/system overrides |
| Typography | Body, title, label and caption hierarchy | Font availability/shaping, metrics, readable scaling and fallback |
| Spacing | Grouping, alignment and density | Actual window, input targets, safe areas and accessibility settings |
| Buttons/actions | Shape, icon role and applicable states | Semantic activation, focus and accessibility through selected toolkit |
| Input controls | Appearance, validation and value intent | Native text/IME, numeric parsing and keyboard/assistive behavior |
| Feedback | Loading, recoverable failure, cancel/retry and status | Honest announcements and host-owned surfaces where required |
| Canvas overlays | Approved selection/tool/preview roles | Geometry, target handling and rendering under shared command authority |

Shared TypeScript resources define semantic theme and localization roles with deterministic
host outputs. Geometry, spacing, typography and interaction states remain identified specification/
code concerns until their shared representation is reviewed. Do not claim every value is tokenized.
No Rust style migration, universal widget engine, all-Skia chrome or resource synchronization
service is selected. No external design service, subscription, connector or account is required.

Use reviewed icons and record asset/font provenance and licenses. OS-native appearance is not
mandatory; native behavior remains. Preserve text sizing, contrast, reduced transparency/motion
and focus visibility. Separate UI theme values from saved artwork colors and export backgrounds.
Theme or RTL changes must not alter artwork geometry/colors. Color alone must not convey state.

Inventory only controls required by approved features. The existing unavailable color/settings
entries do not authorize panels. Preserve current macOS color-control behavior until a concrete
replacement is reviewed. A component inventory does not approve additional screens or tools.

## Resizable specifications and prototypes

Specify content sizing, flexible growth, minimum/maximum bounds, wrapping, truncation and
scroll ownership for each component. Use normal document layout for controls and deliberate
anchors for overlays. In the authorized web prototype, semantic HTML and Vanilla Extract
implement those rules; verify them with actual viewport/container resizing. Other hosts receive
behavior/layout mappings for their selected toolkits, not a promise of identical CSS.

Distinguish fluid resizing from adaptive transitions. Define supported bounds, growth/anchors,
overflow and any compact/regular/wide changes per screen. Fixed screenshots document samples;
they do not prove automatic breakpoint behavior. Canvas content may use absolute positioning;
control layout must preserve reachability without changing document world-space geometry.

For each scoped screen provide:

- Minimum, intermediate, typical and maximum review dimensions, including narrow desktop/split
  windows, portrait/landscape and short heights. Resize without manually repositioning children.
- Every required control reachable without accidental overlap/clipping; explicitly identify
  intentional title truncation, scrolling and wrapping. Preserve identity, focus and scroll.
- English/Ukrainian, expanded text, mixed scripts, enlarged text and pseudo-RTL chrome; verify
  focus indicators and relevant touch/remote target sizes. Preserve artwork orientation.
- Light/dark, contrast and reduced-motion/transparency cases where applicable; inspect component
  selected/disabled/pressed/focused and applicable empty/loading/partial/error/retry states.
- Input/IME/accessibility expectations and CT/INV/SU/scenario IDs. Note unavailable physical
  hardware, native panels and other behavior that a web artifact cannot demonstrate.

Use authorized headless browser tests and local captures for web evidence. Record exact source/
build, browser, dimensions, locale, theme, text scale and motion settings. Review screenshots
alongside meaningful layout/focus/state assertions; do not auto-approve baselines. Label injected
lifecycle/pseudo-layout fixtures and touch emulation. Static captures do not prove complete
motion continuity, physical touch/pen, screen-reader behavior, durability or performance.
Each implemented host still needs its own applicable E2E and runtime design/accessibility review.

TV/watch remain view-only with remote/crown/rotary and viewing-distance requirements where
supported. XR starts with separately reviewed 2D scope. Mobile/tablet adaptation follows window
size, orientation, safe areas, keyboards and input capability rather than device-name-only rules.

## Sequence, ownership and approval

The combined designer owns behavior and visual checklists in one packet. Lead coordinates
scope and platform feasibility; engineers own implementation/tests; rust_engine reviews command
semantics; fresh reviewer independently assesses traceability and changes. Competitor research
informs unresolved choices without expanding scope or reopening selected directions.

Detail the next authorized web slice first, then macOS, which remains the primary native target.
Provide directional mappings for later hosts and deepen them when each slice begins; exhaustive
future-platform designs are not a prerequisite for the current approved prototype.

Deliver versioned component/state specifications, host mappings, semantic resource references,
resize rules/evidence, exact artifact paths/hashes, scenario coverage, remaining choices and
owner approval conditions. Existing scope/design authorization remains valid. New or materially
changed design scope returns for review. A missing required design/approval blocks only its
affected slice; independent authorized work may continue. Follow [workflow](workflow.md).

## Internationalization and motion

Follow [i18n](../internationalization.md) and [locale tests](../testing/internationalization.md).
English is source/fallback; English and Ukrainian are required launch languages. Browser/OS
preferences select language without an in-app switch; region/keyboard remain independent.
Review logical alignment, icon mirroring, reading/focus order, accessible names and native IME.
Do not embed translatable text in images or call pseudotext an approved translation. Shared
resource generation exists; native integration and proficient Ukrainian review remain separate.

Follow [motion](motion.md): specify purpose, normal/reduced-motion alternatives, interruption/
reversal, commit/cancel and focus timing together with visual choreography. Include executable
examples only when authorized. Animation callbacks never own document/save/discard mutations
or delay input/ink. Static states alone do not establish motion acceptance.

## Active-stroke style availability

Decision 50 requires disabled color/width/approved style controls and actions while drawing a
stroke. Show the disabled states/accessibility semantics in design specifications; native presentation reflects
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
size/margin and empty/loading/error/accessible states in design specifications; empty PNG export dimensions do
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
The relevant design packet must demonstrate placeholder/loading/loaded/error transitions at
applicable sizes and locales. Existing synchronous sample fixtures do not verify async loading.
Implementation starts on web, then macOS; every host requires its own real loading/scroll evidence.

Cross-platform accessibility: [reduced transparency policy and host acceptance](accessibility-materials.md).
Shared authoring boundaries: [shared resources](shared-resources-plan.md). Current review surface:
[live web prototype](live-web-prototype.md), with scoped component readiness in [S00A](../../tasks/S00A.md).
