# Concepts: a drawing-workflow study for Linefield

Concepts 6.36.1 (5415) · iPhone 15 Pro Max · 18 October 2026 · Private local research

## Recommendation

Adapt Concepts' hierarchy: enter a drawing quickly, keep the active tool and its properties legible, and reveal precise controls beside the canvas. Preserve Linefield's existing gallery and transitions. The strongest opportunity is compact, predictable access to the approved Pen and Select tools, with width and color clearly scoped to subsequent pen strokes. A circular arrangement is one presentation to review; it does not require copying Concepts' tool inventory or moving all controls into Rust.

The device study exposed two consequential details. First, tapping the canvas while a property tray was open created a mark and left the tray open. Second, changing width while a stroke was selected restyled existing artwork, independently of the pen's future settings. Both can support experienced drawing workflows, but both require deliberate decisions in Linefield. A visually similar control must not silently inherit those semantics.

The next proposal should therefore separate a host-rendered web UI prototype from actual Rust/Wasm editing. The prototype can demonstrate layout, selection feedback, accessible controls, dismissal and motion over the existing static surface. Real ink, selection transforms, autosave and recovery need their concrete command, rendering and persistence contracts. Extra tools, opacity, smoothing and selected-stroke restyling remain separate scope decisions, even when they appear in exploratory images.

This report combines the [official-source evidence](sources.html), [device observation ledger](observations.html) and [designer adaptation proposal](adaptation.html). Those documents retain finding IDs, limitations and proposed acceptance cases. This is research and design input, not implementation approval, a benchmark or user validation.

## Method and confidence

The lead operated a physical iPhone 15 Pro Max running iOS 27.0 through macOS iPhone Mirroring. Help → About identified Concepts **6.36.1 (5415)**. Account tier remains unknown. Changes were confined to a new drawing named “Linefield research 18 Oct”; existing drawings were preserved. No external export, purchase or account change was performed. The initial session ended at the gallery with the research drawing retained. The owner then enabled Developer Mode and reopened that drawing for a separate USB recording session, controlled through Device Hub and captured in QuickTime. The agent did not change system security settings.

The initial screenshots are 774 × 1700 (54 captures) or 774 × 1702 (two captures) mirrored-window pixels, not native device points. Mouse-driven mirroring established the observed UI sequences, but cannot establish direct finger behavior, multitouch, pressure, palm rejection, Pencil squeeze or physical input latency. Twenty CS-OBS findings record the initial session; the later USB motion study is separate. The official packet contains 38 CS-DOC findings from current manuals, release notes, support pages and Apple guidance, with older tutorials labeled separately.

| Evidence class | What it establishes | What it cannot establish |
| --- | --- | --- |
| Documented | An official description, with source/date/platform/tier context | Correct operation on every current build or device |
| Observed | A particular visible result after an action on this identified build | Universal behavior, internal architecture or durability |
| Proposed | A designer's adaptation for Linefield | Owner approval or an existing Concepts behavior |
| Unknown | A specific untested or unresolved question | Proof that a feature is absent or defective |

All figures below belong to the new research drawing or inspected app controls. The gallery capture containing pre-existing private thumbnails is deliberately omitted from this main report. Screenshots remain local and are reference evidence, not reusable Linefield assets.

## Gallery and document lifecycle

Concepts presents a drawing library rather than requiring a file destination before sketching. In this session, return from an existing drawing briefly showed a dimmed Saving overlay. The gallery exposed an iCloud Drive breadcrumb, two-column thumbnails, Group/Sort and a New Drawing capsule. Creating and renaming the research drawing was straightforward; its tools and property values inherited the previous setup. These observations show continuity and feedback, not when bytes became durable or how a failed save would behave. See CS-OBS-001.

