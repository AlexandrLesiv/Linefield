# Current direction notice — decision 232

The owner retired the tool/preset wheel and mandatory native visual styling on 2026-10-18.
Wheel-based adaptations and platform-specific visual prescriptions below are historical proposals;
they are not current requirements. Concepts observations remain evidence about Concepts.
Desktop Linefield proceeds from the left tool rail/top settings with consistent app styling;
feature scope, host input/accessibility and implementation approval boundaries remain.

# Concepts study: Linefield design adaptation v1.2

Date: 2026-10-18. Revision: v1.2, official findings CS-DOC-001–038 and device findings CS-OBS-001–020.
Designer: ui_ux_designer. Status: research/design proposal; no application
implementation, design review approval, native verification or usability study is claimed.
Starting project revision: `fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7`; preserve the current
uncommitted work. This document is the designer's assigned contribution to the lead's broader
Concepts investigation. Only this file is owned by this assignment.

## Recommendation and evidence boundary

Study Concepts as a complete drawing workflow, then adopt its useful hierarchy: get into a
drawing quickly, keep the canvas available, make the active tool and its properties legible,
and reveal precise controls on demand. Preserve Linefield's established gallery and motion.
Do not translate Concepts' extensive inventory into Linefield's first preview.

The first implementation proposal should remain small: a host-rendered drawing shell with
the approved Pen/Select inventory and width/color presentation. Real editable strokes,
selection, autosave and recovery require separate Rust/Wasm integration and their existing
contract gates. The owner's newer five-tool/three-property image direction is a useful visual
study, but its extra tools, opacity and adjustable smoothing need a product-scope decision.
Do not resolve that mismatch by quietly adding features or by shipping disabled placeholders.

Ranked whole-app priorities from this study:

1. Preserve the gallery and its transitions; make pending/failed persistence truthful before
   introducing richer organization. A saving overlay alone is not evidence of durability.
2. Adapt compact tool/property access with explicit target scope and dismissal. Prioritize
   accidental-mark prevention, readable accepted values and keyboard/AX access over wheel styling.
3. Keep one-stroke correction direct and predictable. Defer selection restyling, layers and
   precision features rather than silently changing what a shared property control edits.
4. Keep color discoverable through native macOS controls and a separately reviewed web design;
   distinguish artwork color/opacity from translucent UI and keep host input differences visible.
5. Make export stages explicit: generating a preview is not saving to a chosen destination.
   Defer Concepts' wider formats, library, accounts and sync; retain Linefield's recovery policy.

Evidence classes used in this packet:

| Class | Meaning and limit |
| --- | --- |
| Documented | Official Concepts/Apple source, with platform/date/tier limits in the research packet; not hands-on verification |
| Observed | A specific action on an identified running Concepts build, with device/input and artifact; not universal behavior or a usability result |
| Owner direction | The owner's feedback on Linefield mockups; a preference is not implementation authorization |
| Proposed | This designer's adaptation or behavior; not a claim about Concepts |
| Gap | Unobserved, unavailable or unresolved; never treated as absent or passing |

The [official-source packet](../research/concepts-official-sources-2026-10-18.md), authored by
competitor_researcher, was read and integrated in this revision. Its source dates/platform/tier
limits apply to every `CS-DOC-*` citation below. The lead's [device ledger](../research/concepts-2026-10-18/observations.md)
now supplies CS-OBS-001–020 from Concepts **6.36.1 (5415)** on a physical iPhone 15 Pro Max running
iOS 27.0, operated through macOS iPhone Mirroring. Developer Mode was off during this initial
Mirroring session; the owner later enabled it for a separate USB timing investigation. Account
tier remains unknown. These are single-session mirrored-pointer observations, not direct-touch, native Mac,
Pencil or benchmark evidence. The designer inspected the width-open and selection-restyling
screenshots and read the ledger; the lead performed the actual actions.

The earlier [archived two-tool proposal](archived-explorations.md) is a historical pending proposal;
its ownership analysis is useful, but its 208px/Cancel-center design is not the current visual
direction. Repository sources: [objectives](../objectives.md), [decisions](../decisions.md),
[research requirements](../research/README.md), [design roles](roles.md), [workflow](workflow.md),
[foundations](foundations.md), [motion](motion.md), [input inventory](../input/inventory.md),
[contracts](../contracts.md), [shared E2E](../testing/shared-e2e.md),
[internationalization](../internationalization.md) and [security workflow](../security/development-workflow.md).

## Documented Concepts findings and designer response

The official packet contains direct URLs, source register/version limits and confidence. These
are documented vendor descriptions, not this designer's own device observations:

