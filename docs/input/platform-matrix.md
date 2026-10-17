# Platform input and shortcut matrix — proposed v1

Current direction: use the [input inventory](inventory.md) during feature design. The new mappings/
arbitration below are historical proposals, not an up-front decision queue or approved defaults.
UX submits relevant behavior with each feature for owner approval. Decisions 151–152 supersede
prior pending-review wording; all four TV/watch hosts are view-only.

Checked 2026-10-16. Product mappings are recommendations, not source mandates or owner approvals.
Each row needs native E2E and physical device evidence as applicable. Keyboard entries assume hardware
keyboard, app/canvas focus and no native field/IME/modal/OS consumer. Viewer editing remains forbidden.

## Common desktop/editor action bindings

| Action | macOS / supported iPad keyboard proposal | Windows/Linux/Android desktop proposal | Browser proposal | Scope/guard |
| --- | --- | --- | --- | --- |
| Undo / Redo | Cmd+Z / Cmd+Shift+Z | Ctrl+Z / Ctrl+Shift+Z; Windows Ctrl+Y alias | Primary+Z / Primary+Shift+Z only when canvas owns handling | Reject during editing; native field history takes priority |
| Flush completed edits | Cmd+S (already selected macOS) | Ctrl+S | Visible Save; shortcut only after host-profile conflict verification | No panel or forced stroke commit; viewer unavailable |
| New drawing | Cmd+N | Ctrl+N | Visible New; leave browser new-window chord | Shared exit/save guard |
| Import external drawing | Cmd+O, menu labelled Import | Ctrl+O | Visible Import; browser Open stays browser-owned | Native/file input effect, independent copy |
| Pen / Select tool | P / V | P / V | P / V only focused accessible canvas if approved | No IME/field typing, no active interaction; no document-global letter listener |
| Delete selected stroke | Delete key | Delete | Delete only canvas-owned event | Selection only; gallery deletion remains separate confirmed action |
| Cancel / clear selection | Escape | Escape | Escape only if canvas owns event | Active cancel, else clear selection, else no-op; modal/IME/system first |
| Temporary pan | Hold Space + primary drag | Hold Space + primary drag | Canvas-only; retain page scrolling outside | Idle only; release/capture/focus loss cannot leave stuck mode |
| Pan / zoom | Scroll pan, pinch zoom | Wheel/trackpad pan, supported pinch zoom | Scoped canvas gestures; page zoom available outside | Never zoom page and canvas from one event; active-edit guard |
| Zoom controls | Native Zoom In/Out/Fit/100% menu | Native menu/controls | Visible controls | Exact chords reviewed per layout; do not steal browser Ctrl/Cmd +/-/0 |
| Export native / PNG | Explicit native menu/control; chord deferred | Same | Visible controls | Active-edit and queue admission guards; no implicit Save As |
| Close/quit | Native Cmd+W/Q | Native window close / Alt+F4 | Leave browser close/reload controls | Shared guards where platform permits; cannot promise to prevent forced tab/process termination |

Primary on web means the platform-appropriate modifier only for an approved browser profile, not
blind interception of every Cmd/Ctrl chord. Exact modifier matching includes AltGr/layout concerns.
No Copy/Cut/Paste artwork, Select All, eraser, arrow-key nudging or rotation is added by a shortcut.
Keyboard navigation/activation of native controls remains available even without canvas shortcuts.

## Device and host profiles

