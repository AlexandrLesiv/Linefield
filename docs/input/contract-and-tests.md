# Shared input contract and acceptance — proposal v1

Current direction: use the [input inventory](inventory.md) during feature design. The new mappings/
arbitration below are historical proposals, not an up-front decision queue or approved defaults.
UX submits relevant behavior with each feature for owner approval. Decisions 151–152 supersede
prior pending-review wording; all four TV/watch hosts are view-only.

2026-10-16, S00F/CT-01/02/03/04/08/09, INV-01–05/10/11. No implementation or concrete ABI approved.

## Shared Rust policy, native acquisition

~~~mermaid
flowchart TD
    OS[OS devices and system gestures] --> Native[Native event and focus adapter]
    Native --> Priority{OS / IME / text / modal owns event?}
    Priority -->|yes| Widget[Native handling]
    Priority -->|no| Normalize[Normalized key / pointer / navigation intent]
    Profile[Rust platform binding and capability profile] --> Match[Shared match and interaction admission]
    Normalize --> Match
    Match --> Dispatcher[Same typed Rust command dispatcher]
    Dispatcher --> State[Editor/session state and availability]
    State --> Render[Skia scene]
    State --> Controls[Native menu/control projection]
    Controls -. approved accelerators and action IDs .-> Native
~~~

Native controls can directly dispatch semantic actions; they need not synthesize key/pointer events.
Pure native text/navigation presentation remains native. Native menu registration and Rust matching
must not dispatch the same action twice: the adapter marks handled events and uses one command path.
No AppKit/UIKit/MotionEvent/WinUI/DOM object enters the document or shared command transport.

Proposed Rust definitions: ActionId; capability/context; platform binding descriptor; normalized
modifier/key identity; pointer ID/device kind/contact phase/timestamps/canvas coordinates/pressure
presence; session/mapping generation; interaction state; typed availability/outcome. These are
conceptual fields, not a frozen struct/enum or new binary wire format. Prefer source-controlled
compiled typed profiles initially, not user scripts or persisted custom mapping files. Keep binding
presentation labels native/localized; native event key mapping follows actual layout/IME semantics.
No custom shortcut-settings screen or general command macro engine is approved.

Logical character actions should use layout-aware matching; physical device positions only where
an explicitly approved binding requires them. Preserve exact modifiers and native logical keys for
Escape/Delete. AltGr, dead keys, composed characters and accessibility command layers are not ordinary
canvas typing. Key repeat policy is per action: no repeated New/Import/Export/tool toggle; reviewed
repeat for held navigation or native behavior only. Releasing focus/modifiers clears temporary modes.

## State and arbitration

~~~mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Candidate: native contact awaiting classification
    Candidate --> Editing: admitted begin for selected tool
    Candidate --> Navigating: admitted pan or zoom
    Candidate --> Idle: cancel or invalid
    Candidate --> Idle: short contact classified and completed, if admitted
    Editing --> Editing: ordered valid actual samples
    Editing --> Idle: end commits one operation
    Editing --> Idle: cancel rolls back unfinished work
    Navigating --> Idle: end or cancel
~~~

Candidate is a proposed arbitration concept, not approval for a delay or new thread. A quick tap or
short drag ending before classification must receive an explicit outcome; never silently discard it.
If admitted as editing, replay buffered actual samples exactly once in order, including terminal
state, with one complete operation. Cancel leaves no partial edit. Bound the buffer and define its
overload outcome before choosing timing; touch dots/selection taps and second-contact races need tests. Once an edit
begins, existing guards apply: reject tool/style/Undo/Redo and viewport navigation changes, no queued
replay on pen-up. Save may flush completed work; Export rejects active edits. OS focus/mapping change
cancels through the shared path. Idle selection is not an active edit. Device-specific cancellation
maps to that path; uncertain end must not fabricate a stroke completion.