| Evidence | What the documentation establishes | Design response |
| --- | --- | --- |
| CS-DOC-001–003,007 | Up to eight configurable tool slots; active-tool repeat tap opens settings; inner size/opacity/smoothing entries open slider/presets; held sliding provides temporary adjustment; center opens color; compact mode hides properties | Adapt discoverable tap-open access and a single contextual presentation. Defer hold-slide until touch slop, cancellation and equivalent keyboard access are designed. Reject copying eight slots or inferred squeeze behavior |
| CS-DOC-004–006,008 | Opacity spans transparent to opaque; smoothing changes the path; selected content can be restyled independently of future-tool presets; brush response and preset storage have distinct documented behavior | Do not infer a smoothing algorithm or silently make the same Linefield property control restyle selected strokes. Keep future-pen settings distinct; any selected-stroke restyling needs new scope/transaction review |
| CS-DOC-011–012 | Gallery offers folders/sorting/Recently Deleted; iOS can edit external native files in place | Retain Linefield's existing gallery/removal policy and import-as-copy. Reject external write-through and an incidental Recently Deleted screen |
| CS-DOC-013–016 | Brush dynamics/masks/slice/nudge/text, multiple color models, picker, lasso/item selection and richer transformations exist; some require paid editing | Study discoverability; defer inventory expansion and proprietary palettes/assets. Preserve one-stroke selection and the native macOS color-control direction |
| CS-DOC-017–020 | Canvas navigation, context-dependent held shortcuts, precision aids and automatic/manual layers are documented | Adapt task access, not bindings or model scope. Defer rotation/precision/layers; native field priority and Linefield guards override shortcut imitation |
| CS-DOC-021–024 | Import/export/PDF/object workflows are broad; export preview/region choices and some fidelity limitations are explicit | Adapt clear output scope and limitations for selected PNG/native exchange. Defer formats, objects, linked sharing and any new external data flow |
| CS-DOC-025–028 | Input mappings and features vary by hardware/platform/tier; official Mac FAQ describes native macOS as future work; Windows support warns about conflicting synchronized edits | Preserve capability-based alternatives and local ownership/recovery policy. Do not call iPhone a native Mac interaction reference or adopt sync behavior |
| CS-DOC-029–032 | Live manuals conflict with newer release notes in places; motion timings, AX, focus, numeric locale handling and lifecycle recovery remain unspecified | Use dated release changes as device-test prompts. Keep exact motion, transparency, focus, durability and accessibility claims open |
| CS-DOC-033–038 | Concepts documents configurable Pencil Pro squeeze and a later Tool Wheel invocation; Apple specifies compatible hardware, preferred-action handling, completed squeeze and optional hover position; precise Concepts squeeze interaction remains unverified | Keep persistent hub, squeeze invocation and Apple's PencilKit picker distinct. Adapt visible alternatives first; propose native completed-squeeze invocation only after capability/behavior review |

Response to the researcher's ranked recommendations: **accept** explicit visible tool/navigation
access; **adapt** tap-open width controls with native/DOM numeric alternatives; **investigate**
temporary hold-slide only as an optional accelerator; **defer** selection restyling and the broad
feature inventory. The design priority is to establish property scope, dismissal and event
ownership on the actual host before treating the wheel silhouette as complete.

The owner-requested 50% tray alpha is a Linefield visual choice; CS-DOC-010 explicitly does not
establish a Concepts alpha value. Official documentation of smoothing is not approval to change
Linefield decision 35. No official video playback was inspected in the research packet, so there
is no basis for calling the motion timings below observed Concepts motion.

## Device findings that change the adaptation

These observations are limited to the identified mirrored iPhone session. The full ledger owns
the action sequence and artifacts; local screenshot dimensions are not native touch-target sizes.

| Observation | Evidence and interpretation | Linefield response |
| --- | --- | --- |
| CS-OBS-001 | A Saving overlay preceded gallery return; a new drawing inherited the previous tool setup | Retain clear save/navigation status, but infer neither durability nor restoration policy from the overlay. Keep Linefield's reviewed per-drawing settings and autosave semantics |
| CS-OBS-002–003 | Tray aligns with hub diameter, overlays tools translucently, preserves circle outline, highlights active hub wedge and preset; width has a thin constant-width track with nonuniform tick spacing | These geometric details support the owner's current reference. A tapered width track in earlier Linefield images is our proposal, not copied observed behavior. Do not infer the width transfer curve from tick spacing |
| CS-OBS-003–006 | Width exact entry succeeded after double-click/typing; a temporary large textured arc changed with width/opacity and disappeared when the tray closed; one smoothing drag showed mismatched settled values, while a preset worked | Adapt clear accepted-value feedback and direct numeric access. Do not require double-click/hold as the only entry. Defer a new preview graphic until requested; do not infer a smoothing bug or algorithm without direct-touch repetition |
| CS-OBS-004 | A canvas tap while width was open created a mark and left the tray open | Treat this as nonmodal drawing-through in this session, not safe outside dismissal. Recommend an explicit different policy for Linefield's transient tray, detailed below |
| CS-OBS-005,007,009 | Center reflects brush opacity; color entry opens Copic/HSL/RGB presentations; a separate sheet exposes numeric color channels/HEX | Preserve separate meanings for drawing color, brush opacity and UI surface alpha. Retain native macOS color entry; no Copic assets or radial color interface are automatically adopted |
| CS-OBS-008 | Active brush opens a broader brush/settings sheet with presets/library/market | Do not add a library or deep settings sheet just to reproduce repeated-tap behavior. A lightweight width entry is sufficient for the approved single pen |
| CS-OBS-010–011 | Selection shows bounds/context controls; moving preserves selection; width then restyles the selected stroke; one Undo reverted restyling but retained the move. The updated ledger records selecting Pen afterward restored its earlier width 8/smoothing 75 | Concepts separates future-tool settings from selected-content editing in this sequence. Linefield should not silently inherit restyling: it is new scope, separate from move/scale/delete |
| CS-OBS-012–013 | Menu availability changed during the session for an unresolved reason; workspace settings expose paper/grid/artboard/measurement choices | Record uncertainty; do not reproduce unexplained disabled states or add those workspace features. Linefield unavailable states need an authoritative reason |
| CS-OBS-014 | Interaction settings show finger action Pan Canvas, keyboard settings and contextual online help; mirrored pointer nevertheless drew | Treat input capabilities separately. A mouse-generated drawing action does not establish what a finger does; do not infer gesture parity or add a shortcut editor |
| CS-OBS-015–017 | Layers and Precision panels could coexist and overlap; layer controls, snapping options and a library/market are visible | Defer those features. For any later panels, define collision/focus priority instead of assuming unrestricted stacking is desirable; entitlement clues do not identify the full account tier |
| CS-OBS-018 | PNG generation produced a preview and “Success” wording before destination/share; the session closed without external save | Distinguish “Preview ready” or “Image prepared” from “Saved/Exported.” These are proposed wording choices, not final localized strings. Actual publication needs its own confirmed result |
| CS-OBS-019–020 | About identifies build 6.36.1 (5415); sequential captures show color entering/final states, while the first post-action tray frame is already open | Record actual build, but infer no animation duration, easing, FPS or latency from host capture cadence and Mirroring |

