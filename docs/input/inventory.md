# Input inventory for feature design

Owner direction, 2026-10-16: inventory what UX must consider; do not choose a universal binding or
request shortcut/gesture decisions now. Propose behavior with each affected feature's design and
obtain owner approval before implementation. Items below are considerations, not promised support.
Native engineers verify actual device/API capability. Existing approved behavior remains binding.

## Inputs and system entry points to consider

| Category | Inventory for UX review | Applicability / scope |
| --- | --- | --- |
| Keyboard | Logical keys, Cmd/Ctrl/Alt/Option/Shift, key-down/up/repeat, held modifiers, chords, function/navigation keys, layout/dead-key/AltGr differences, external and on-screen keyboards | Desktop, browser and other hosts with keyboards; no key assignments selected here |
| Native text input | Text-field focus/selection, IME composition, Unicode, dictation, native text Undo and clipboard actions, virtual keyboard appearance | Names/settings/search only where the feature exists; no canvas text tool implied |
| Mouse | Primary/secondary/auxiliary buttons, click/double-click, drag, hover, wheel/tilt wheel, capture and pointer leaving surface | Capability-based; no button behavior assumed |
| Trackpad | Scroll axes, precision/inertia, pinch, supported multi-finger/system gestures, click/drag and interruption | Distinguish system-owned navigation from app gestures; platform feasibility required |
| Touch | Tap/multiple tap, long press, single/multiple contacts, drag/pan/pinch, contact IDs/order, palm rejection, stylus/finger competition, brief contacts, edge/system gestures | Touch editors and viewers; whether a gesture draws or navigates belongs to feature design |
| Wacom and other tablet/display pens | Tip/contact/lift, actual pressure, tilt/orientation/rotation where delivered, hover/proximity, barrel buttons, eraser end, tablet buttons/rings/remotes, driver-mapped shortcuts, device mapping/disconnection | Includes Cintiq/Pro Pen 3 and other supported hardware; availability is verified, not assumed; considering an axis does not approve using it |
| Apple Pencil and other platform styluses | Contact/pressure, tilt, hover, double-tap, squeeze, roll and accessory feedback where available; actual/coalesced/estimated/predicted samples and cancellation | Model/API dependent; selected initial actual-only input and tool scope remain. No automatic eraser, prediction, tilt or accessory feature adoption |
| Native app controls and menus | Buttons, toolbar/sidebar items, context menus, menu bar and app menu, menu accelerators, enabled/checked states, dialogs and dismissal | Include OS-provided entry points, not only gestures inside the canvas |
| OS app/window actions | About/Settings entry points, Services like the screenshot, Hide/Hide Others/Show All, Quit, window close/minimize/fullscreen/resize/focus, Dock/taskbar/launcher actions | Inventory the applicable platform equivalents. Do not add custom Services, Settings, updater or account features merely because another app exposes them |
| System document/navigation requests | File association/Open With, drag-and-drop, clipboard/paste, share sheets, external links, Back/Forward, predictive/system Back, browser reload/close and window activation | Only for approved features; native Open/import rules remain. OS-originated data is not trusted or permission to bypass validation |
| TV/remote/game controller | Directional pad, Select/confirm, Back/Menu, focus traversal, supported remote touch surfaces and optional controllers/keyboard | tvOS and Android TV/Google TV: viewing/navigation only; no controller support promise or interception of reserved Home/microphone actions |
| Watch controls | Touch, supported crown/rotary input, physical buttons, system Back/dismissal, focus and assistive activation | watchOS and Wear OS: viewing/navigation only; system-owned actions remain system-owned |
| XR inputs | System-mediated targeting, selection and manipulation, optional hands/controllers/keyboard/pointer, window/system navigation | visionOS/Android XR within separately approved 2D scope; no raw eye/hand tracking, immersive scope or editing capability inferred |
| Assistive input | Screen-reader activation/actions, keyboard-only access, switch control, voice control/dictation, alternative pointing and OS accessibility gestures | Design equivalent task completion or explicitly report gaps; accessible menus alone do not establish accessible canvas authoring |
| Lifecycle and interruption | Focus loss, modal presentation, capture loss/cancel, app suspension/resume, screen lock, device disconnect, display/scale/orientation/mapping changes, late/repeated input | These are system events rather than intentional commands, but UX must specify interruption/recovery under approved invariants |
| Future automated intent | Future agent or automation requesting an existing action | Architectural command boundary only; no transport, permission model, UI or agent feature authorized |

## Platform applicability checklist

- macOS: keyboard, mouse/trackpad/tablet, native menu bar/app menu/Services and window lifecycle.
- iPhone/iPad: touch, supported stylus/accessories, available external input, native controls,
  text/IME, system navigation and suspension. Do not assume Pencil works on every Apple device.
- Windows/Linux: desktop input, native menus/window/compositor behavior, supported touch/pen,
  accessibility and file/portal integration. Linux desktop/backend differences need explicit review.
- Android/ChromeOS Android: touch/stylus plus external keyboard/mouse/trackpad, native Back,
  window recreation/resizing and accessibility. ChromeOS browser route uses the web checklist.
- Web: DOM/native browser controls, pointer/touch/keyboard/IME, browser shortcuts/history/zoom,
  focus, permissions and tab lifecycle. Installed mode does not imply unrestricted key capture.
- tvOS, Android TV/Google TV, watchOS and Wear OS: owner-selected VIEW-ONLY hosts. Evaluate browsing,
  open/view, navigation/inspection and applicable system controls. Editing bindings are inapplicable;
  shared Rust capabilities must reject drawing/content mutations even if a keyboard is attached.
- visionOS/Android XR: actual supported system-mediated inputs and approved 2D feature scope;
  review editor/viewer capabilities independently. The four viewer choices do not decide XR scope.

## Required feature-design handoff

UX owns a small input coverage table for each feature and platform variant:

| Input/entry point | Applicable or not, with reason | Proposed action/context | Focus/OS conflicts and unavailable state | Cancel/interruption/fallback | Acceptance/evidence IDs | Owner disposition |
| --- | --- | --- | --- | --- | --- | --- |
| Filled for the feature | Include unsupported hardware/gaps | Name shared command or native-only effect | Include text/IME and assistive priority | Include simultaneous devices, brief contacts and late events | CT/INV/SU plus scenario IDs | Pending until identified design approval |

Consult engineers for feasibility and shared-command semantics. Native presentation-only actions
remain native; app/document actions use the shared command architecture. No parallel editing policy
in device adapters. Preserve approved cancellation, active-tool, one-operation Undo and save guards.
UX specifies behavior; UI adds discoverability, adaptive controls, state/focus feedback and motion
in the identified Figma version. Annotate OS menus/hardware actions that Figma cannot execute.
Include accessibility alternatives, keyboard layout/IME, handedness, reduced motion and failure cases.
Send the feature's complete interaction proposal with its Figma handoff to the owner before code;
do not request all hardware mappings as a separate up-front questionnaire. Reuse approved conventions,
and call out any material change for renewed review. Record deferred/inapplicable items honestly.

No hardware, prototype, native E2E or latency verification is performed by this inventory.
