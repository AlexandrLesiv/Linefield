# Navigation and motion scenarios

Status: planned; no executable tests or approved new screens. Extend the shared E2E catalog,
not a second runner. NAV-001 remains canvas pan/zoom; ROUTE IDs below mean app destinations.
Map CT-01–CT-03, CT-05, CT-07–CT-09; INV-01/04–07/09–11; applicable SU-02/07/09–12/14–18/20.

| Scenario | Observable requirement |
| --- | --- |
| ROUTE-OPEN-001 | Real native/chooser Open produces the validated document and accepted destination; browser URL/history agrees when applicable; cancellation/failure preserves current content |
| ROUTE-DIRTY-001 | Back/New/Open/close resolve pending/failed autosave, retry/cancel and newer edits; no silent revision loss or rollback of already-persisted edits |
| ROUTE-HISTORY-001 | Browser Back/Forward, direct address, reload, unknown IDs and cancelled traversal have correct content/history; test rapid/multi-entry traversal without loops |
| ROUTE-LINK-001 | Valid/invalid/unavailable external requests follow access/capability/dirty guards; malformed or unauthorized input cannot execute commands, fetch arbitrary resources or expose paths |
| ROUTE-RACE-001 | Slow load A followed by B, duplicate requests, cancelled guards and session close reject stale completions and bound pending work |
| ROUTE-RESTORE-001 | Relaunch/recreation restores only valid route state; missing draft/file/access yields honest recovery/unavailable UI; never claim session-local undo persists |
| ROUTE-FOCUS-001 | Back/modal cancel returns meaningful focus/list position; interactive navigation cancel preserves session and field/IME semantics; Escape does not accidentally pop the editor |
| MOTION-STATE-001 | Normal, disabled/reduced motion and interrupted/reversed transitions reach identical semantic state, history and availability; no duplicate commands |
| MOTION-INPUT-001 | Actual ink/direct manipulation does not wait for decorative animation; resize/background/new actions during transition leave a usable surface without stuck input capture |
| MOTION-AX-001 | Reduced motion, RTL chrome, keyboard/screen-reader focus and announcements remain usable; artwork is unchanged and animation is not the only state signal |
| MOTION-PERF-001 | Authorized release measurements cover transition plus drawing/loading interference, frame costs and memory; software metrics do not certify physical pen latency |

Core tests cover guarded command/revision/capability policy; adapter tests cover route parsing,
identity roundtrips and controlled races; real native/browser E2E exercises actual entry points,
Back gestures/buttons and focus. Dispatcher injection is not route E2E. URL assertions alone
cannot prove the correct drawing is displayed; combine semantic and visible content assertions.

Use condition-based waits and bounded timeouts, not sleeps equal to animation duration. Routine
functional runs may disable nonessential animation through a reviewed test setup, but retain
real normal-motion and reduced-motion lanes plus interruption cases. Do not globally disable
animations and claim motion acceptance. Record actual platform preference and test override.

Record build/revision, route scenario, capability, window/layout, locale/direction, OS/device,
refresh/scale, animation policy, expected/observed focus and evidence category. Use disposable
files/IDs and redact addresses. Record foreground reservation and permitted recordings. design review
prototypes validate design intent only; actual native motion/latency needs runtime evidence.

Phasing: S00A/S00D define motion/routes; S02 freezes guards and tests; S04/S05 verify implemented
controls/canvas transitions without assuming a chooser; S06 adds file/recovery navigation;
P01–P12 add host stacks, browser URLs, viewer/remote and lifecycle variants when implemented.
External-link registration/new pages remain gated; mark unimplemented capabilities planned or
not applicable with reasons, never passed. S07/S08 audit all applicable evidence.