### Outside press and property scope: explicit proposed differences

For the proposed **transient** Linefield property tray, recommend that the first press outside
the tray and its owning hub closes it and consumes that complete pointer/contact sequence.
It must not create a dot, begin a selection/move or activate an occluded tool on release. Drawing
requires a fresh begin after dismissal. This avoids accidental marks during dismissal; the cost
is an extra deliberate gesture when the user intends to adjust and immediately continue drawing.
The alternative is Concepts-like nonmodal drawing-through with explicit close-only dismissal;
that may support fast repeated adjustments but requires clear affordances and actual testing.
The owner must choose the policy in the behavior packet. The study does not silently adopt either.

The permanent tool hub itself need not dismiss on a canvas press. It is not the separately
documented squeeze-invoked palette: no observed permanent-hub behavior establishes squeeze
placement, press/release semantics, dismissal or focus. Direct-touch hold-slide, contact transfer
from a property into canvas and real pen interaction remain untested on this session.

In the approved scope, width/color describe the pen for subsequent strokes. Selecting artwork
does not retarget these controls into a restyling command; Select requires no symmetric settings
popup. If restyling is later approved, explicitly communicate “Selected stroke” versus “Pen,”
announce the scope change accessibly and define transaction/Undo/restoration behavior before
reusing controls. The observed single Undo is not sufficient to infer Concepts' complete model.
The later return to Pen with width 8/smoothing 75 provides bounded evidence of separation in
this sequence; it does not prove persistence across restart, all brush slots or every edit path.

A future live brush sample, if requested, should use the same shared artwork renderer and accepted
style as real ink. It must be a bounded disposable scene, distinct from document strokes and
selection: no document IDs, revision, history, autosave or export participation. The host owns its
location, clipping, accessibility description and lifetime; Rust validates actual settings. A
UI-only prototype cannot claim renderer fidelity. Do not reintroduce the observed huge canvas arc
into Linefield's mockup or infer that it portrays physical size accurately.

## Current scope versus visual exploration

| Area | Established preview direction | Exploration/future scope requiring review |
| --- | --- | --- |
| Library | App-managed unnamed drawings, create/open/rename, recoverable gallery removal and in-place Undo; existing web prototype preserved | Projects/stacks/folders, search, batch management, sync and competitor gallery replacement |
| Drawing | One solid round pen; pressure changes width only; mouse uses constant width; width/color controls | Eraser, Line, Shapes, brush library, pressure curves, adjustable opacity and smoothing |
| Editing | Explicit Select; one stroke; move, uniform positive scale, delete; Undo/Redo | Multi-select, lasso modes, rotation, grouping, clipboard and object library |
| Navigation | Pan/zoom with reviewed input mappings and anchor semantics | Canvas rotation, physical measurement, grids, snapping and precision construction |
| Persistence/exchange | Shared Rust semantics, autosave/recovery; native copy and PNG policy selected, concrete implementation gated | SVG/PDF, arbitrary imported images, cloud, share integrations and accounts |
| Presentation | Web first; macOS primary; native controls around shared Skia/CanvasKit artwork | Five illustrative sectors and three hub properties do not expand the engine inventory |

Decisions 16/34 specify width-only pressure response; decision 35 explicitly excludes movement
filtering and adjustable stabilization. Decision 189 selects base width 1–512 logical units,
not pixels or physical millimeters. The image values width 8, opacity 100% and smoothing 34%
illustrate visual hierarchy. They are not new defaults or approved stored settings.

## Observation plan for the complete Concepts workflow

Use a disposable test drawing and permitted evidence. Record app version/build, platform,
input, tier, orientation/window size, appearance and accessibility settings. Separate actions
performed on the phone from documentation about iPad/desktop behavior. No sign-in, purchase,
private upload or change to system security is needed to complete the design analysis.