The [Gallery manual](https://concepts.app/en/manual/gallery) describes folders, contextual rename/duplicate/delete, Recently Deleted and platform-specific file locations. On iOS, its gallery mirrors a Files folder and can edit external native documents in place. That differs materially from Linefield's selected import-as-copy policy. The same manual warns that deleting the iOS app removes its local Concepts folder. Neither destructive removal nor cloud recovery was tested here.

For Linefield, retain the established gallery, unnamed-drawing model and recoverable removal with in-place Undo. Study clearer loading/save feedback without introducing folders, a Trash screen or external write-through. The pending/failed persistence state must come from shared semantics; an animation or disappearing overlay cannot authorize navigation or claim successful storage.

## Tool wheel and brush access

The persistent wheel combines several jobs: choosing a tool, showing its identity, exposing properties and opening color. Its outer slots display different tools or presets; the central hub keeps width, opacity, smoothing and color nearby. The [Workspace manual](https://concepts.app/en/manual/workspace) documents up to eight configurable slots, repeat activation to enter brush settings, and alternative wheel/bar layouts. These are permanent workspace controls, distinct from the squeeze invocation discussed later.

Observed active-brush activation opened a full-height Brushes/Colors sheet with a sample area, in-drawing brush, basic tools and market content. Editing Hard Pencil exposed four presets for each property and Reset. No reset or purchase was performed. The broader [Brushes and Tools manual](https://concepts.app/en/manual/brushes-and-tools) describes textured brushes, masks, Slice, Nudge and text, with different dynamics and editing roles. Its warning that textured brushes can pixelate is a reminder that editable vector structure does not guarantee resolution-independent appearance for every brush.

<div class="gallery">
<figure><a href="assets/15-brush-library.jpg"><img src="assets/15-brush-library.jpg" alt="Concepts Brushes sheet with a preview and brush inventory" loading="lazy"></a><figcaption>Active brush opens a larger tool library and preview. CS-OBS-008.</figcaption></figure>
<figure><a href="assets/16-brush-presets.jpg"><img src="assets/16-brush-presets.jpg" alt="Hard Pencil settings showing property presets" loading="lazy"></a><figcaption>Hard Pencil preset settings; Reset was not exercised.</figcaption></figure>
</div>

Linefield needs no library merely to justify repeated activation of Pen. With one approved pen, direct width/color access can be simpler. Select does not need a matching settings sheet for visual symmetry. The owner's five-sector studies are useful visual exploration, but additional tools must receive explicit scope decisions before functioning controls or disabled placeholders appear in a product screen.

## Width, opacity and smoothing

### One tray, three contextual entries

The most useful visual detail is the relationship between hub and tray. A gray translucent rectangle extends right across outer tools; its height aligns with the hub diameter. The circular outline remains perceptible, and the active property wedge becomes white. Four preset values sit above a thin, constant-width slider with a white outlined thumb. Width preset ticks were unevenly spaced. That establishes appearance, not a nonlinear transfer function or a particular transparency percentage.

Switching properties reused the same tray area while moving the active wedge. The current value, selected preset and thumb together give redundant feedback. That redundancy also makes inconsistencies visible: one mirrored smoothing drag moved the thumb without changing the settled hub/preset value, while choosing a preset worked. The result needs direct-touch repetition before diagnosing a native bug or deriving an algorithm.

<div class="gallery">
<figure class="detail"><a href="assets/04-width-open.jpg"><img src="assets/04-width-open.jpg" alt="Width tray extending right from the circular hub over outer tool sectors" loading="lazy"></a><figcaption>Detail crop: tray aligned to hub height, translucent overlap, active width wedge. Open image for full capture. CS-OBS-002.</figcaption></figure>
<figure><a href="assets/06-width-exact-entry.jpg"><img src="assets/06-width-exact-entry.jpg" alt="Width value being edited numerically" loading="lazy"></a><figcaption>Exact entry reached during the mirrored session. CS-OBS-003.</figcaption></figure>
<figure class="detail"><a href="assets/10-smoothing.jpg"><img src="assets/10-smoothing.jpg" alt="Smoothing property tray with percentage presets" loading="lazy"></a><figcaption>Same tray, different active property and percentage presets. CS-OBS-006.</figcaption></figure>
</div>

### Adjustment and feedback

Width changed from 133 to the 4.8 preset, then to 8 through numeric entry. The selected chip, hub value and temporary textured canvas arc changed. Numeric editing succeeded after double-clicking the selected value, selecting its text, typing 8 and pressing Return. This does not independently verify the manual's held-entry gesture. Decimal-comma presentation was visible; invalid input, alternative decimal formats, range rejection and IME behavior were not tested.

Opacity presets showed 0/50/70/100%. Choosing 50 lightened both the center swatch and temporary sample; width stayed 8. Smoothing showed 0/25/50/75%, and choosing 75 updated the hub. The [brush documentation](https://concepts.app/en/manual/brushes-and-tools) defines opacity endpoints and describes smoothing from raw input to a straight endpoint connection. It does not reveal Concepts' filtering algorithm. Adjustable smoothing is outside Linefield's current no-filtering scope.

<div class="gallery">
<figure class="detail"><a href="assets/05-width-preset-preview.jpg"><img src="assets/05-width-preset-preview.jpg" alt="Width preset selected with a temporary textured brush preview on the canvas" loading="lazy"></a><figcaption>The large sample is temporary feedback, not an established document stroke.</figcaption></figure>
<figure class="detail"><a href="assets/09-opacity-50.jpg"><img src="assets/09-opacity-50.jpg" alt="Opacity set to fifty percent with a lighter swatch and sample" loading="lazy"></a><figcaption>50% here is brush opacity. It does not measure tray translucency.</figcaption></figure>
</div>

The [Workspace manual](https://concepts.app/en/manual/workspace) describes two paths: tap to open persistent adjustment, or hold-slide for temporary adjustment that closes on finger lift. The second was not verified through direct touch. A future Linefield design must distinguish changing a preset from selecting one, and explain when values become accepted. Visible numeric access should supplement dragging rather than depend solely on a hidden double-click or hold gesture.

### Outside input is a product decision

Tapping the canvas with width open created a small mark and left the tray visible. Tapping width again closed it and removed the large sample, while the small mark remained. This is bounded evidence of drawing-through behavior in the mirrored session, not evidence of safe outside dismissal. CS-OBS-004 is therefore more important to implementation than a close visual match.

The [designer proposes](adaptation.html) that Linefield's transient tray instead close on the first outside press and consume the complete contact sequence. Drawing would require a fresh press. This reduces accidental marks but adds a gesture when users want to adjust and immediately continue. The alternative is deliberate nonmodal drawing-through with explicit closure. Neither policy is approved by this research. The permanent hub can remain visible regardless; its lifetime need not match the property tray.

## Color: fan, channels and precise entry

The center opened a large Copic fan while the tool wheel stayed at its anchor. HSL displayed a hue arc with shorter adjustment arcs; RGB displayed three channel arcs. The controls use shared circular organization but serve different tasks: selecting a named palette color versus manipulating continuous components. The [Colors manual](https://concepts.app/en/manual/colors) documents these alternatives, palette mixing and a picker whose background/alpha option changes sampling behavior.

<div class="gallery">
<figure><a href="assets/12-copic-fan.jpg"><img src="assets/12-copic-fan.jpg" alt="Copic colors arranged in a large fan around the tool wheel" loading="lazy"></a><figcaption>Copic fan with named swatches. CS-OBS-007.</figcaption></figure>
<figure><a href="assets/13-hsl-arcs.jpg"><img src="assets/13-hsl-arcs.jpg" alt="HSL color adjustment using curved controls" loading="lazy"></a><figcaption>HSL mode changes the control structure.</figcaption></figure>
<figure><a href="assets/14-rgb-arcs.jpg"><img src="assets/14-rgb-arcs.jpg" alt="RGB color mode with three channel arcs" loading="lazy"></a><figcaption>RGB mode; this still does not specify its transition timing.</figcaption></figure>
</div>

The separate Colors sheet exposed COPIC, HEX, RGB and H/S/B numeric rows plus named palettes. Entering F65D57 changed the hub, active tool and suggested palette to coral. The fan's HSL label and sheet's HSB label are recorded as shown rather than normalized into one assumed color model. No color-space conversion, round-trip precision or display-management test was performed.

Three quantities must remain distinct: saved drawing color, brush opacity and UI backing translucency. The owner's proposed 50% tray alpha is a design target, not a measured Concepts parameter. Linefield should retain its proposed native macOS color control and separately review the web presentation. Copic assets, palettes and visual treatment are not adopted. A shared color value can coexist with different native controls without requiring a shared custom color widget.

## Selection and editable strokes

A synthetic diagonal Hard Pencil stroke was selected using the arrow tool and a stroke tap. Bounds, corner handles, extended alignment lines and a contextual bar appeared. Moving the selection moved the stroke and its accompanying controls. The bottom area exposed rotation/scale/filter choices; lasso and other modes were visible but not exercised. The [Selection manual](https://concepts.app/en/manual/selection) describes a much wider system, including inclusion filters, grouping and different transformation modes. Visibility of those controls is not evidence that this study tested them.

<div class="gallery">
<figure><a href="assets/18-selection.jpg"><img src="assets/18-selection.jpg" alt="Selected coral stroke with bounding handles and a contextual action bar" loading="lazy"></a><figcaption>Single observed selection with context controls. CS-OBS-010.</figcaption></figure>
<figure><a href="assets/20-selection-restyled.jpg"><img src="assets/20-selection-restyled.jpg" alt="Existing selected stroke thickened after changing width" loading="lazy"></a><figcaption>Width edits selected content in this state. CS-OBS-011.</figcaption></figure>
</div>

Opening width with the stroke selected and choosing 133 thickened that existing stroke without the generic preview arc. One Undo after closing width restored thinness while keeping the earlier moved position. Returning later to Hard Pencil restored future-tool width 8 and smoothing 75. This supports separation between selected-content editing and future-tool preferences in this sequence, consistent with the [older official editing tutorial](https://concepts.app/en/tutorials/select-edit-notes-drawings-designs/). It does not prove all undo boundaries or restart persistence.

For Linefield, direct one-stroke move, uniform scale and delete remain useful. Retargeting width/color to restyle selected content would add semantics beyond those tools. Keep the target explicit and accessible. If restyling is later selected, specify transaction boundaries, mixed values, cancellation and subsequent pen settings before reusing the same hub entries.

## Navigation, layers and precision

Concepts' [canvas documentation](https://concepts.app/en/manual/infinite-canvas) describes two-finger pan/zoom/rotation, numeric controls and navigation tools. The official keyboard alternatives distinguish held temporary navigation from toggled modes; context can make the same keys transform a selection instead. Direct multitouch and these keyboard sequences were not exercised here. They are workflow references, not ready-made Linefield bindings.

Layers opened as a side panel with Automatic, New Layer, thumbnail and visibility control. A layer popup exposed further actions and opacity. Precision and layer controls could coexist and overlap. The [Layers manual](https://concepts.app/en/manual/layers) describes automatic organization by tool and manual organization, with a five-layer free-tier limit. The study inspected presentation, not layer mutation, ordering, merges or recovery.

Precision exposed Grid, Snap, Measure, Guide and Recognition. Snap options distinguished drawing from editing and showed several detailed choices; Escape dismissed the sheet. The [Precision manual](https://concepts.app/en/manual/precision-tools) explains units, scale, measurements and guides. Actual geometric accuracy was not tested. Current sources also disagree about iOS navigation snapping: newer release notes add toggles while an older manual statement excludes iOS. The inspected panel did not resolve that discrepancy.

<div class="gallery">
<figure><a href="assets/25-layers-automatic.jpg"><img src="assets/25-layers-automatic.jpg" alt="Layers panel in Automatic mode" loading="lazy"></a><figcaption>Layer organization is visible; actions and limits remain untested.</figcaption></figure>
<figure><a href="assets/28-snap-options.jpg"><img src="assets/28-snap-options.jpg" alt="Snap options sheet separating drawing and editing settings" loading="lazy"></a><figcaption>Precision introduces several independent modes. CS-OBS-016.</figcaption></figure>
</div>

Linefield can adapt discoverable pan/zoom access without adding rotation, layers, grids or physical measurement. Its existing interaction guards remain authoritative: unfinished editing blocks conflicting navigation/tool changes, and mapping changes require cancellation ordering. Unrestricted panel overlap should not be copied without reviewing occlusion, focus and input ownership.

## Import, export, PDF and Library

The drawing menu exposed import from Photos, Files, Clipboard, camera, Image Playground and recent imports. No external file was imported. Some menu entries initially appeared unavailable and later became active for an unresolved reason; the report does not assign a cause. The [Import manual](https://concepts.app/en/manual/import) documents positioning imported content and distinguishes the iOS native format from Windows/Android. Native interoperability therefore requires deliberate format checks rather than assuming a shared filename extension.

Export received a deeper inspection. Visible choices included JPG/PNG/SVG/DXF, output regions, background/grid switches, dimensions and scale. Choosing PNG displayed 200% and 2580 × 5592; these could be retained preferences, not defaults. Generating the output produced a preview with filename, dimensions, Back to Export, Share and Success wording before a destination was chosen. The session closed without external publication.

<div class="gallery">
<figure><a href="assets/31-export-png.jpg"><img src="assets/31-export-png.jpg" alt="PNG export controls with dimensions, region and background options" loading="lazy"></a><figcaption>Format, region and scale are separate export choices. CS-OBS-018.</figcaption></figure>
<figure><a href="assets/32-export-preview.jpg"><img src="assets/32-export-preview.jpg" alt="Generated export preview before choosing a share or save destination" loading="lazy"></a><figcaption>Prepared preview, not proof of a saved external file.</figcaption></figure>
</div>

The [Export manual](https://concepts.app/en/manual/export) describes output formats and fidelity limits: vector export does not preserve every textured or variable-width effect. The [PDF manual](https://concepts.app/en/manual/pdf) describes scaled import, page management and annotation/export under paid entitlement. PDF was researched from documentation, not imported or validated on the device.

Library showed Favorites, personal/shared packs, search, market entries, a five-free-objects monthly indicator and a purchased Basic Shapes pack. These are entitlement clues, not identification of the account tier. No object was inserted, shared or bought. The [Library manual](https://concepts.app/en/manual/library) describes reusable assets and warns that some replacement/deletion actions are not undoable. Pexels availability also conflicts between the feature matrix and newer release notes; this session did not resolve it.

For Linefield, native-copy/PNG exchange remains the selected narrower direction. Distinguish “preview ready” from confirmed publication, cancellation and failed writes. PDF, SVG, imported images, object libraries, sharing and cloud flows remain deferred. Their controls cannot be added as decoration without taking on the corresponding data, security and recovery obligations.

## Settings, entitlements and platform fit

Workspace settings exposed paper, background, grids, artboard dimensions and measurements. Interaction settings exposed keyboard controls, external displays, finger action and two-finger behavior. Finger action showed Pan Canvas even though mirrored pointer input drew strokes. This is direct evidence that input routes must not be treated as interchangeable. Contextual help opened relevant online documentation. No global settings were changed; scrolling limitations left some below-fold content uninspected.

<div class="gallery">
<figure><a href="assets/22-workspace-settings.jpg"><img src="assets/22-workspace-settings.jpg" alt="Workspace settings for paper, background, grid and artboard" loading="lazy"></a><figcaption>Document/workspace choices, inspected without changing preferences.</figcaption></figure>
<figure><a href="assets/23-input-settings.jpg"><img src="assets/23-input-settings.jpg" alt="Interaction settings including keyboard and finger action" loading="lazy"></a><figcaption>Finger action is not a reliable predictor of mirrored mouse behavior.</figcaption></figure>
</div>

The [public entitlement pages](https://concepts.app/en/features-pro) distinguish free drawing from paid editing and richer exports. [Pricing](https://concepts.app/en/pricing-explained/) distinguishes a single-platform Essentials purchase from a subscription spanning supported platforms. Region, store offers, offline entitlement checks and purchase restoration were not tested. A visible feature or purchased pack does not prove the full subscription state.

The [official Mac FAQ](https://tophatch.helpshift.com/hc/en/3-concepts/faq/214-do-you-have-a-mac-version-of-concepts-1759253708/) describes native macOS as future work. This study therefore supplies mobile reference evidence, not a native Mac interaction model. Linefield's MacBook-first product direction still requires AppKit focus, menus, numeric entry, color controls and accessibility review, while web remains the first implementation platform.

## Pencil squeeze and input alternatives

Three things must stay distinct: the persistent Concepts wheel observed on iPhone, Concepts' documented squeeze invocation, and Apple's PencilKit contextual picker. Concepts' [iOS release history](https://concepts.app/en/ios/roadmap) records configurable squeeze in 6.14 and squeeze to show Tool Wheel in 6.15. It does not establish the exact summoned geometry, hover selection, release-to-commit or dismissal behavior. No Pencil was present in this study.

Apple's current [compatibility list](https://support.apple.com/en-us/108937) requires Pencil Pro and iPadOS 17.5 or later, with Pro 11/13-inch M4/M5, Air 11/13-inch M2/M3/M4, or mini A17 Pro. The older [Concepts squeeze article](https://concepts.app/en/apple-pencil-pro-squeeze-roll/) has an incomplete launch-era M4 Pro-only list. It documents configurable squeeze and similar double-tap options on Pencil Pro/2nd generation. An iPhone or ordinary MacBook does not become a Pencil squeeze device through mirroring.

Apple's [developer guidance](https://developer.apple.com/videos/play/wwdc2024/10214/) recommends discrete squeeze actions, respecting system preference, with optional hover position and a fallback. Its PencilKit arc is an Apple demonstration, not proof of Concepts' implementation. Sidecar forwarding and browser squeeze support are not established here.

| Input | Useful reference | Proposed Linefield baseline |
| --- | --- | --- |
| Mouse/trackpad | Concepts supports configurable mouse actions | Visible click target; preserve browser context behavior |
| Keyboard | Custom shortcuts and navigation alternatives are documented | Native/DOM focus and explicit activation; reviewed bindings |
| Touch | Permanent tool/property entries are tappable | Visible tap entry; no compulsory hold gesture |
| Non-squeeze stylus | Supported buttons or Pencil double-tap may be configurable | Visible controls first; optional capability-specific mappings |
| Pencil Pro | Squeeze-to-wheel is documented, exact behavior unobserved | Future native adapter after hardware/interaction review |

## Circle animation: measured visible timing

The initial sparse Mirroring screenshots could not support timing measurements. Two later USB recordings now provide frame presentation timestamps for repeated operations on the identified phone/build. The table below reports **first changed frame to threshold-settled state**, rounded to milliseconds. The endpoint uses image-comparison thresholds, not a validated perceptual judgment. It does not measure the interval from physical touch, or reveal Concepts' internal animation constants. The [motion appendix](motion.html) supplies per-trial timestamps, sampling brackets, measurement regions, source hashes and reproduction details.

| Operation | Observed median | Observed range | What the endpoint includes |
| --- | ---: | ---: | --- |
| Open width | ≈167 ms | 151–167 ms | Hub feedback settling; tray body already appears in one recorded frame |
| Open opacity | ≈152 ms | 150–167 ms | Hub feedback settling |
| Open smoothing | ≈167 ms | 167–167 ms | Hub feedback settling |
| Close width | ≈100 ms | 83–100 ms | Return of hub presentation |
| Close opacity or smoothing | ≈83 ms | 83–83 ms per property | Return of hub presentation |
| Retarget opacity or smoothing | ≈167 ms | 167–167 ms per property | Selected property feedback within the same tray |
| Open RGB color picker | ≈725 ms | 700–734 ms | Staged arcs and background-control fade reach the endpoint |
| Close RGB color picker | ≈350 ms | 350–350 ms | Picker removal and background restoration |
| Switch to Select | ≈108 ms | 108–117 ms | Visible tool/hub change |
| Switch back to Hard Pencil | ≈267 ms | 250–267 ms | Visible tool/hub change |

Each operation has three trials, except smoothing closing, which has six. Repeated values are rounded observations, not proof of deterministic duration. The recording has variable frame cadence and gaps; consult the per-trial sampling brackets rather than treating a nominal 60 fps as guaranteed 16.7 ms precision. Changing width/opacity presets appeared within zero or one additional recorded frame (0–20 ms observed), but adjacent sample gaps give upper brackets of roughly 37–67 ms. Zero observed interval means the first changed frame already met the threshold, not instantaneous processing. Preset results use a less strict endpoint threshold; small residual pixel changes under the stricter threshold are not proven to be codec noise.

<div class="gallery">
<figure><video controls muted playsinline preload="metadata" aria-label="Repeated width tray opening and closing, silent USB recording"><source src="assets/motion-width-trials.mp4" type="video/mp4"></video><figcaption>Width open/close trials. Separate the tray body's appearance from the hub feedback. Silent excerpt.</figcaption></figure>
<figure><video controls muted playsinline preload="metadata" aria-label="Repeated RGB color picker opening and closing, silent USB recording"><source src="assets/motion-color-trials.mp4" type="video/mp4"></video><figcaption>RGB reveal and dismissal have a longer, staged appearance. Silent excerpt.</figcaption></figure>
</div>

The useful animation lesson is separation by responsibility. The property tray needs immediate access, while selection feedback can settle independently. The color picker reveals multiple controls in stages and dims surrounding controls; its full visual duration should not become a generic timing token for every overlay. The capture supports visible sequencing, not a specific spring, easing function, rendering framework or GPU implementation.

HSL↔RGB mode changes are documented qualitatively because the recorded trials do not all provide an uninterrupted stable endpoint. The later RGB readout also differed from the starting readout after mode switching: R246/G93/B87 became R246/G91/B85. This is a recorded discrepancy requiring a focused reproduction; it does not establish the conversion algorithm or cause. Linefield should test that merely changing color-editor presentation preserves the accepted color.

The designer's candidate timings in [adaptation](adaptation.html) remain proposed Linefield values, separate from these Concepts measurements. Reduced motion, physical-input latency, squeeze invocation and interrupted property gestures remain unverified. Animation must never determine semantic completion, postpone ink or allow stale callbacks to reopen controls.

## Failures, accessibility and unresolved behavior

The most important uncertainties concern event ownership and accepted state, not decorative polish. Direct-touch hold-slide, numeric rejection, keyboard/IME handling, VoiceOver adjustment, focus return, background cancellation, rotation and reduced motion/transparency remain untested. The observed smoothing mismatch and changing menu availability need controlled repetition. Failure to inspect a behavior is not proof it is absent.

Save and export feedback require similar restraint. The Saving overlay did not verify recovery or disk failure. Export preview success did not verify external bytes. The [Windows sync FAQ](https://tophatch.helpshift.com/hc/en/3-concepts/faq/253-how-do-i-sync-drawings-across-devices-on-windows/) warns conflicting simultaneous/offline edits can overwrite changes, but that Windows-specific warning is not an observed iPhone failure. No destructive, storage-exhaustion or cloud-conflict experiment was performed.

Linefield's later acceptance must include meaningful names, values and selected states; visible keyboard focus; numeric alternatives; text expansion and regional parsing; opaque accessibility backing; and a linear alternative to angular pointing. Preserve en/uk catalogs and native text/IME priority. Theme changes must not change saved drawing colors. These are design requirements to review and test, not claims of Concepts conformance or completed Linefield checks.

## Ownership and the smallest useful slice

The [designer recommendation](adaptation.html) keeps shared artwork and native/DOM chrome separate. Rust owns authoritative tool availability, accepted settings, interaction admission, geometry/editing and history. Shared Skia/CanvasKit owns artwork and selection rendering. Host controls own wheel/tray layout, control hit testing, labels, accessibility, focus and transient open state. Input adapters acquire device events and translate approved intents; they do not duplicate editing policy.

An all-Skia wheel would still need host accessibility, focus and text handling. A hybrid decorative layer can be considered if a concrete need emerges, but custom arcs alone do not justify duplicate geometry and accessibility machinery. A host-rendered selector can remain usable when the canvas surface fails and fits the selected macOS control direction.

| Next step | Included | Separate gate |
| --- | --- | --- |
| Reviewable UI prototype | Approved tool inventory, proposed width/color presentation, dismissal, focus, adaptive layout, preserved gallery | Exact scope and pre-design review prototype exception if requested |
| Real Pen integration | Rust-accepted settings, actual input, shared rendering and cancellation | Concrete Wasm/typed contracts and implementation authorization |
| Editing and persistence | One-stroke correction, history, autosave/recovery | Their reviewed semantic and storage contracts |
| Broader Concepts features | Research context only | New product scope and identified designs |

The owner decisions are concrete: production inventory versus illustrative sectors; whether opacity/smoothing/restyling enter scope; transient versus persistent behavior; outside-press policy; numeric and adaptive access; and an identified visual/motion version. Preserve the existing gallery throughout. After approval, implement one bounded slice and verify actual browser/native outcomes with a fresh review. This study supplies evidence for those decisions; it does not authorize them.
