# Input planning for feature design

Current owner direction (2026-10-16, decision 151): maintain an [input inventory](inventory.md) for UX.
Do not settle shortcut/stylus/OS-action mappings now. UX proposes applicable platform behavior while
designing each feature and submits it with the identified UI/Figma handoff for owner approval before
implementation. No P/V or other new binding was approved by the earlier question.

The inventory includes native app menus and OS actions (including Services, Hide and Quit), keyboard,
mouse/trackpad, touch, Wacom/Pencil and other pens, TV/watch/XR controls, assistive input and lifecycle
interruptions. Presence in the list does not authorize a feature or promise device support.

Decision 152 selects watchOS, tvOS, Wear OS and Android TV/Google TV as view-only. Plan viewing and
navigation inputs for these hosts; shared Rust must reject drawing/content mutation requests.
Standalone/acquisition, toolkit, network and implementation permissions remain separate decisions.

[Earlier matrix](platform-matrix.md) and [contract/test research](contract-and-tests.md) remain reference
material. Their proposed defaults are not approved and are not an up-front decision queue. Reassess
only the relevant proposals in feature design. Preserve already approved shared Rust behavior, native
field/IME priority, actual-only initial samples, cancellation, active-interaction and save rules.
Concrete ABI/state/security changes still require their separate review; no runtime implementation.

[Historical review](../../quality/input-distribution-review.md) applies to its recorded snapshots;
the latest workflow direction is documented here and in S00F, not certified by that older review.