| Observation ID | Task and concrete observations | Linefield question |
| --- | --- | --- |
| COBS-G01 | Launch, find/create/open/rename a drawing, return, delete/cancel/recover; note selection, naming and loading feedback | Which discoverability improvements fit the existing gallery without changing its identity or removal policy? |
| COBS-T01 | Choose tools, invoke tool library/customize slots, discover disabled/paid actions; note current-tool indication | Does compact quick access reduce traversal, and how is hidden capability explained? |
| COBS-P01 | Open width, opacity and smoothing individually; change values, switch property, tap away, reopen; inspect highlighted hub entry and overlay | Is one active property sufficient; what persists, and what does dismissal do? |
| COBS-C01 | Open color, choose hue/value/saturation, compare current/proposed, dismiss/cancel; inspect recent/custom colors and numeric entry where available | Which choices are direct changes versus staged choices; can color be reached without reopening tool selection? |
| COBS-E01 | Select, move, scale, delete and Undo/Redo a mark; inspect empty hit, deselect and tool switch | Which contextual controls clarify a single-stroke workflow without extra selection modes? |
| COBS-N01 | Pan/zoom near tool UI, transfer touch to canvas, interrupt a drawing/transform, return after backgrounding | Where are gesture ownership, occlusion and accidental marks exposed? |
| COBS-R01 | Discover precision/grid/measurement/shape aids; inspect units, snapping state and paid limits | Which future benefits justify their added mode/state complexity? |
| COBS-L01 | Discover layers, active layer, visibility/locking/order and empty states | What workflow depends on layers, and what can remain absent from the first preview? |
| COBS-X01 | Inspect export scope/formats/background/scale/destination/cancel and relevant tier gates without publishing private content | What must Linefield explain for its narrower native/PNG exchange? |
| COBS-S01 | Inspect app/document settings, input mapping and help discovery | Which settings are task-specific, global or system-owned; are changes reversible? |
| COBS-V01 | Observe entry/exit, tool/property/color transitions, touch feedback and normal/reduced motion when available | Which transitions explain hierarchy; what is merely decorative? |
| COBS-A01 | Inspect available keyboard/focus/VoiceOver equivalents, text sizing, contrast and portrait/landscape | What remains reachable when radial spatial interaction is unavailable? |

For each case record trigger → visible state → completion/cancel and exact screenshot/video
reference. Note unavailable versus not tested. Use a short targeted recording for motion;
still images cannot establish duration, easing, focus transfer, touch arbitration or latency.
Mirrored iPhone interaction cannot establish pen pressure, Pencil squeeze, palm rejection,
hover, physical pen latency or native desktop keyboard behavior.

## Adaptation decisions and rationale

These are ranked design recommendations, informed by the official findings and the bounded
device observations above. Owner decisions and unresolved direct-device evidence remain pending.
They are not claims that Concepts implements the proposed details identically.

| Priority / area | Disposition and proposed adaptation | Benefit / tradeoff / maintenance cost |
| --- | --- | --- |
| 1 · Canvas access | Adapt compact visible tool access with explicit alternatives; retain accepted active tool and predictable sector positions | Reduces repeated travel; radial targets need host AX/focus and collision handling. A custom wheel is not justified solely by appearance |
| 1 · Tool properties | Adapt one contextual property tray at a time, opened by an explicit hub entry; reflect accepted value, active property and target scope; propose consume-to-dismiss outside input | Reduces simultaneous chrome; overlay consumes drawing/tool area and requires deliberate event blocking. Adds a fresh gesture before drawing after dismissal; compare with observed nonmodal Concepts behavior. Start with approved width only in a production-scope design |
| 1 · Gallery | Retain Linefield gallery and transitions; adopt only evidence-backed improvements to discoverability/loading/error clarity | Protects completed owner choices; library persistence remains substantial separate work |
| 1 · Editing | Adapt direct manipulation and obvious selected-state handles within one-stroke scope; keep pen settings independent of selection | Clear correction path with bounded complexity; observed Concepts restyling is deferred. Do not add menus to Select merely for symmetry with Pen |
| 1 · Color | Retain a distinct current-color entry and the proposed native macOS color control; study staged versus direct color changes before selecting web behavior | Familiar native precise entry and fewer custom controls; host appearance differs and panel focus must be mapped carefully |
| 2 · Navigation | Adapt canvas-first pan/zoom and discoverable fallback commands; retain Linefield interaction guards | Low mode ambiguity; touch/stylus arbitration cannot be inferred from screenshots and requires actual-device testing |
| 2 · Visual/motion | Adapt quiet hierarchy, stable tool positions and contextual reveal; use shared semantic themes with host controls | Preserves artwork attention; translucent overlays can reduce readability and need opaque accessibility alternatives |
| 2 · Settings | Adapt proximity of relevant properties, keeping global/system preferences separate | Avoids a large settings screen; no configurable shortcut/profile framework is implied |
| 3 · Precision | Investigate later, defer grids/snap/measurement/shape construction | Valuable for deliberate geometry but adds units, modes, transform semantics and testing beyond freehand preview |
| 3 · Layers | Defer; record discovery/locking/order observations for a future brief | Powerful organization but changes model, selection, history, rendering and accessibility; cannot enter through a panel mockup |
| 2 · Export | Adapt clear scope/format/cancel explanations and distinct preview-ready versus saved states for native copy/PNG only; retain reviewed durable-export policy | Avoids premature success claims; host destination panels report through shared job state. Do not copy Concepts' format inventory or cloud workflow |
| 3 · Smoothing/opacity | Investigate visually as requested; defer real controls until scope/semantics are approved | Potential control over marks; smoothing directly contradicts current no-filtering decision and needs sample/latency/fidelity review |
| Reject · Parity | Reject wholesale feature parity, proprietary icons/palettes, compulsory gesture-only access and copied branding | Keeps scope and maintenance bounded; familiar workflows are adapted using original assets and host conventions |

