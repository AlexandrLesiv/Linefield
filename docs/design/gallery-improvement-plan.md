Current 2026-10-17: decision 214 and [live prototype](./live-web-prototype.md) supersede the old gallery experiments below. apps/web is the active review surface. Native/Figma implementation gates remain.

# Gallery design improvement plan

Date: 2026-10-17. Status: proposal for owner review; no revised mockups or application implementation authorized by this document.

The first round has useful scope and content fixtures, but insufficient native fidelity and variation.
Replace the generic cross-platform template with recognizable platform compositions within three coherent visual families.
The owner requested a full-size first gallery tile for creating drawings and one drawing per scroll step on watchOS and Wear OS.
These requirements apply to the next design proposal; identified Figma approval still precedes application implementation.

[Competitor screen references and UX/UI synthesis](gallery-competitor-screens.md) are now available.
Eight official source images were checked in the review board; new variant/prototype production remains pending.

## Findings from the current screens

I inspected the macOS comparison and all three cross-platform contact sheets, plus full-size Android and Wear OS examples.

| Finding | Evidence in gallery v1 | Required correction |
| --- | --- | --- |
| Native identity is weak | macOS, web and Windows share nearly identical flat headers; mobile cards differ little across Apple and Android | Use platform control anatomy, typography, materials, spacing, navigation and interaction states |
| Primary action is underemphasized | Small top-right New action competes with much larger document cards | First square preview tile is New drawing, with the entire tile actionable |
| Watches reuse a phone list | Several rows fill the screen; partial cards clip at the round boundary | One drawing per vertical snapped page, with deliberate round/rectangular safe areas |
| Variants are uneven | Desktop grid versus rows is meaningful, but watch families are effectively identical; phone A/C differ mostly in color | Require composition and hierarchy differences within every platform |
| States are largely absent | Most screens show only populated resting galleries; macOS extras cover only one family | Component state sheets plus complete gallery flows on each platform |
| Motion is unspecified visually | PNGs cannot establish scrolling, pressed response, opening or interruption | Interactive examples or short annotated sequences, including reduced motion |
| Review overvalued artifact count | 27 screens met inventory checks without proving 27 distinct design proposals | Judge native fidelity and variant differentiation separately from completeness |

The existing independent review established scoped consistency, not strong visual exploration.
Keep v1 as a reference; do not present its structural checks as approval of visual quality.

## Shared identity and native expression

Share artwork framing principles, action meaning, semantic accent roles, title hierarchy and a restrained Linefield visual identity.
Do not share one exact button shape, font, toolbar or navigation layout across every platform.
Respect system theme/accent/accessibility settings. Artwork remains unchanged by chrome colors or materials.

| Platform | Planned native expression | Specific review evidence |
| --- | --- | --- |
| macOS | Realistic AppKit titlebar/toolbar composition, system typography/icons, native menus and focus; Liquid Glass in supported control/navigation regions | Active/inactive windows, pointer/keyboard states, resizing, scrolling under toolbar and reduced transparency |
| iPadOS | UIKit-native navigation and popovers, appropriately sized touch actions, Liquid Glass where supported | Compact/wide and split-window layouts; touch plus pointer/keyboard states |
| iOS | Safe-area-aware navigation, readable titles, reachable actions and native menu/sheet treatment | Small/large phone, larger text, portrait/landscape and keyboard appearance |
| Android | Material 3 color roles, typography, shape, state layers, native menus and touch feedback | Views/Material component mapping, system-bar insets, compact/expanded layout and TalkBack reading order |
| Windows | WinUI typography, command/menu treatment, focus visuals and Mica where appropriate | Keyboard/touch/pointer, inactive window, high contrast and titlebar integration |
| Web | Semantic controls, responsive grid, visible keyboard focus and browser navigation | Narrow/wide layouts, touch/mouse, focus-visible and reduced motion; no fake OS titlebar |
| watchOS | Native vertical pages, restrained system chrome and Crown/touch navigation | One drawing per resting page; title/availability within safe area; offline and reduced-motion states |
| Wear OS | Round-safe Material presentation, vertical paging and rotary/touch navigation | One drawing per resting page, readable titles, page feedback and TalkBack equivalents |
| tvOS | Native remote focus, large previews and distance-readable metadata | Directional focus movement, focused/unfocused cards, activation and reduced-motion alternatives |

