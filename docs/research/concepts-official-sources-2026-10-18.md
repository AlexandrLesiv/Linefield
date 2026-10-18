# Concepts official-source workflow study — 2026-10-18

Status: research handoff, not design approval, user validation, implementation or runtime evidence.
Author: competitor_researcher; recipients: lead and ui_ux_designer. Reference Linefield revision:
`fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7`. All sources accessed 2026-10-18.

## Brief and limits

Understand Concepts generally, with particular depth on its size/opacity/smoothing controls,
to inform later Linefield design. Target reference is Concepts for iPhone/iPad; Windows/Android
differences are included only where explicitly documented. macOS remains Linefield's primary
product target, with web implementation first. This packet does not alter the existing gallery,
approved Pen/Select/navigation scope or the [archived drawing proposal v1](../design/archived-explorations.md).
Smoothing, brush libraries, layers, multi-selection and other competitor features do not become
Linefield requirements through this research. The existing macOS color-control direction remains.

Method: read public official manuals, release notes, tutorials, feature/pricing pages and support
articles. No application/device access, sign-in, purchase, private upload or competitor asset copy.
The lead separately owns physical-iPhone observation and its exact device/build/entitlement record.
That session uses an iPhone 15 Pro Max through iPhone Mirroring, without Apple Pencil; it cannot
establish squeeze behavior. Mirrored mouse actions are not direct finger or Pencil measurements.
Public pages were available through web retrieval; a direct Node fetch failed DNS. The official
video catalogue was readable but its walkthrough playlist fetch failed; no Concepts playback or
transcript was inspected. The Apple follow-up used an official transcript, not motion measurement.
Static images and descriptive image labels are not motion evidence.

Evidence labels below: **D** documented vendor claim; **U** unresolved by inspected sources;
**I** inference/recommendation, never observed behavior. High confidence means clear source wording,
not verified operation. Medium means legacy, ambiguous or conflicting documentation. No row is
directly observed app behavior. Live manuals are unversioned; do not assume every section describes
the latest installed build. Source dates and platforms below apply to their linked findings.

## Source register