No research observation should override Linefield's fixed artwork-color semantics, command
authority, autosave/recovery policy or guards simply because a competitor chooses differently.

## Latest visual baseline and unresolved behavior

The owner's current exploratory direction contains five equal 72-degree outer tool sectors,
with identical inner/outer radii and selection expressed by fill/icon contrast. Pen is at the
top; clockwise illustrative glyphs are Eraser, Line, Shapes and Select. Icons are optically
balanced as complete glyphs on sector bisectors, not centered by arbitrary SVG bounds. No
tool-name labels, checkmarks, Undo/Redo, empty sectors or enlarged selected segment are shown.
This does not prohibit accessible names, tooltips or labeled native fallback menus.

The small central color entry sits inside a property hub containing compact width, opacity and
smoothing entries. Opening an entry highlights it and reveals one horizontal property tray:

- Tray top/bottom align with the hub circle's top/bottom; tray height equals hub diameter.
- Preserve the complete visible inner-circle outline even while the tray is open.
- The tray overlays other tools. Approximately 50% background alpha is the owner's requested
  Linefield proposal, not a measured Concepts value; the observed Concepts alpha remains unknown.
  Text, icons, handles and control marks remain opaque. The tools are visible beneath it.
- Earlier Linefield studies used a fully opaque thin-to-thick width indication; observed Concepts
  uses a thin constant-width slider track plus a separate artwork sample. Choose deliberately
  between them in the next visual packet. Opacity and width must not be mistaken for each other.
  Smoothing is a distinct labeled
  accessible property, not a different width or pressure control.
- Opening/switching a tray never rearranges the five outer tools or shifts the canvas.

Critical proposed interaction improvement: visible tools beneath the translucent tray must not
receive its pointer events. The tray owns its full bounds, including whitespace; underlying
occluded tools are temporarily unavailable to pointer activation. A keyboard/AX alternative
must remain coherent. This is a proposal for future review, not behavior established by images.

Remaining choice before detailed design review: retain a five-slot exploration only, approve the extra
production tools, or redesign the same hierarchy for the two approved tools. Also resolve
whether opacity/smoothing enter scope, property commit/cancel/history/restoration semantics,
value units, discrete examples versus user presets, and full-color-picker behavior. Do not
create a smoothing algorithm or property persistence contract through graphic design.

## Proposed interaction model

The following states are Linefield proposals, independent of Concepts implementation:

| State | Entry / available actions | Exit / preserved invariant |
| --- | --- | --- |
| Drawing idle | Accepted active tool, viewport and optional selection; visible tool/property entry points | Open wheel/property/color or begin an allowed interaction; mere opening changes no artwork |
| Tool access open | Show available tools; hover/focus is a candidate, activation requests selection | Dismiss transient access without switch; successful accepted selection updates presentation. A permanent hub has separate lifetime. No history/URL entry |
| Property open | Exactly one approved property; display accepted value and clear expanded/selected state | Switch property, dismiss or submit validated value. Opening alone creates no command or Undo |
| Property editing | Native slider/field owns its interaction; numeric parsing retains incomplete text locally | Concrete begin/update/commit/cancel and settings-history policy require CT-01–03 review; invalid input is visible and never coerced silently |
| Color open | Native macOS panel or separately reviewed web control; current color remains identifiable | Preserve native focus/IME; define staged/direct change and cancellation explicitly before implementation |
| Stroke/transform active | Shared interaction guard supplies unavailable tool/property/history/export state | End commits one operation; cancel restores pre-state. No queued mode/style change |
| Leaving drawing | Resolve shared pending/failed save/navigation policy, then host route transition | Cancellation preserves current work; animation callbacks cannot authorize departure, save or discard |
| Surface/loading/error | Stable chrome and informative unavailable/retry states; retain accepted data | Recovery never fabricates Saved status or discards user work to make a surface reappear |

Escape order: focused IME/native field/dialog first; dismiss an owned transient property/color
presentation according to its reviewed contract; then shared canvas cancel → clear selection →
no action. Idle Escape must not navigate Back. Explicit Back/browser history retains its own
approved navigation flow. Opening controls cannot steal focus during a stale transition.

Window deactivation cancels unfinished canvas interactions under decision 73. Host engineers must
distinguish focus inside owned controls/color panels from actual drawing-window deactivation.
Tool switching/Undo remain blocked during unfinished tool interactions; style changes remain
blocked during active strokes. No auto-commit, forced cancel, queued replay or optimistic edit
may bypass those shared guards. Resize/mapping changes use decision 78 cancellation ordering.

## Responsive and native presentation

Treat window space, input capability, text size and platform styling independently. A narrow
desktop window can need a compact presentation; a wide tablet window can support the full tray.
Keep active tool, open property, selection, focus and viewport identity stable across adaptation.

