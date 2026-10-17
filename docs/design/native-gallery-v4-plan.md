Current 2026-10-17: decision 214 and [live prototype](./live-web-prototype.md) supersede the old gallery experiments below. apps/web is the active review surface. Native/Figma implementation gates remain.

# Native Gallery v4 — approved redesign direction

Date: 2026-10-17. Owner authorized design prototype revisions and Android Compose Material 3
planning. Decisions 211–212. This is not production UI, storage implementation or identified
Figma approval. V1–V3 remain historical artifacts; Native Showcase is retired from the active review.

## Composition and adaptability

Keep artwork prominent and native controls quiet. Three large columns at typical desktop widths,
two at intermediate widths, one in narrow windows. Starting prototype thresholds use content
width after padding: 960 CSS px and 640 CSS px. These are not native point/dp guarantees.
Phone-sized touch layouts use spacious rows, persistent titles and reachable bottom creation.
Remove edited dates and the oversized Gallery heading from default presentation; keep semantic
screen labels and stored timestamps for ordering. Names and action areas stay inside cards.
No decorative card shadows or inset hover border; outside hover outline and separate focus cue.
Loading replaces reserved content without shifting cards. Actual resizing/text changes may reflow.

Platform, available window size, orientation and input modality are independent axes. An iPad
may be in a narrow floating window, an Android tablet may have keyboard/pointer input, and a
desktop may be narrower than a phone landscape viewport. Do not infer capabilities from width.
Preserve current document, pending removals, focus identity and scroll anchor through adaptation.
Safe areas, keyboard insets, text size, reduced motion/transparency and contrast are host-owned.
No forced portrait, fixed three-column tablet or phone-only Android assumption.

Review sizes include 1280×800, 1024×768, 768×1024, 600×900, 400×900, 390×844 and 844×390;
also test widths between presets, constrained heights and live resize while open/menu/loading.

## Foundations and platform components

Four neutral paired palettes: System Neutral, Paper & Ink, Warm Neutral, Cool Neutral.
Increased contrast is an independent review preference, not a decorative theme. Preserve
artwork colors; no inversion/dimming of saved art to make the UI dark. Dark chrome uses neutral
surfaces without glossy full-width bands, bright card outlines or contrasting attached footers.

| Host | Intended implementation mapping |
| --- | --- |
| macOS | AppKit collection view, toolbar and NSMenu; system-supported glass for controls/navigation; native text entry |
| iPhone/iPad | UIKit collection/list layouts, bottom toolbar creation in compact layouts, UIMenu/context menus, native rename alert with text field, zoom transition |
| Android | Kotlin + Jetpack Compose Material 3: adaptive layouts, FAB, menus, dialogs and system-aware motion; stable component versions pinned at port implementation |
| ChromeOS/Googlebook | Adaptive Android desktop route or separately tested web route; Material controls with keyboard/right-click/hover and system window decorations |
| Windows | WinUI 3, MenuFlyout, native dialogs, Fluent surfaces and connected animation |
| Web | Semantic HTML buttons/menu/dialog and accessible browser interaction; no claim of actual native OS widgets |
| WatchOS/Wear OS | View-only, one drawing per settled page; native watch toolkit/rotary/lifecycle evidence remains separate |
| tvOS | View-only remote focus/navigation, no New/Rename/Delete |

Phone New stays near the bottom with content clearance; empty gallery has one centered large
New tile. No one-item tab bar. Mobile swipe reveals actions without full-swipe automatic deletion;
long-press/menu and accessibility alternatives remain. Native implementation must resolve gesture
arbitration with scrolling and system back; browser mouse-drag tests are not native swipe evidence.

Menus remain anchored to the invoking card, flip at edges, preserve source indication, do not
resize scroll content and restore focus. Renaming preserves entered text on error, supports IME,
and uses the host's control anatomy. No generic Material dialog in the Apple design.

## Motion and failure behavior

Connected thumbnail-to-editor expansion is the selected study: preserve artwork aspect ratio,
fade surrounding items, resolve source by document identity, reverse on return when available.
Do not add background blur by default. Reduced motion uses a short fade/immediate presentation.
Opening failure/cancel stays in gallery; animation cannot decide navigation acceptance or mutate
documents. Interruptions and source removal/resizing must settle safely with focus restoration.
The destination remains visibly labelled a simulation, not a working drawing editor.

Distinguish preview failure from whole-library failure. Healthy documents remain accessible when
only a thumbnail fails. Storage-access/busy/full/corruption states need specific explanation and
an appropriate recovery action. Do not show New when safe persistent creation cannot be assured.
Offline network state alone does not make a local offline-first library unavailable.

## Recoverable gallery removal

User-selected UI: Delete replaces the same card/row with Deleted NAME and Undo, without ordinary
confirmation. Each removed item retains its own Undo until successful navigation away; no timer.
Scrolling, palettes, resize and backgrounding do not end it; failed/cancelled Open does not end it.
Restore the item and its position. Failure keeps work recoverable and gives Retry; no false success.

Prototype staging is memory-only and resettable. Production must review durable pending removals,
crash/quit handling, coordinator authority, export races, restore/finalize errors and bounded
retention before schema/runtime changes. Proposed safety default: crash/quit preserves pending
removals for recovery; finalized navigation may schedule cleanup only after reviewed authority.
This is not a new general Trash feature or document edit-history policy. Existing busy-owner
guards and export cancellation consent remain. Historical DBML approval bytes stay unchanged.

## Acceptance and evidence

| ID | Required prototype evidence |
| --- | --- |
| GAL4-ADAPT | Three/two/one columns and compact rows; actual container widths, portrait/landscape, narrow tablet window, no horizontal clipping |
| GAL4-THEME | Four palettes × Light/Night, increased contrast, unchanged artwork and no lost state |
| GAL4-NATIVE | Apple/Material/Fluent/browser component anatomy, phone bottom New, anchored menus; native rendering explicitly unverified |
| GAL4-MOTION | Connected open/return, reduced motion, repeated/interrupted actions, failed/cancelled open retains route and pending Undo |
| GAL4-UNDO | Multiple tombstones, restore exact item/position, no countdown/reflow, finalization only on accepted leave, stage/restore failure |
| GAL4-FOCUS | Hover/focus captions, Escape/menu/dialog focus return, rename failure preserves text, keyboard actions, touch alternatives |
| GAL4-STATES | Empty/New, preview loading/error, unavailable/retry; no unsafe creation during library failure |
| GAL4-VIEWER | Watch/Wear/TV no editing actions; watch page snapping; native rotary/remote unverified |

ui_ux_designer owns behavior, edge cases and visual/adaptive/motion review; lead integrates artifacts
and plan, fresh reviewer checks behavior/evidence. Record source hashes and actual tested browser.
Screen captures demonstrate design, not native accessibility, Skia latency or persistence safety.
Figma reconstruction/identified approval, en/uk linguistic review and native host tests remain gates.

## Verified primary references

- [Apple Liquid Glass adoption](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- [UIKit zoom and interrupted navigation](https://developer.apple.com/videos/play/wwdc2024/10145/)
- [Material Views maintenance status](https://github.com/material-components/material-components-android)
- [Compose Material 3](https://developer.android.com/develop/ui/compose/designsystems/material3)
- [Googlebook adaptive Android guide](https://developer.android.com/develop/adaptive-apps/guides/googlebook/overview)
- [WinUI connected animation](https://learn.microsoft.com/en-us/windows/apps/develop/motion/connected-animation)

Research verified 2026-10-17. No claim that the current Music/Books builds were directly observed.