| Host / scope | Pointer/pen | Touch/gesture/navigation proposal | Native precedence and gaps |
| --- | --- | --- | --- |
| macOS AppKit editor, first | Mouse primary and Cintiq tip drive selected tool; supported actual pressure, otherwise constant width | Idle scroll/Space-drag pan, trackpad pinch zoom | Native menus/responder chain, text/IME first; no touchscreen Mac availability assumption; pressure/button/driver tests required |
| iPhone UIKit editor, later | Finger tool action; external pointer/keyboard when delivered | Two-contact pan/pinch while idle; single-contact arbitration reviewed before port | No Apple Pencil support assumed; visible Undo/Redo/Cancel/zoom; native Back/AX gestures retained |
| iPad UIKit editor, later | Pencil tip pressure where supported; mouse/trackpad and finger fallback | Proposed respect supported Pencil-only preference: finger navigation in that mode, otherwise finger tool + two-contact nav | Coalesced actual points once; late estimated-property updates need separate bounded correction policy; hover/double-tap/squeeze capability-specific |
| Windows WinUI3 editor, later | Pointer events/capture and actual history to Rust; pen pressure if supported | Touch tool plus idle two-contact navigation; mouse/trackpad desktop profile | Native TextBox/IME/system chords; pointer cancel/capture-loss handling; no second native inking document model |
| Linux GTK4/libadwaita editor, later | GTK controllers/stylus axes to adapter, mouse fallback | Backend-supported touch/pinch only; desktop profile | Compositor/Wayland/X11 differences, focus propagation and keyboard layouts need actual-host tests |
| Android Compose phone/tablet editor, later | Tool type and stable pointer ID; history before current; stylus pressure normalized using reviewed device range | Finger tool fallback, idle two-contact pan/pinch after arbitration; navigation mode in pen-only proposal | Main Looper native events; native text editing/IME/Back/TalkBack first; raw pressure can exceed 1 without being invalid |
| ChromeOS Android route | Reuse Android adapter plus keyboard/mouse/stylus/trackpad capabilities | Resizable desktop profile with native Android lifecycle | Real Chromebook evidence needed; Android trackpad events are not assumed identical to browser events |
| Browser / ChromeOS web route | Pointer Events with scoped capture, actual coalesced points if available; capability fallback | Canvas-scoped touch-action/arbitration, semantic controls and safe page scrolling/zoom | pointercancel/lost capture cancel; deduplicate raw/coalesced streams; browser shortcuts, composition and assistive technology first |
| visionOS 2D, later | System-mediated indirect/direct selection/drag if viable; optional keyboard/pointer | Native window controls; review 2D canvas manipulation with real SDK/device | No raw gaze/hand tracking or artificial pressure; system Crown retained; no immersive scope |
| tvOS viewer, later | Remote directional focus and activation | Visible pan/zoom inspection controls or explicit viewer mode | Back exits mode/route appropriately; Home/system keys retained; keyboard cannot unlock editing |
| Android TV / Google TV viewer | D-pad focus and Select | Same explicit inspect/zoom/pan concept, native Back | No global capture of Home/microphone; no touchscreen requirement; mutation rejected in Rust |
| watchOS viewer | Touch native list/open/Back; Crown scrolls list | Crown zoom only proposed in explicit canvas inspection context with touch alternative | Crown press/system gestures retained; no editing; source/cache networking separately scoped |
| Wear OS viewer (owner-selected) | Touch/rotary where supported | Native list scrolling; explicit zoom context only after role/toolkit review | Native Back/TalkBack; no keyboard or rotary hardware requirement; P12 toolkit/source still pending |
| Android XR, 2D capability pending | System-mediated targeting/select/scroll plus optional devices | Review standard 2D interactions and accessible controls | No invented pressure/6DoF/eye permissions; editor/viewer capability and hardware support remain open |

Hover never commits artwork. Eraser ends should not accidentally draw/delete; side buttons and
Pencil accessory actions are unbound unless they arrive as ordinary already-approved driver shortcuts.
Pressure absence is explicit, not guessed from a constant sentinel. Palm/device cancel ends only the
tracked unfinished interaction; it does not undo previously committed strokes. Touch/arbitration
choices are proposals; they must not weaken the approved macOS gesture guards by analogy.

## Sources and evidence limits

API availability confirms a capability, not Linefield behavior. All sources checked 2026-10-16;
version-specific APIs and store policies must be rechecked at implementation. No hardware tests ran.

- Apple: [NSEvent](https://developer.apple.com/documentation/appkit/nsevent), [keyboard guidance](https://developer.apple.com/design/human-interface-guidelines/keyboards), [key-command priority](https://developer.apple.com/documentation/uikit/uikeycommand/wantspriorityoversystembehavior).
- Pencil/touch: [coalesced touches](https://developer.apple.com/documentation/uikit/getting-high-fidelity-input-with-coalesced-touches), [estimated updates](https://developer.apple.com/documentation/uikit/uitouch/estimatedpropertiesexpectingupdates), [Pencil preferences](https://developer.apple.com/documentation/uikit/uipencilinteraction).
- Apple viewers/XR: [gestures](https://developer.apple.com/design/human-interface-guidelines/gestures), [remotes](https://developer.apple.com/design/human-interface-guidelines/remotes), [Digital Crown](https://developer.apple.com/design/human-interface-guidelines/digital-crown).
- Android: [large-screen input](https://developer.android.com/develop/ui/views/touch-and-input/input-compatibility-on-large-screens), [stylus features](https://developer.android.com/develop/ui/views/touch-and-input/stylus-input/advanced-stylus-features), [MotionEvent](https://developer.android.com/reference/android/view/MotionEvent), [Back](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture).
- Android viewers/XR: [TV navigation](https://developer.android.com/design/ui/tv/guides/foundations/navigation-on-tv), [Wear rotary](https://developer.android.com/training/wearables/compose/rotary-input), [XR](https://developer.android.com/design/ui/xr/guides/considerations). Wear source is not approval to adopt Compose.
- Windows: [pointer input](https://learn.microsoft.com/en-us/windows/apps/develop/input/handle-pointer-input), [keyboard priority](https://learn.microsoft.com/en-us/windows/apps/design/input/keyboard-interactions), [WinUI accelerators](https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-accelerators). Verify API namespace/desktop availability rather than copying UWP-only examples.
- Linux: [GTK event propagation](https://docs.gtk.org/gtk4/input-handling.html), [GestureStylus](https://docs.gtk.org/gtk4/class.GestureStylus.html).
- Web: [Pointer Events](https://www.w3.org/TR/pointerevents3/), [character shortcut accessibility](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html). Browser implementation support must be tested.