| Context | Proposed presentation and review requirements |
| --- | --- |
| Web regular width | Semantic HTML controls above CanvasKit; Vanilla Extract and existing semantic tokens. Clamp wheel/tray within the visual viewport. Retain browser context menu/long press, browser shortcuts and page zoom |
| macOS | AppKit toolbar/menu/native fields and sliders, existing proposed native color control; custom host wheel only where justified. Keyboard/menu access is first-class. Small window and large-text cases determine fallback; custom appearance does not move controls into Skia |
| iPhone/narrow window | Do not shrink numeric targets to preserve the picture. If hub/tray cannot fit, propose a native compact sheet/list with the same properties, focus and accepted state; this adaptive departure from the picture needs owner review |
| iPad/tablet/split window | Review portrait, landscape, narrow split and resized windows. Position near a valid invocation anchor only when it fits; otherwise a stable visible control is the fallback. Pencil support depends on model/API, never device branding alone |
| Other future editors | Map semantic functions to Compose Material3, WinUI or GTK controls; platform engineers review input and actual layout. No universal custom-widget framework |
| TV/watch viewers | No editing wheel or property changes; accessible viewing/navigation only, with shared capability rejection tests |

At a screen edge, first choose a safe anchor or opposite tray expansion that does not rotate or
reorder tool sectors. Do not move the wheel beneath an ongoing drag. If both directions fail,
use the reviewed compact fallback instead of clipping targets. Orientation/resize invalidates
stale pointer captures; full state continuity is subject to the shared interaction guard.
The exact minimum footprint and target sizes need measured layouts, not raster estimates.

Inputs: visible tap/click entry remains mandatory. Keyboard activation uses native conventions,
stable focus order and explicit acceptance rather than focus-to-select. Sliders expose a numeric
alternative with locale-aware validation. Touch targets and separation are reviewed at actual
display scale; pen hover never substitutes for discoverability. Pencil Pro squeeze is a future
native adapter proposal, not a browser pressure heuristic or supported iPhone input. Supported
non-squeeze styluses use visible controls; optional buttons require per-device mapping review.

Accessibility: every icon-only tool needs a localized name, accepted selected state and reason
when unavailable. Property buttons expose value and expanded state; sliders expose range/value
and keyboard increment. Focus remains visible over busy artwork and translucent surfaces.
Use opaque backing for reduced transparency/contrast needs; do not fade control contents with
the tray surface. A linear native/DOM alternative provides the same outcomes without requiring
angular pointing. Screen-reader canvas editing itself remains a separate unverified problem.

Localization: retain shared trusted TypeScript catalogs and generated host resources. Native
consumption remains pending. Design en/uk, pseudo-expanded, RTL and mixed-script states, numeric
region variants and 200% text/browser zoom. Keep artwork/world coordinates and tool identity
independent of UI direction; do not mirror the drawing or infer handedness from locale. A numeric
field must preserve marked text and native shortcuts. Proficient Ukrainian terminology review is
required; this designer does not certify translations. No in-app language switch is proposed.

## Motion proposal, not an observed Concepts timing specification

Retain the current gallery transition implementation and its reviewed interruption/reduced-motion
behavior. These new timings are candidate values for later design review/host review only:

| Transition | Purpose / proposed presentation | Interruption, focus and accessibility |
| --- | --- | --- |
| Tool access reveal/dismiss | 100 ms opacity, no rotation, bounce or sector reordering; no delay | Semantic state changes immediately; outgoing controls become inert; reopening replaces the obsolete transition |
| Property tray open | 140 ms reveal from the hub with stationary text/controls; no animated blur or artwork movement | Full eventual hit region becomes owned immediately to prevent click-through; focus moves once to the actual control |
| Property switch | 80 ms crossfade of contents in stable geometry; highlight switches immediately | Old contents are inert; preserve the user's input modality and do not queue changes |
| Value drag | Immediate accepted/readout feedback; no value easing | Pointer capture/keyboard events own input; animation never delays ink or changes setting transaction boundaries |
| Reduced motion / resize / deactivation | Immediate settled state or synchronous transient teardown | Same semantic outcome; no stale completion may restore focus, reopen a tray or commit a value |

Native panels retain platform-provided transitions; do not invent measured native durations.
Test these proposals with actual content and device scaling before selecting final values.
Opacity/smoothing are rendering/input behavior if later approved, not UI animation features.

## Logical ownership and rendering recommendation

Retain the shared-canvas/host-chrome architecture. The radial selector's custom shape alone is
insufficient reason for a shared Skia widget. No ABI, worker topology or schema is selected here.

| Responsibility | Owner / boundary |
| --- | --- |
| Approved capability/tool inventory, accepted client tool/style, interaction admission, geometry/hit testing of artwork, history and document mutations | Shared Rust commands/projections under CT-01–03; exact per-client/document ownership follows the current coordinator contracts |
| Stroke/selection rendering, scene snapshots, mapping and disposable render caches; future brush sample if approved | Shared renderer/Skia/CanvasKit under CT-06; sample remains a disposable non-document scene. Cannot choose a tool or mutate settings |
| Wheel sectors, tray geometry, menu/control hit testing, collision layout, tooltip/focus/hover/open property | Host presentation; no persisted world coordinates or duplicate editing authority |
| Hardware acquisition, pointer capture, gestures, window lifecycle, coordinate mapping, shortcuts/IME | Host adapters translate reviewed intents; shared Rust rejects inadmissible requests |
| AX tree, localized labels/values, numeric parsing, native panels and focus restoration | Host controls/resources under CT-08/09; generated catalogs are shared authoring, not a universal runtime |
| Persistence/restoration, export-job stage/outcome, version/race validation and recovery | Existing services/engine contracts; host maps confirmed typed state to localized feedback and native panels. Local preview completion cannot claim file publication or crash durability |