| Ref | Official source | Version/date/platform limitation |
| --- | --- | --- |
| S01 | [Workspace](https://concepts.app/en/manual/workspace) | Live unversioned cross-platform manual; explicit iOS exceptions |
| S02 | [Brushes and Tools](https://concepts.app/en/manual/brushes-and-tools) | Live unversioned; brush creation explicitly iOS |
| S03 | [Settings](https://concepts.app/en/manual/settings) | Live unversioned; hardware/platform-dependent controls |
| S04 | [iOS release notes](https://concepts.app/en/ios/roadmap) | Page updated 2026-09-02; latest listed 6.36, September 2026; earlier entries dated individually |
| S05 | [Menus, brushes and presets tutorial](https://concepts.app/en/tutorials/setting-your-menus-brushes-and-presets/) | Older iOS tutorial; exact publication date/build unknown; still linked by current manual |
| S06 | [Select and edit tutorial](https://concepts.app/en/tutorials/select-edit-notes-drawings-designs/) | Older iOS tutorial; exact publication date/build unknown |
| S07 | [Colors](https://concepts.app/en/manual/colors) | Live unversioned; palette/mixer exceptions identified as iOS |
| S08 | [Selection](https://concepts.app/en/manual/selection) | Live unversioned; actual input behavior/build untested |
| S09 | [Gallery](https://concepts.app/en/manual/gallery) | Live unversioned; separate iOS, Windows and Android file-management sections |
| S10 | [Infinite Canvas](https://concepts.app/en/manual/infinite-canvas) | Live unversioned; conflicts with newer iOS release notes |
| S11 | [Precision Tools](https://concepts.app/en/manual/precision-tools) | Live unversioned; feature availability also subject to tier |
| S12 | [Layers](https://concepts.app/en/manual/layers) | Live unversioned; free/pro distinctions |
| S13 | [Import](https://concepts.app/en/manual/import) | Live unversioned; formats differ by platform |
| S14 | [Export](https://concepts.app/en/manual/export) | Live unversioned; output-specific limitations |
| S15 | [PDF](https://concepts.app/en/manual/pdf) | Live unversioned; Essentials/Everything entitlement |
| S16 | [Library](https://concepts.app/en/manual/library) | Live unversioned; Objects terminology changed in iOS 6.35 |
| S17 | [Feature comparison](https://concepts.app/en/features) | Lists iOS 6.36 and other-platform 2026.9 generation; some cells conflict with release notes |
| S18 | [Pro features](https://concepts.app/en/features-pro) | Current marketing matrix; exact offer/build/region unknown |
| S19 | [Pricing explained](https://concepts.app/en/pricing-explained/) | Current public offers; store/region entitlement not inspected |
| S20 | [Pro Store FAQ](https://tophatch.helpshift.com/hc/en/3-concepts/faq/103-what-are-the-options-in-the-pro-store-is-subscription-mandatory/) | Official support; exact revision unknown |
| S21 | [Mac version FAQ](https://tophatch.helpshift.com/hc/en/3-concepts/faq/214-do-you-have-a-mac-version-of-concepts-1759253708/?f=do-you-have-a-mac-version-of-concepts&l=en&p=ios&s=general) | Official indexed FAQ text; relative update age only, exact version unknown |
| S22 | [Windows sync FAQ](https://tophatch.helpshift.com/hc/en/3-concepts/faq/253-how-do-i-sync-drawings-across-devices-on-windows/) | Official indexed FAQ text; Windows only, exact revision unknown |
| S23 | [Official iOS tutorials catalogue](https://tophatch.helpshift.com/hc/en/3-concepts/faq/144-concepts-tutorials-for-ios/) | Current catalogue includes older materials; not video observation |
| S24 | [Apple Pencil compatibility](https://support.apple.com/en-us/108937) | Apple Support, published 2026-03-10; hardware/OS prerequisites |
| S25 | [Concepts: Pencil Pro squeeze and roll](https://concepts.app/en/apple-pencil-pro-squeeze-roll/) | Concepts 6.14+ article; exact publication date unknown; launch-era device list incomplete today |
| S26 | [Handling squeezes](https://developer.apple.com/documentation/applepencil/handling-squeezes-from-apple-pencil) | Current Apple developer documentation; indexed text inspected; no SDK/runtime test |
| S27 | [Apple Pencil and Scribble HIG](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble) | Current Apple design guidance; indexed text inspected; not Concepts behavior |
| S28 | [WWDC24 session 10214](https://developer.apple.com/videos/play/wwdc2024/10214/) | Apple 2024 transcript/code inspected; no video-motion measurement |
| S29 | [Squeeze hoverPose](https://developer.apple.com/documentation/uikit/uipencilinteraction/squeeze/hoverpose) | Current Apple UIKit documentation; optional position contract |
| S30 | [Apple Pencil comparison](https://www.apple.com/apple-pencil/) | Current Apple product comparison; hardware capability claims, not app acceptance |

## Deep case study: property controls

| Finding | Documented evidence and confidence | Limits / tier |
| --- | --- | --- |
| CS-DOC-001 | **D, high. S01:** Tool Wheel outer ring has up to eight configurable slots. Tap activates; tap active tool again, or double-tap inactive tool, opens brush settings. | General UI. Wheel selection and settings entry are distinct actions. Exact tap recognition thresholds U. |
| CS-DOC-002 | **D, high. S01:** Inner ring exposes size, opacity and smoothing. Tap opens slider/presets. Tap a preset to select it, drag slider to change its value, or hold preset value for numeric entry. Another tap dismisses. | Four size presets explicitly documented. Dismissal tap target and outside-tap consumption U. |
| CS-DOC-003 | **D, high. S01:** Hold-slide on a property shortcut provides temporary adjustment: slider opens during sliding and closes when finger lifts. | No stated hold duration, drag slop, pointer capture, cancellation rollback or undo boundary. |
| CS-DOC-004 | **D, high. S02:** Opacity endpoints are 0% transparent and 100% opaque. Smoothing 0% retains hand input; 50% reduces bumps; 100% straightens between endpoints. | Descriptions, not algorithms. Width min/max, step/precision and slider transfer curve U. Basic smoothing is listed in free tier (S18). |
| CS-DOC-005 | **D, medium. S05:** Presets support quick selection, slider adjustment and held numeric entry. Tutorial says drawing settings retain brushes/presets/colors/canvas setup; new drawing inherits setup from previously opened drawing. | Legacy description requires installed-build check. Does not establish save timing, crash behavior, slot-vs-brush identity or cross-device persistence. |
| CS-DOC-006 | **D, medium. S06:** With strokes selected, size/opacity/smoothing changes edit those strokes without changing original tool presets; changing brush or center color can restyle selection. | Legacy iOS tutorial. Paid selection/editing entitlement applies (S18). Mixed-value display, ordering, undo grouping and interruption U. |
| CS-DOC-007 | **D, high. S01:** Center shows brush color and opacity; tap opens color wheel, hold opens Colors menu on iOS. Wheel/bar offer equivalent choices; compact mode hides property controls. Wheel can move and resize. | Exact compact hit areas, expansion anchor and edge-clamping U. |
| CS-DOC-008 | **D, high. S02:** iOS Brush Editor has preset sliders and held numeric entry. Pressure/tilt/velocity can vary size/opacity; smoothing has no variance curve, and Reveal brushes have no opacity variance graph. | Editor requires Essentials/Everything. Dynamic response and base value are different settings; ordinary Pen behavior must be checked separately. |
| CS-DOC-009 | **D, high. S03:** General tap-hold action/timing is configurable. Stylus hold can be disabled. Keyboard bindings, finger actions and stylus/mouse shortcut buttons can be configured. | Manual does not say the general hold threshold controls property-slider opening. Touch wording does not establish equivalent mouse/keyboard slider gestures. |
| CS-DOC-010 | **U:** Inspected sources do not specify property-tray animation duration/easing, simultaneous-tray exclusion, translucency percentage, blur formula, shadows, release outside bounds, focus restoration or reduced-motion behavior. | User screenshots are separate evidence. Their 13.4px/100%/34% labels are example state, not defaults/ranges. A single horizontal tray in a still does not establish its opening animation. Exactly 50% surface alpha is an owner proposal, not a measured Concepts fact. |

The workspace-derived summary above is intentionally bounded. In particular, the permanent wheel's
property controls should not be assumed to describe the separate Pencil squeeze invocation.
The follow-up below rechecks the earlier [archived drawing proposal v1](../design/archived-explorations.md)
CR-D01–05 against current official sources.

## Pencil squeeze, permanent wheel and alternative inputs

| Finding | Evidence and confidence | Limits / tier |
| --- | --- | --- |
| CS-DOC-033 | **D, high. S04:** Concepts 6.14 added configurable squeeze in June 2024; 6.15 added squeeze to show Tool Wheel in July 2024. | Release claim, not demonstrated interaction. Exact paid-tier restriction is unspecified in these sources. |
| CS-DOC-034 | **D, high. S24/S26:** Squeeze requires Pencil Pro. Apple lists iPadOS 17.5+ and compatible iPads: Pro 11/13-inch M4/M5; Air 11/13-inch M2/M3/M4; mini A17 Pro. | Full current Apple compatibility list as accessed, not a Concepts certification matrix. Newer iPads may ship with a later minimum OS; 17.5 is the Pencil prerequisite, not an OS downgrade claim. |
| CS-DOC-035 | **D, high. S25:** Concepts configures squeeze under Settings → Interaction. Apple Settings adjusts squeeze sensitivity or disables it. Double-tap on Pencil Pro/2nd generation remains configurable with many similar actions. | The article's M4 Pro-only hardware wording is incomplete against current S24. Do not treat it as excluding compatible Air/mini. No universal gesture parity asserted. |
| CS-DOC-036 | **D, high. S27:** Apple describes squeeze with paired iPad screen on and tip off the display; recommends one discrete, nondestructive action rather than sustained squeezing. UI should appear near the Pencil. | Apple guidance, not evidence of Concepts recognition, gesture thresholds or menu placement. App Shortcut preference can supersede app-specific handling. |
| CS-DOC-037 | **D, high. S28/S29:** Apple's example checks preferred action and ended phase, then uses optional hover position or fallback. An App Shortcut preference prevents app squeeze delivery. Hover pose may be absent when out of range/unsupported. | Native API evidence only. Apple's PencilKit arc/Notes demo is not Concepts UI. iPadOS 18 custom-tool picker features are distinct from Pencil Pro's hardware/OS prerequisite. |
| CS-DOC-038 | **U:** Concepts sources establish an invocation option, not whether its summoned wheel duplicates/repositions/replaces the permanent wheel. Exact placement, contents, press/release/hover selection, repeat-squeeze dismissal, edge behavior, animation, focus and AX remain unverified. | Permanent-wheel screenshots cannot answer these questions. Neither iPhone Mirroring nor a web mock demonstrates Pencil squeeze. No Sidecar forwarding or macOS squeeze support assumed. |

The three references must remain separate in any visual report: Concepts' **persistent Tool Wheel**
(CS-DOC-001–010); Concepts' **squeeze invocation** (CS-DOC-033/038); and Apple's **PencilKit
contextual picker** (CS-DOC-037). Similar circular appearance does not identify shared implementation.

| Input | Documented Concepts evidence | Linefield option to investigate, not approved behavior |
| --- | --- | --- |
| Mouse/trackpad | Configurable right mouse button and keyboard/mouse settings (CS-DOC-009/025). Full current action list and picker-specific behavior U. | Visible Tools button with ordinary click selection; optional scoped shortcut. Preserve web context menu. |
| Keyboard | Customizable shortcuts and navigation modes (CS-DOC-018/025). Exact wheel invocation binding and accessible traversal U. | Focusable visible trigger plus native menu semantics; no global letter binding inferred. |
| Touch | Tappable permanent tool slots and property controls (CS-DOC-001–003); finger actions configurable (CS-DOC-025). | Tap trigger then choice, with no required hold. Keep navigation gestures and canvas input distinct. |
| Non-squeeze stylus | Supported shortcut buttons configurable (CS-DOC-025); Pencil 2 double-tap alternatives documented (CS-DOC-035). S30 shows USB-C Pencil lacks squeeze and double-tap. | Visible controls remain baseline; device-specific button/double-tap mapping only after capability/binding review. Pressure is not a substitute squeeze event. |
| Pencil Pro | Squeeze invocation supported as above; Apple's hardware/system preferences apply. | Native adapter could summon an approved selector after completed squeeze, honoring preferences and fallback anchor. No browser/device implementation claimed. |

**CS-OBS-09 — future hardware gap, high priority:** on an authorized compatible iPad/Pencil Pro,
record configured action/tier; test single squeeze, offscreen hover, tip contact, repeated squeeze,
selection and cancellation, then focus loss during presentation. Record whether permanent UI moves
and whether artwork/history change. No expected Concepts outcome is invented. Lead owns any
separately authorized observation; designer/native engineer own later proposed UI and input cases.
For Linefield, CT-01/02 and WEB-D02/04/08 remain relevant, but web cases cannot close this hardware gap.

## Whole-app workflow evidence

| Finding | Documented evidence and confidence | Limits / tier |
| --- | --- | --- |
| CS-DOC-011 | **D, high. S09:** Gallery opens drawings by tap/click; hold/right-click offers rename/duplicate/delete. Folders, sorting, grouping and Recently Deleted organize documents. New opens canvas; returning shows its thumbnail. | General workflow; retention duration, pending-save navigation and recovery guarantees U. Not a proposal to change Linefield gallery. |
| CS-DOC-012 | **D, high. S09:** iOS Gallery mirrors its Files folder. External `.concept` files can be edited in place and saved to their source on gallery return without appearing in Gallery. Removing app deletes its local folder. Windows uninstall preserves its drawing folder; Android App Storage is removed on uninstall. | Vendor warnings, not reproduced destructive tests. Linefield selects import-as-copy instead; no policy transfer. |
| CS-DOC-013 | **D, high. S02:** Multiple brush/tool types have different dynamics. Textured brushes can pixelate and increase file/performance demands. Masks are nondestructive; Slice removes vector segments; Nudge reshapes. Text labels can be created and edited. | No performance measurements. Market packs may require purchase/subscription. Concepts Pen naming does not define Linefield pressure semantics. |
| CS-DOC-014 | **D, high. S07:** Color selection offers Copic, HSL and RGB. Copic arranges neutrals and color gradients radially and rotates by vertical drag. HSL/RGB expose sliders/numeric values. iOS palettes hold up to eight colors, with a mixing gesture. | No evidence that a fan is universally faster or accessible. Color-management accuracy and theme independence require measurement, not appearance inference. |
| CS-DOC-015 | **D, high. S07:** Picker shows sampled/current color; release selects. Alpha toggle changes whether background participates. Picker can also retrieve stroke properties. | Sampling behavior is distinct from brush opacity and UI-surface translucency. Exact rounding, transparent-edge sampling and color-space conversion U. |
| CS-DOC-016 | **D, high. S08:** Selection is available through tool, hold, configured finger or layers. Item picker and lasso support inclusion/filter choices. Popup includes duplicate/group/lock/delete and transforms. Scale can include stroke width; stretch preserves width. Selected strokes appear prominent while others can dim. | Paid editing (S18). Multi-select/rotation/warp exceed Linefield scope. Exact cancel/undo/focus behavior U. |
| CS-DOC-017 | **D, high. S10:** Two-finger pan/pinch/twist navigates canvas. Tool/keyboard navigation alternatives and numeric zoom/rotation controls exist. iOS provides offscreen-content indicators. Artboards define output regions. | Infinite is product terminology, not measured coordinate or capacity bound. Rotation is outside Linefield preview. Snap-toggle platform claim conflicts with S04. |
| CS-DOC-018 | **D, high. S02:** Space, R and S support toggled or held navigation; release from held mode restores previous tool. R/S can instead transform an active selection/guide. | Context changes meaning. Native field/IME precedence and interrupted-key recovery are not established by this text. Do not copy defaults to web/macOS without reviewed bindings. |
| CS-DOC-019 | **D, high. S11:** Precision combines grids, snapping, scales/units, measurements and line/arc/angle/ellipse/rectangle guides. Draw-and-hold can recognize shapes. | Availability depends on feature/tier. These are precision workflows beyond Linefield's current sketching scope; no physical-accuracy proof. |
| CS-DOC-020 | **D, high. S12:** Free tier has five layers, paid tier unlimited by product description. Automatic layers organize by tool; manual mode gives active/reordered layers. Visibility, lock, duplicate, merge, rename and opacity are available; focus mode emphasizes one layer. | Unlimited is an entitlement claim, not memory bound or performance evidence. Exact merge/delete recovery and undo U. |
| CS-DOC-021 | **D, high. S13:** Import accepts images/PDF/native drawings from Files/Photos/clipboard or drag where supported. Imported items arrive selected for positioning; automatic mode uses image layer, manual mode active layer. `.concept` iOS and `.concepts` Windows/Android formats differ. | Old format lists may omit newer support. No malformed-file, unavailable-provider or permission-error behavior verified. Images/import editing exceed current Linefield scope. |
| CS-DOC-022 | **D, high. S14:** Export offers raster/vector/native formats and artwork/artboard/selection-related regions, with preview before save/share. Transparent PNG is available. Vector outputs may lose texture/width fidelity; masks become white in SVG/DXF. Back returns to export; X cancels. | Format entitlements differ (S18). Publication atomicity, recovery, overwrite races and durable jobs U. This is not evidence for Linefield export architecture. |
| CS-DOC-023 | **D, high. S15:** PDF workflow imports to scale, places pages on canvas, exposes multi-page browsing/management and export. Multi-page sidebar can hide and reopen through selection controls. | Essentials/Everything. Actual scale/fidelity untested. PDF tooling is outside Linefield preview. |
| CS-DOC-024 | **D, high. S16:** Library contains object packs/search/favorites and insertion by tap/drag. Menus can move/pin/resize; navigation includes close and back-to-packs. Custom object/pack deletion and replacement are described as not undoable. Sharing links can expose packs to anyone with the link. | MYOO subscription; pack entitlements vary. No link/privacy enforcement verified. No proprietary asset reuse or network feature recommendation. |
| CS-DOC-025 | **D, high. S03:** Workspace controls include background/grid/artboard/units/scale. Input settings distinguish finger and stylus, multi-finger actions, pressure/tilt, handedness and supported shortcut buttons. Squeeze is Pencil Pro specific; hover/barrel controls depend on hardware. | Android low-latency setting and iOS external-display presentation are platform-specific. Hardware support claims are not device tests. |
| CS-DOC-026 | **D, high. S18–20:** Free tier includes basic drawing/smoothing, five layers, five image imports and JPG export. Essentials is a one-platform purchase; Everything subscription spans supported platforms through account entitlement. Selection/transforms and richer export are paid; extra packs can be separate. | Public offer, not installed account state. Pricing/region and restoration/offline entitlement behavior unverified. PDF inclusion is clearer in S15/S18/S20 than abbreviated S19 bullets. |
| CS-DOC-027 | **D, medium. S17/S21:** Feature matrix lists iOS 15+, Windows 10 build 19041+, Android 8+ and platform gaps such as iOS custom brushes. Official Mac FAQ describes native macOS as future work. | No native macOS reference build examined; iPhone behavior cannot certify AppKit fit. Minimum OS is not minimum for every hardware feature. Matrix discrepancies below remain. |
| CS-DOC-028 | **D, high. S22:** Windows uses OS/provider folder synchronization. Official support warns simultaneous/offline conflicting edits may overwrite one version and permanently lose changes. | Windows warning only. No iOS conflict experiment; not a generic claim that offline local sketching loses work. No Linefield sync authorization. |

## Recency, contradictions and unavailable evidence

**CS-DOC-029 — D, high about release text; current runtime unknown.** S04 lists iOS 6.36
zoom/rotation snapping toggles, while S10 still excludes iOS from disabling them. S04 adds
Library/Pexels in 6.35; S17 still marks Pexels unavailable on iOS. Prefer dated release claims
as investigation leads, but resolve on the installed build instead of silently merging sources.

**CS-DOC-030 — D, high about historical change.** S04 records hover improvements (6.32),
double-tap navigation reset (6.31), export previews/progress (6.30), visual polish (6.28),
overlay close/unresponsiveness fixes (6.0) and gallery/document/canvas-closing crash fixes (6.34).
These suggest regression prompts, not current bugs, interruption safety or animation timing.

**CS-DOC-031 — U, evidence availability.** S23 links official getting-started, walkthrough and
deep-dive videos. A walkthrough playlist retrieval returned an internal fetch error. Manual
video thumbnails were not playable evidence in this study. The phone study must establish
motion, gesture ownership and appearance; neither this packet nor the screenshots establish
animation duration, frame rate, latency or proprietary implementation technology.

**CS-DOC-032 — U, cross-cutting gaps.** Inspected sources do not establish slider accessibility
roles/labels, VoiceOver adjustment, keyboard traversal, focus recovery, locale decimal parsing,
RTL, reduced motion/transparency, interruption after app backgrounding, or offline entitlement
expiry behavior. Loading/error/retry messages, storage exhaustion, autosave scheduling, crash
recovery and rollback are not sufficiently specified for implementation contracts. Missing
documentation is not proof of absent behavior. Vendor safety/privacy/performance wording is not
an independently verified protection or benchmark.

## Device evidence priorities and edge-case handoff

These are **research questions**, not expected Concepts outcomes or executable tests. Lead owns
device observation; record app/build, iOS/device, input, subscription, initial state, action order,
visible outcome and artifact. ui_ux_designer synthesizes the results. Use only expendable authorized
drawings; do not delete user files, alter accounts/security or induce destructive failures for research.

| Case | Starting state and trigger | Unresolved outcome / invariant to inspect | Priority and later Linefield ownership |
| --- | --- | --- | --- |
| CS-OBS-01 | Idle tool; tap each property, switch property, tap active property/outside; repeat while opening/closing | Which tray survives, what receives outside input, and whether artwork remains unchanged. Measure both tap-open and hold-slide sequences. | High; lead observation. Designer + future host implementer; WEB-D03/04 analogues. |
| CS-OBS-02 | Tray open; select preset, slide, hold numeric value; enter boundary/invalid/localized value then confirm/cancel | Selection vs editing distinction, field focus, rounding/clamping/rejection, active preset and changed scope. Exact Concepts bounds U. | High; designer, host numeric parser and future Rust validation; CT-01/02/09. New cases need reviewed bounds. |
| CS-OBS-03 | Tool configured; switch tool/slot, leave/reopen drawing, create another drawing | What is per-tool/slot/drawing/global; whether defaults inherit; whether change affects artwork or future strokes. | High; lead observation. Rust/session contract owner before real integration; CT-03/05. |
| CS-OBS-04 | Existing stroke selected; adjust size/opacity/smoothing/color; undo once, deselect and draw | Does selection editing preserve future-tool presets; what is one undo operation; how mixed settings appear. | High; no Linefield restyling scope implied. Designer/Rust owner if ever approved. |
| CS-OBS-05 | Slider drag/open transition; background app, rotate, return, then fresh gesture | Partial update, rollback, stale touch/end events, dismissal and ability to resume. Screen rotation needs authorized session. | High; host/Rust interaction owner, FOCUS-001/DRAW-CANCEL-001 when real editing exists. |
| CS-OBS-06 | Open tray near edges in portrait/landscape, keyboard visible; change text size/theme/reduced motion if authorized | Clamping, overlap, value legibility, focus target and transition interruption. Preserve user's settings afterward. | Medium; designer/host, WEB-D02/05/06. Physical AX evidence separate. |
| CS-OBS-07 | Drawing and overlay open; invoke gallery/Back; reopen drawing | Overlay lifetime, navigation precedence, visible saving/loading/error status and restored UI. | High; host + persistence owners; WEB-D07 preserves existing Linefield transitions. |
| CS-OBS-08 | Ordinary local drawing with already available features; lose connectivity only if separately authorized | Which actions remain usable; any sign-in, asset, entitlement or sync notice. No claim about failure recovery without an actual case. | Medium; lead observation; Linefield network features deferred. |

For Linefield, required existing invariants remain authoritative regardless of Concepts behavior:
unfinished interactions cancel on focus loss; active interactions reject tool switching and document
Undo/Redo; native field/IME handling takes priority. The [P05-D01](../../tasks/P05-D01.md) scenarios
WEB-D02–08 already cover relevant shell focus, lifecycle, layout and gallery regression concerns.
They remain planned. Property settings are not automatically covered by that tool-selector slice:
the lead must attach concrete CT/INV/SU/scenario mappings and accepted outcomes to any later task.
Browser prototype state is not evidence of Rust editing/persistence conformance or native E2E.

## Ranked research recommendations, subject to design and owner review

1. **Investigate: compare tap-open and temporary hold-slide for approved width controls.** The
   problem is fast adjustment without losing canvas context. Compare an anchored tray against
   a conventional native popover/slider. The tray may shorten repeated adjustment; hidden hold
   behavior costs discoverability and gesture testing. Keep visible, keyboard/AX operable entry
   and localized numeric values in the design comparison. Acceptance for a later approved slice:
   adjust width with each supported input, dismiss, and verify correct subsequent stroke plus
   no accidental canvas action. Host controls suit native focus/accessibility; this research
   neither selects rendering ownership nor changes the shared semantic contract. No persistence,
   latency or security improvement is inferred from the visual form.
2. **Investigate: make control scope visible before reusing controls for selected content.**
   Concepts' documented selection restyling is useful context, but Linefield currently lacks that
   feature. Alternative is separate inspector presentation if later approved. Shared controls
   save space but risk changing the wrong target and add undo/state/AX announcement tests.
   Acceptance would distinguish future-pen settings from selected-stroke properties across
   select/deselect/undo. This is a future design question, not permission to add restyling.
3. **Adapt within existing scope: evaluate explicit navigation/tool entry independently of squeeze.**
   Visible controls and reviewed keyboard access serve mouse, touch and non-squeeze styluses.
   Gestures can become optional accelerators after capability review. Alternative is gesture-first
   discovery, with greater accessibility/support cost. Observable acceptance is access to every
   approved action without special hardware while preserving native text input and browser
   context behavior. Designer/platform owners assess bindings; WEB-D02/08 remain planned.
4. **Defer: the rest of Concepts' feature breadth.** Layers, brushes, precision guides, PDF,
   objects, accounts and sync explain Concepts workflows but create substantial semantic,
   persistence, accessibility, security and testing obligations. Keep their evidence as context;
   feature-specific research follows a future owner request. No parity target, new storage/network
   mechanism, benchmark or source-asset reuse is recommended.

Designer accept/adapt/defer/reject response and native feasibility are pending through the lead.
This focused Concepts packet does not complete S00C's separate Concepts/ProDrafts/Freeform trio.
Documentation-only security rationale: public evidence and this report introduce no product data
flow, trust boundary or dependency. No runtime tests are applicable to this prose change; future
implementation needs its own reviewed edge cases, security classification and exact-build evidence.
