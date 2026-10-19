# Durable library removal states

Prepared2026-10-19. **Proposed states for owner/design review, not implemented or approved.**
Extends selected gallery visuals without changing the grid, route animation or ordinary Delete
confirmation policy. Decision236 settles persistence/departure policy; per-scope ownership and
recovery selection below remain new choices. CT-03/05/09; SU-21; DEL4-02/06/07/10/13/15.

| State | Visible behavior | Focus, accessibility and navigation |
| --- | --- | --- |
| Your staged removal | Same-slot Deleted name and Undo; retained across reload | After Delete focus Undo; announce full localized removal message once. Undo restores card/action focus without reflow |
| Another live gallery owns removal | Same-slot removed item with explanatory “Removal is controlled in another tab” status; no Undo/Open/rename | Keep reachable status via card reading order; disabled buttons alone are insufficient. Unrelated cards remain available |
| Orphan removal scope | Explain that interrupted removals can be recovered; bounded list of scopes, no automatic combining | Explicit Recover requests exclusive claim; keep focus on request until outcome. One scope at a time; pagination must preserve active choice |
| Claim pending | Retain placeholders with Recover busy state | No premature Undo; keep focus/status. A lost response enters reconciliation rather than acquiring again blindly |
| Destination preparation | Existing gallery remains visible; show preparing status | Keep originating card/New focus; do not accept history route or finalize removals yet. Cancellation before acceptance retains Undo |
| Departure outcome unknown | Explain that the result is being checked; no success/failure assertion | Disable contradictory Undo/Open on affected set; retain unrelated browsing. Focus remains on stable status/action region; retry means query outcome, not repeat mutation |
| Proven rollback | Same placeholders and Undo restored, plus failure explanation | Restore initiating control focus; browser route remains/reverts to last accepted route without adding an extra entry |
| Known departure commit | Removals no longer undoable; accept destination route | Use existing motion/reduced-motion behavior; focus destination Back when ready. No animation controls durable acceptance |
| Commit accepted, destination display fails | Explain separately that removals were accepted and the drawing could not be shown; recovery action returns to gallery | No Undo for committed set. Focus recovery action. Browser route must reflect the visible error/recovery state, not claim an open editor |
| Physical cleanup pending/fails | Removed items stay removed; report cleanup issue separately when actionable | Never restore Undo because unlink failed. Preserve recovery capacity; no timing/countdown UI |

During unknown departure, “unrelated browsing” permits scrolling/reading only. Open/New and
Back/Forward remain guarded until reconciliation so they cannot create a second departure.

Strings above are semantic English drafts, not a final catalogue or Ukrainian linguistic approval.
Use stable IDs, full en/uk messages and typed arguments. No raw paths, operation IDs or technical
lock terminology in product messages. Announcements must not repeat on every poll/page hydration.
The bounded orphan selection is a new design surface: exact layout, wording, count/focus order,
cancel behavior and reference captures must be reviewed before implementation. No Trash screen.

Browser Back/Forward is a departure request while an uncommitted removal set exists. Route intent
must await the same preparation/commit outcome as clicking a drawing; a browser history event is
not proof of durable acceptance. Reload/close do not finalize. External navigation cannot promise
an asynchronous commit or intercept system departure indefinitely; staged state remains durable.
Exact history rollback/reconciliation mechanics require browser fixtures before implementation.

Scale review dependency: regional-v4 V4-D proposes cancelling the whole unfinished scale when
the pointer crosses the pivot or selected scale limits, visibly restoring the captured geometry.
Keep selection/tool, announce a localized limit reason once, require release/fresh begin, and add
no Undo. This is a potentially surprising proposed behavior, not owner-approved gesture design.
Compare it with a separately reviewed bounded-preview alternative before selecting the gesture;
no clamping or alternative numerical semantics may be introduced silently.

Required captures/tests: every state in en/uk, 320px and desktop, normal/reduced motion, actual
Tab/Shift+Tab and screen-reader announcements; multi-tab ownership changes, crash/reload, lost
reply before/after commit and browser history. All are planned/unrun. Existing prototype evidence
does not certify this new state matrix.