A pure host wheel has the simplest coherent focus/AX/layout path and can survive a canvas surface
failure. An all-Skia wheel would still require native accessibility and focus, duplicate hit
geometry and complicate text scaling. A hybrid decorative Skia layer plus native targets is
deferred until a concrete requirement demonstrates value; it is not needed merely to draw arcs.
Mac native controls and web DOM controls can share semantic IDs/tokens while retaining behavior.

## Proposed acceptance and edge-case packet

All new `CAD-*` IDs below are proposed study-to-design scenarios, not discovered tests or passing
evidence. Implementers own later tests; designer owns the combined behavior/visual review;
fresh reviewer audits the packet. Existing CT/INV/SU IDs retain their definitions.

| Scenario / trigger | Expected outcome and invariant | Mapping / evidence owner |
| --- | --- | --- |
| CAD-01 · Open/switch/dismiss wheel and property repeatedly | Accepted tool/value unchanged by opening or focus; one tray; proposed outside dismissal consumes full contact, creates no mark, and requires fresh begin; no stale selection/history. Bind final expectation to owner-chosen dismissal policy | CT-01/02/03/08; INV-01/04/05; SU-02/17; host implementer |
| CAD-02 · Tray overlaps a tool over busy artwork | Tool remains visibly underneath but cannot activate through tray; full hub outline and active property legible; opaque fallback retains hierarchy | CT-08; SU-17; host UI plus designer screenshots/AX |
| CAD-03 · Request tool/style/Undo during stroke/move/scale | Shared guards reject the applicable request, no queued change/forced end/history mutation; availability recovers after end/cancel | CT-01/02; INV-01/04; SU-02–06; Rust conformance + actual host UI |
| CAD-04 · Escape, pointer cancellation, window loss, resize/mapping change and stale release | Native field/IME priority; correct transient dismissal/canvas cancel; no idle Back, partial edit, stale focus or delayed action | CT-02/03; INV-04/05; SU-07/08; FOCUS-001 + native/browser cases |
| CAD-05 · Numeric field invalid/incomplete/IME/comma decimal/out-of-range | Preserve editable text; full validation before typed request; accepted width bounds 1–512; no silent clipping or accidental canvas shortcut | CT-01/09; INV-05/11; SU-07/20; native/browser + Rust boundary |
| CAD-06 · Resize through edge/short/narrow/large-text/RTL layouts | All controls reachable; stable identities/focus and artwork; fallback explicit; no target shrink or accidental gesture continuation | CT-02/06/09; INV-08/11; SU-08/14/17/20; adaptive design + real-host cases |
| CAD-07 · Keyboard, screen reader, switch/voice control, non-squeeze pen | Equivalent accepted actions with names/state/values and visible focus; unsupported hardware never claimed; viewer edit rejected | CT-01/08/09; INV-05/10/11; SU-17/20; manual AX plus actual devices |
| CAD-08 · Gallery return/Back/Forward/reload during entry or tray animation | Gallery motion/route/focus preserved; ephemeral wheel state adds no route; save/navigation rules remain authoritative | CT-03/05/08; INV-04/06/07; SU-10–12; existing gallery regression + DIRTY-NAV-001 |
| CAD-09 · Theme/transparency/motion change and surface recovery | Artwork colors/geometry unchanged; controls readable; correct state without animation; render failure does not lose document | CT-06/08; INV-08/11; SU-14/17; renderer/host + visual review |
| CAD-10 · Actual drawing/editing/save/export slice later | DRAW-001, EDIT-MOVE/SCALE/DELETE-001, FILE-REVISION/FAILURE-001 and EXPORT-001 executed as applicable; UI demonstration is not substitute | CT-01–06; INV-01–08; SU-03–06/09–14/19; engine/host owners |
| CAD-11 · Select/deselect while pen settings are available | Selection never silently changes width/color into an unapproved restyling action; active scope accessible; actual transformed width remains independent of future pen setting | CT-01/03/09; INV-01/05; SU-02/05/17; Rust + host |
| CAD-12 · Open/close a future approved brush sample, then save/export/Undo | Sample contains no document mutation/history and disappears on close; saved/exported content and selection unchanged; rendered style matches the accepted setting | CT-03/06; INV-01/04/08; SU-03/14/19; renderer/Rust + host; conditional on sample approval |
| CAD-13 · Generate export preview, cancel destination, or fail publication | Preview is labeled prepared/ready only; no Saved/Exported outcome before confirmed publication; cancellation/failure preserves approved source/job state and cannot silently retry an uncertain write | CT-01/05/06/09; INV-01/06/07; SU-11/12/19; existing export contract owners + host |