For touch, choose and approve before port implementation: bounded candidate arbitration versus a
new cancel-on-second-finger rule. First option risks start latency; second risks discarded intent and
changes cancellation semantics. Recommend prototype/specify first before choosing exact timings.
Do not apply a new touch policy to macOS tablet input implicitly. Native Back is route intent with
shared save guards; it is not universally the same as canvas Escape. Predictive Back cancellation
must not complete navigation. Forced process/tab termination has different guarantees from normal Quit.

Normalize device units/capabilities before shared finite/domain validation. Android raw pressure may
exceed 1; don't clamp/reject without a reviewed capability/range policy. Web synthetic constant
pressure must not be mistaken for a real sensor. Record source type but no per-sample production logs.
UIKit actual measurements may arrive with estimated properties later corrected. Design correlation,
bounded pending lifetime and one-operation revision/history behavior before that port; predictions
are separate and excluded initially. Never append duplicate terminal/coalesced samples or let a stale
property update alter another session. Real events are ordered; bounded queues cannot silently drop ink.

## Proposed acceptance matrix

| Scenario ID | Test and invariant | Required evidence |
| --- | --- | --- |
| INPUT-01 | Native menu/control/key all yield same action/outcome; one dispatch only | Shared command fixtures plus native menu/key E2E per host |
| INPUT-02 | Text/IME/modal/AX priority, Delete/Undo/Escape/Space and layout/AltGr | Native editable fields, real composition and keyboard-only/AX interaction |
| INPUT-03 | Begin/update/end/cancel, repeats, focus/mapping/device loss, stale events | Shared state tests plus real native interruption |
| INPUT-04 | Ordered actual batches and deduplication; pressure capability/ranges; no predictions | Adapter fixtures plus real pen/device evidence; replay labelled separately |
| INPUT-05 | Finger/pen/mouse competition, quick tap/short drag, second-contact race, candidate cancel and bounded sample retention | Real touch/pen hardware; emulator cannot certify palm rejection |
| INPUT-06 | No pan/zoom/tool/style/history mutation during edit; Save completed-only | Shared guards and native controls/keys/gestures |
| INPUT-07 | Capture-loss/pointercancel/native canceled properties never commit partial stroke | Host injection labelled integration plus native interruption where possible |
| INPUT-08 | Back/navigation/close/cancel respects shared state and native/browser ownership | Real platform route/E2E, browser Back/Forward and unsaved failure |
| INPUT-09 | Viewer rejects edits even through keyboard/bridge while controls remain navigable | Shared capability test plus TV/watch/XR applicable host E2E |
| INPUT-10 | Discrete actions and native controls are discoverable/accessible; separately assess authoring completion | Native AX/keyboard/remote tests; record unresolved accessible selection/move/scale/freehand gaps rather than treating menus as proof |
| INPUT-11 | Late measured-property correction stays in session/operation, no extra Undo | UIKit adapter tests and supported Pencil evidence before that port |
| INPUT-12 | Left/right-handed use does not obstruct required actions; reduced-motion feedback preserves state/focus | UX/UI adaptive prototype review then actual platform tests; no new handedness preference implied |

Canvas pan/zoom and selection/move/scale need reviewed non-gesture or native accessibility actions
where feasible; accessible menus alone do not prove an accessible authoring workflow. Exact controls
and alternatives remain UX/design review approval work. Do not silently add numeric editing, keyboard nudging,
new tool settings or claim full accessibility. Record any unsupported task explicitly.

Registry includes host/build/driver/device/input route, fixture version, discovery/execution status
and artifacts. Current Mac/Cintiq is only selected future verification baseline; no successor test
has run. Later host/device support remains planned, not working. Record unavailable hardware and
unsupported automation, never synthesize a claim of physical pressure/latency correctness.

## Security impact and approval

Input crosses native/FFI boundaries; device events, URL/IPC or future agent signals do not themselves
authorize document access. Shared capabilities/session ownership and bounds still apply; renderer
can't mutate document. Follow SEC-02/03/04/10/11/12/13 and threat-change records at implementation.
Changing profiles must not grant viewer mutations or override native text/OS priority. Owner reviews
this package and concrete S02 representation, then UX/UI hand off identified design; no new custom
protocol, global event tap, accessibility permission for the product or input SDK added incidentally.
