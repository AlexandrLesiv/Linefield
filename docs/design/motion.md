# Motion and transition design

Status: partial. Authorized web gallery/drawing transitions, interruption, focus and reduced-motion
behavior are implemented; see [P05-D01 browser evidence](../../apps/web/quality/web-drawing-v2/README.md).
Native mappings, actual host gesture evidence and complete foundation approval remain pending.
Motion is part of interaction design and design review approval, not decoration added after coding.
Follow [navigation](../navigation.md), [handoff](workflow.md) and [test cases](../testing/navigation-motion.md).

## Principles

Use motion to explain cause/effect, hierarchy, continuity and feedback. Every animation needs
an identified purpose; instant change is a valid design. Decision 232 requires common Linefield
motion for app-owned components, with host adaptation for input, accessibility and performance.
OS-owned surfaces keep their system behavior; no shared animation engine is selected implicitly.

Actual ink, pointer feedback and direct manipulation follow input immediately. Do not animate
stroke endpoints toward the pen or delay a command until an animation ends. Brush smoothing,
prediction and inertial navigation are separate reviewed input/rendering decisions, not UI easing.
Theme/motion changes never alter stored geometry/colors, history, dirty state or capabilities.

Separate semantic state (document opened, operation failed) from presentation progress. A paused,
interrupted or disabled animation must reach a correct usable final state without losing actions.
An animation completion callback is not authority to save, discard, close or mutate a document.
Bound visual work; coalesce superseded presentation targets instead of queuing every animation.
This does not permit dropping accepted actual input samples or semantic commands.
Interactive navigation previews may be cancelled; their commit rules follow the navigation contract.

## Required motion specification for each flow

Give each transition a stable reference and specify:
- User purpose, platform/control, trigger, source/destination states and associated route/action.
- What moves/fades/resizes, direction/anchor, layering and clipping; native default versus custom.
- For custom motion: duration, delay, easing/spring parameters and interruption rules. For native
  defaults: control/API and OS version rather than invented exact system timings.
- Forward/back/interactive-progress behavior; rapid repetition, reversal, cancellation, resize,
  backgrounding and a new request arriving before completion.
- When controls accept input, which remain available, focus/accessibility announcements and
  pointer capture. Outgoing invisible controls must not remain focusable or interactive. Block
  only conflicting actions, never the whole app for visual polish.
- Reduced-motion/disabled-animation alternative, increased contrast/transparency preferences
  where relevant, RTL direction policy and target-device constraints.
- Loading, empty, success, error and retry states; no fabricated progress percentage. UI may
  represent real ongoing work, but no minimum decorative delay after the result is ready.
- Performance expectations and native validation: frame work, allocations, concurrent drawing,
  compositor/surface ownership and cancellation correctness. No per-frame production logs.

Proposed inventory: tool/control feedback, selection overlay appearance, approved panel changes,
native sheet/dialog presentation, loading/error feedback, and approved destination transitions.
A document chooser-to-editor flow is a planning example, not approval of a new library screen.
No animated camera flight or drawing replay is included implicitly.

## Platform mappings to review

| Host | Motion and transition direction |
| --- | --- |
| macOS | Common Linefield component motion in the AppKit host; native windows/OS panels and focus. Canvas stays stable while controls change. Do not impose a phone navigation stack. |
| iPhone/iPad | Common Linefield component motion with UIKit navigation integration and interactive cancellation; adapt compact/split layouts, touch/Pencil and system gestures. |
| Android | Common Linefield motion in Compose; mandatory Material feedback is superseded. Review system Back/predictive Back, including cancelled gestures, against supported SDKs. |
| Windows | Common Linefield component motion in WinUI; retain system animation/accessibility preferences, OS surfaces and desktop focus. |
| Linux | Common Linefield component motion in GTK; respect system animation settings and resolve built-in Escape/Back against editor cancellation. |
| Web | Semantic navigation/focus with optional CSS/browser animation enhancement; honor prefers-reduced-motion and remain usable when animation APIs are unavailable. |
| ChromeOS | Use the chosen Android or web route's motion system; review pointer/touch/keyboard and resizable desktop behavior. No third motion implementation. |
| tvOS / Android TV / Google TV | Native remote-focus/navigation feedback, stable reading position and viewing-distance context; focus must not disappear during transitions. Read-only capabilities stay enforced. |
| watchOS | Native compact list/detail transitions, clear loading/offline state and minimal motion/work. Crown navigation is not an editing command. |
| visionOS / Android XR | Start with approved 2D surfaces and native spatial comfort rules; avoid app-imposed viewpoint movement, sweeping motion or implied immersive scope. |

These are design directions, not assertions of identical APIs or completed host support. Platform
engineers confirm available controls/preferences for the actual supported SDK before implementation.

## Reduced motion, accessibility and design review evidence

Do not interpret reduced motion as simply making every animation faster. Remove nonessential
translation/scale/parallax; use immediate updates or a gentle alternative only where appropriate.
Preserve clear state feedback and focus. Do not rely on motion alone to explain an outcome.
If a preference changes mid-transition, settle safely to the current authoritative state.
RTL may change navigation chrome direction, never artwork or world coordinates.

Designer delivers interactive design review prototypes and a transition/state table, not just still
screens. Show normal and reduced-motion paths, forward/back, interruption/cancel, loading/error
and responsive layout cases. Record exact version/frame/prototype links and native feasibility.
When a prototype cannot reproduce a native gesture/timing/interrupt, annotate the limitation and provide
state/timeline specifications; do not claim the prototype proves runtime behavior or latency.

Foundation approval includes motion principles/native mappings. Screen approval includes the
actual proposed transitions and reduced-motion alternatives. Later running-app review checks
motion on each declared device, keyboard/AX focus and usability during work. A screenshot alone
cannot certify transition quality; retain suitable disposable-fixture recordings when permitted.

## Sources and responsibilities

Reference [Apple motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion),
[Windows motion guidance](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/motion),
[libadwaita navigation](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.NavigationView.html)
and [browser reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).
Use compatible stable platform APIs; a live documentation example is not a pinned dependency.

ui_ux_designer specifies and reviews behavioral and visual motion together; native engineers implement platform behavior;
rust_engine protects semantic transitions; rendering_performance measures interference and
resource use; build_reliability records scenario evidence; reviewer checks cancellation, privacy,
accessibility and approval. Competitor research includes motion with its evidence limitations.

Wear OS (P12): watch-native transitions, small/round-screen readability, rotary/focus/Back behavior, reduced motion and bounded visible-only work. Do not apply phone animations or add ambient/complication UI without reviewed scope.