Empty/disabled: no selection means no transform/delete actions; unsupported properties are not
invented. Loading/partial/error: stable shell, explicit retry/recovery where applicable, no fake
Saved state. Cancel: distinguish dismissing UI, cancelling an unfinished interaction, and already
accepted/persisted edits. Retry cannot duplicate an accepted command. Reopening a recovered
drawing must use the existing pending-work/history reconciliation policy, not a fresh UI default.

Evidence must name exact source/build/device/input/fixture and discovered test IDs; separate
core, bridge, replay, browser, native UI, screenshot and manual AX results. Test normal and
reduced motion. Include I18N-LAUNCH-002/I18N-UK-002 plus independent linguistic review when built.
Do not infer Pencil/native E2E, physical latency, accessibility conformance or persistence from
image studies or browser simulations.

## Delivery sequence and owner decisions

1. Complete official-source and authorized device observation tables. Identify platform/tier
   differences and untested areas instead of claiming complete Concepts parity knowledge.
2. Present this adaptation packet with the evidence; select the next Linefield product scope.
   Resolve extra tools, opacity/smoothing, approved properties and wheel inventory explicitly.
3. Prepare one versioned behavior/visual design review packet for the chosen slice, including adaptive
   sizes, en/uk, input/AX, all applicable error/cancel states and motion. Coordinate native/Rust
   feasibility through the lead. No identified design version exists in this assignment.
4. If the owner requests a web UI-only prototype first, record its exact pre-design review exception and
   mocked semantics. Preserve gallery and distinguish that prototype from Rust/Wasm editing.
5. Review concrete engine/property/FFI/restoration contracts and security boundaries before real
   integration. Implement one authorized slice, then run actual checks and independent review.

Pending approvals are concrete, not a request for a new general policy questionnaire:

- **Product inventory:** two approved production tools versus the five illustrative sectors;
  whether opacity, smoothing, selected-stroke restyling or a sample preview should enter scope.
  Approval of a visual study does not resolve these semantic changes.
- **Identified interaction/visual version:** persistent hub versus transient invocation, property
  target/commit/cancel, outside-press behavior, numeric access and adaptive fallback; exact design review
  frames/prototype version, input mappings, locales and normal/reduced motion.
- **Web-only exception if selected:** the precise UI prototype slice, local simulated state,
  preserved gallery regression requirements and what it deliberately cannot demonstrate.
- **Real integration:** concrete typed Rust/Wasm/native property/capability projections,
  transaction/restoration and renderer-preview contracts, relevant storage/security changes and
  platform feasibility before coding. No new ABI/thread/storage mechanism is selected here.

The next implementation slice should not bundle these decisions into a broad editor rollout.
First approve the scope and a reviewable UI artifact; then prove real Pen behavior and its shared
guards with the appropriate engine/host evidence. Selection and later capabilities follow their
own small authorized slices. Keep macOS native color/focus feasibility visible while web leads.

Behavior checklist before implementation: approved inventory, acceptance/guards, property
transaction semantics, input/focus/IME, navigation/dirty handling, recovery and evidence owners.
Visual checklist in the same packet: geometry/icon balance, native mappings, resize/edge cases,
state legibility, contrast/transparency, en/uk/text scaling, and identified normal/reduced motion.

This documentation-only assignment introduces no executable input, permission, persistence,
network, dependency or authority boundary. No private drawing is embedded in the document.
Lead must confirm the security-impact classification. Future FFI/import/storage/export or private
evidence handling triggers the existing security workflow and independent assessment; design
review is not certification of those controls.

## Evidence and review gaps

- Official findings CS-DOC-001–038 and device findings CS-OBS-001–020 are integrated. Direct-touch,
  focus and intrinsic motion timing are unverified by this initial Mirroring evidence; its captured
  state sequences are not FPS/latency evidence. A later separately identified motion report may
  supersede specific timing gaps within its stated method and limits; this document does not
  pre-judge that investigation or promote its results to physical input-latency evidence.
- Build is identified as Concepts 6.36.1 (5415) on iPhone 15 Pro Max, iOS 27.0; account tier
  remains unknown. Device control was authorized through iPhone Mirroring with mutations confined
  to the new research drawing; no inaccessible feature is assumed absent.
- Pencil squeeze/hover/pressure and iPad behavior cannot be verified on the connected iPhone.
- No macOS Concepts equivalence is inferred from mobile UI; Linefield native feasibility remains
  a platform-engineer review, with Apple-native color controls retained.
- No editable design review, automatic resize demonstration, native AX/keyboard/IME or proficient Ukrainian
  review is available. All proposed motion timings are untested design values.
- Five-tool/three-property mockups remain visual exploration. New-tool/style scope, concrete
  transaction semantics and implementation permission remain owner decisions.
- Existing gallery prototype evidence remains scoped to its historical exact build; this study
  neither reran those checks nor establishes new drawing-screen acceptance.
- Direct touch, hold-slide, numeric rejection/IME/locale boundaries, lifecycle interruption,
  selection-style restoration across restart, output-file fidelity/publication/recovery and
  source-document sync conflicts remain gaps. The observed narrow sequence cannot fill them.

Documentation verification: the designer reviewed the integrated evidence IDs and scope
boundaries and ran `git diff --check` successfully. No application/runtime tests were run for
this prose-only change. Lead coordinates independent review and the owner handoff; this is not
self-approval of a new screen, tool, implementation or architectural mechanism.