Liquid Glass belongs primarily to the control/navigation layer; covering every artwork tile with glass would impair preview fidelity.
Use real platform resources and record their versions; do not substitute gradients for a claimed native material.
Apple describes the control/content separation in [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/).
Android uses [Material color roles](https://m3.material.io/styles/color/the-color-system) and
[typography roles](https://m3.material.io/styles/typography/applying-type); “Material UI” here means the native design language, not the React MUI library.
Windows [Mica](https://learn.microsoft.com/en-us/windows/apps/design/style/mica) has its own purpose and fallback behavior.
These references guide the proposals; platform engineers must verify exact component availability in the selected toolkits.

## New drawing tile

On macOS, Windows, web, Android, iPadOS and iOS, the first gallery slot contains a square New drawing preview tile matching ordinary thumbnail dimensions.
Show a large plus and explicit localized label; the complete tile is one accessible button.
It remains first independently of document activity order, but scrolls with the collection rather than floating over drawings.
Reserve its size before loading and keep it stable across gallery refresh.
The empty gallery also starts with this tile, accompanied by brief guidance.
Keep native menu/keyboard access as secondary entry points; do not add a competing floating action button by default.
No creation tile or editing actions appear on watchOS, Wear OS or tvOS.
Account for creation in progress, failure, duplicate activation and returning focus after cancellation; success requires durable acknowledgement.

## Watch browsing

Both watch platforms present one drawing per vertically snapped page, with artwork dominating the usable area.
Use a concise title and truthful availability status; no large persistent Gallery heading consuming preview space.
A completed ordinary swipe advances to the adjacent drawing. Crown/rotary movement accumulates toward the next page;
one raw wheel event or hardware tick is not itself a page change. Propose tuning through platform feasibility review.
Keep only one settled current drawing; do not skip multiple drawings on an ordinary swipe in the initial proposal.
Allow deliberate repeated navigation, native interruption and accessible next/previous actions.
Show the first, middle and last pages, page change, interruption, title expansion, missing preview and no-download states.
Keep current document identity stable during refresh and on return from viewing.

Apple documents vertical pages in [watchOS interface guidance](https://developer.apple.com/documentation/watchos-apps/creating-an-intuitive-and-effective-ui-in-watchos-10).
Wear OS documents [vertical paging and rotary snapping](https://developer.android.com/training/wearables/compose/pagination).
The Wear OS example uses Compose; it establishes a design option, not approval to replace the selected Android Views stack or choose a Wear toolkit.
WatchOS completed offline downloads remain available without a nearby phone. Wear acquisition remains a separate decision.

## Meaningful visual alternatives

Produce three visual families, each with two composition alternatives on every requested platform.
That is six proposals per platform, or 54 base concepts across nine hosts. States, dark mode and viewport sizes do not count as additional concepts.
Each of the six variants is a complete review package with all nine hosts and the same content coverage as the entire v1 review page.
Every variant/platform has both Light and Night appearances: 108 base PNG frames, excluding state and motion examples.
Night is an appearance subvariant, not an extra design variant. Change chrome only, preserving artwork colors and content.
Internal production may be staged, but do not hand over a partial-platform set as the completed comparison.
No SVG exports are required for this round; retain historical v1 files without presenting them as new deliverables.

| Family | Shared traits | Composition 1 | Composition 2 |
| --- | --- | --- | --- |
| Native Studio | Quiet surfaces, strong artwork hierarchy, restrained accent | Balanced square grid, labels below previews | Larger previews with separated caption bands and more whitespace |
| Graphic Studio | Clearer type hierarchy, deliberate geometry and stronger action emphasis | Compact structured square grid | Roomier cards with distinct metadata/action regions and pronounced alignment |
| Warm Studio | Warm app-owned neutrals, subtle paper framing, softer accent | Matted artwork tiles in an orderly grid | Larger folio-like cards with minimal borders and generous captions |

All editing compositions retain the first square New drawing tile. Avoid the previous row-only layout that conflicts with this request.
Every family still uses native control language: Warm Studio does not replace Apple glass or Android Material with custom beige widgets.
On watches, each family has an artwork-dominant page and a caption-balanced page; both retain one drawing per page.
On tvOS, compare a balanced focusable grid with a larger-preview gallery using native remote traversal.
No extra folders, search, filters, collections, sorting controls, favorites or cloud features are introduced to manufacture variety.

Before export, each pair must differ visibly in composition and information hierarchy beyond color, corners or spacing alone.
Compare the same documents, ordering, viewport and state. Retain original fixture artwork and add long-title, blank and extreme-aspect preview cases.
The owner may combine traits across families; the delivered alternatives are design candidates, not an in-app theme selector.

## Component states and animation specification

“Pressed” is momentary activation feedback. “Focused” is the current keyboard/remote/assistive target.
“Current” is a persistent gallery navigation target where the host needs one; it does not add bulk selection.
“Active window” is a separate macOS/Windows condition. Never use one ambiguous active appearance for all four.
States can combine: focused + hovered, focused + pressed and unavailable + focused must remain understandable.
Touch-only layouts have no hover prerequisite. Stylus hover, when supported, is an enhancement.

The following durations are provisional targets only for app-owned transitions. Use platform motion for native controls;
do not layer a second animation on top of an OS response. All feedback begins immediately, without waiting for save/open work.

| State or transition | Visual proposal | Motion proposal | Reduced motion or failure behavior |
| --- | --- | --- | --- |
| Rest | Clear tile boundary, title and stable preview region | None | Same |
| Hover | Subtle native state layer or border; full-size action hit region | 80–120 ms tint/elevation transition, no layout movement | Instant change; essential actions stay discoverable without hover |
| Keyboard or assistive focus | Clearly visible focus outline distinct from hover/current state | Immediate appearance; no traveling focus-ring animation | Same outline; never depend on animation or color alone |
| Pointer/touch press | Native pressed response, retained contrast | Immediate state layer; optional app-owned compression only if justified, no grid reflow | State/tint response without scaling; release outside cancels |
| Current gallery item | Persistent native selection/current indication where applicable | Immediate; no pulse | Independent focus cue remains visible |
| Active/inactive window | Platform titlebar/control treatment | System-owned transition | Preserve current item and distinguish inactive focus |
| Menu open | Invoker remains identifiable; anchored native menu or platform sheet | Platform transition, no invented material morph | Native reduced-motion response; dismissal restores invoking focus |
| Disabled or busy | Explain unavailability when needed; prevent duplicate action | Immediate state change; progress only while useful | Static accessible progress text if animation is reduced |
| Thumbnail loading | Fixed preview and caption slots | Prefer static placeholder; optional 100–150 ms image crossfade | Immediate replacement; no shimmer requirement or layout shift |
| Open/create document | Keep origin understandable until destination is accepted | Platform transition or app-owned 180–240 ms restrained transition after guards succeed | Immediate switch or brief opacity; failed open retains gallery/item |
| Rename/confirmation dialog | Native field/buttons, explicit destructive action | Platform presentation; no decorative shaking | Native reduced motion; errors retain entered text and focus |
| Deletion | Pending state until confirmed outcome; then remove item | Optional 150–200 ms fade/reflow preserving logical focus and scroll anchor | Immediate removal; failure retains identifiable item and retry |
| Watch page change | One current drawing plus compact native page feedback | Native interactive vertical snap; interruptible, no forced autoplay | Immediate page step or restrained native alternative; preserve title/position |
| TV focus change | Clearly raised/outlined current card with generous spacing | Native focus emphasis; constrain enlargement so neighbors are not obscured | Outline/contrast alternative without zoom/parallax |
| Operation error/retry | Persistent actionable message near the affected item | Immediate message, optional short opacity; no shake or repetitive pulse | Same information; unrelated drawings remain usable |

For web, use focus-visible behavior and semantic controls; for Android, show native Material state/ripple treatment;
for Apple, native control feedback and material transitions; for Windows, native pointer/focus/pressed treatment.
Do not imitate an Apple glass press on Android or a Material ripple on macOS.
Each motion example specifies trigger, affected property, interruption/cancellation, final state and accessibility alternative.
Animation must never delay commands, determine persistence success or become required to understand an error.

## Design production and review sequence

1. UX revises gallery behavior and state inventory; UI prepares native component and material reference boards.
   The lead assigns macOS/iOS/Android/Windows engineers to verify toolkit feasibility and explicitly owns web/TV/watch gaps.
2. Research actual competitor screens before visual production. Hand cited screen evidence and explicitly inferred rationale to both UX and UI.
   Use Concepts, ProDrafts, Adobe apps, Procreate and Freeform, plus selected drawing and non-drawing comparators.
3. Produce six complete variant packages, each covering macOS, Web, Android, iPadOS, iOS, watchOS, Wear OS, tvOS and Windows.
   Include Light and Night for every platform plus the same content/state sections in every package. Internal anchor reviews do not reduce owner handoff coverage.
4. For all nine hosts, deliver component state strips and representative empty/loading/error/menu or viewer equivalents.
   Build selected-candidate adaptive frames in English/Ukrainian, light/dark, larger text and reduced transparency/motion.
5. Provide interactive Figma examples or review-only motion prototypes, alongside PNG comparison boards and annotated fallback sequences.
   PNG imports are references, not editable Auto Layout/component deliverables. No SVG export is required. Missing Figma access does not justify an implementation bypass.
6. Fresh UX/UI and independent review challenge native fidelity, scope, variation, resize behavior, state coverage and motion.
   Submit named Figma versions/frames and unresolved issues for owner approval before application code.

Competitor research supplies focused references and explicitly records what is adapted or rejected.
Current ownership (decision 213): ui_ux_designer owns interaction/state semantics, visual families, native mappings, adaptive components and motion together.
Engineers validate native feasibility; the lead rejects template-like variants before owner handoff.
This plan has a lead self-review, not a fresh specialist assessment of redesigned artifacts, which do not exist yet.

## Acceptance for the next handoff

- Every editing concept uses the first square New drawing tile; viewer concepts contain no mutation controls.
- Native traits are visible without relying solely on a device frame, platform label, accent recolor or tiny status-bar symbols.
- Six complete variant review packages each cover all nine requested hosts, with Light/Night pairs and equal content/state coverage.
- Six distinct proposals exist for each requested host; hierarchy/composition differences are explained side by side.
- Watches show one drawing per settled page with meaningful differences between families; regular gestures and accessible equivalents are demonstrated.
- Each relevant component has rest, hover, focus, press, current, menu, disabled/busy and failure states; inapplicable states are explicitly marked.
- Motion examples include normal/reduced motion, cancellation, repeated input, slow operation and failure; no false success or animated loading reflow.
- Focus, target sizes, typography, native safe areas, long titles and round-screen boundaries are checked at intended display scale.
- Target-size annotations use native points/dp/CSS pixels, not exported raster dimensions. Choose sizes from the selected platform guidance and verify with engineers.
- Comparison page supports full-size viewing, aligned family/variant labels and state/motion inspection; screen count is not a proxy for quality.
- Preserve existing acceptance anchors SU-21 and LIBRARY-CREATE/OPEN/RENAME/DELETE/FAILURE/NAV-001.
- Scope remains gallery design. Other planned hosts stay on the roadmap; no application code, framework migration or extra features are approved.

Owner preference recorded on 2026-10-17: Procreate's uncluttered, artwork-first gallery is the primary visual reference.
All six variants must explore that restrained direction; vary framing, density, captions and platform-native controls,
not the number of controls or extra features. Native Showcase is a useful starting hypothesis, not an approved winner.
Retain the requested first-square New tile, nine-platform Light/Night coverage and single-drawing watch paging.
Contextual actions stay discoverable through native pointer/keyboard/accessibility alternatives; do not copy swipe-only actions.
This preference does not approve Procreate feature parity, specific gestures, a final frame or application implementation.
The owner is refining this plan. Competitor research and the semi-interactive web design approach are explicitly requested.
The existing v1 mockups remain unchanged; this document does not claim new PNGs, interactive prototypes or Figma approval.


## Equal review packages and interactive web examples

Each variant page includes the same: design rationale, nine platform sections, paired Light/Night PNGs,
component state strips, empty/loading/error/action states, Ukrainian example, motion/reduced-motion examples,
platform mappings, source inspirations and limitations. Use the same six document fixtures, titles, order,
metadata and matching viewport/scroll positions. Long-title/blank/extreme-aspect fixtures are shared too.
Watch screenshots show one current drawing; include the same complete document sequence through paging examples.
Do not force white system chrome on watches to fabricate an OS light mode. Show distinct app-owned Light/Night
treatments within supported native presentation; document any platform constraint.

Every variant's Web section includes a semi-interactive, browser-based design prototype, not only a screenshot.
Review-only controls outside the simulated app choose appearance, demo state, text size and reduced motion;
these are not proposed in-app settings. Reset restores identical disposable fixtures.

Required prototype behaviors:
- Actual pointer hover, focus-visible and pressed states; keyboard traversal and activation.
- Scrollable/adaptive gallery with the first square New drawing tile.
- New/open navigates to a clearly labelled non-drawing destination; Back restores gallery focus and position.
- Accessible item menu with Open/Rename/Delete; rename retains stable identity and supports cancel.
- Delete confirmation and cancellation; mutations affect disposable in-memory samples only.
- Demonstrate loading, empty, preview failure, document failure, busy and retry states through external review controls.
- Same animated transitions as the state sheet, including interruption and reduced motion.
- Escape/dismissal restores focus; menus/dialogs contain appropriate focus; touch does not depend on hover.
- No persistence, real filesystem access, cloud connections, production Rust commands or drawing canvas are implied.

Document which effects are simulated and which interactions actually work. Use semantic HTML and retain
browser shortcuts; no fake native-app fidelity, native E2E or storage guarantees. Test the review prototype
with actual browser interaction before claiming its controls work. Native PNGs remain visual proposals.

Research evidence must identify product, platform, screen/figure or video timestamp, source URL and date.
Separate observable presentation, documented behavior, inferred design motivation and suggested adaptation.
A static screenshot cannot prove hover, animation timing, accessibility or hidden interaction behavior.
Keep third-party imagery attributed and separate from original Linefield assets; do not copy competitor art or icons into designs.
