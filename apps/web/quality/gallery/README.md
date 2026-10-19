# Gallery and navigation verification

The gallery uses the same responsive Web controls at every width. Legacy queries must not select
capabilities or another layout mode. Every live card has ellipsis actions; browser context menus
and long press remain browser-owned. Custom swipe-reveal actions are not part of the current
interface. Maintain this contract through [P05-G01](../../../../tasks/P05-G01.md).

## Behavior checklist

| Acceptance | Observable result | Test source under apps/web/tests |
| --- | --- | --- |
| WEB-ONE01–04, SEC-WEB-QUERY-01 | Queries have no capability effect; narrow/touch actions remain reachable; resize preserves Rename/origin focus | preview-controls.spec.ts; responsive-actions.spec.ts |
| WEB-G01–04/06–09/11/13, WEB-URL02/03 | Whole-card navigation, known routes/reload, rapid Back/Forward and malformed-route fallback agree with visible state | gallery.spec.ts; navigation.spec.ts; routes.spec.ts |
| WEB-N01–03 | Repeated New/Back/Forward/reload opens transient blank previews without adding/reordering samples; empty gallery stays empty | blank-preview.spec.ts |
| WEB-R02/03, WEB-RA01–04, WEB-RX01–06, WEB-D2-08 | Literal names; anchored Rename fits visible viewport; Save applies once before motion; Cancel/Escape/outside press restore focus; inside-to-outside drag does not dismiss | refinements.spec.ts; rename-anchor.spec.ts; rename-exit.spec.ts; rename-literal.spec.ts |
| WEB-F03/04, WEB-DM01–03, WEB-UM01–04, WEB-UR01 | Delete preserves a slot with live Undo; immediate Undo interrupts current motion; focus/data are immediate; next activation is not swallowed | feedback.spec.ts; delete-morph.spec.ts; undo-motion.spec.ts; undo-restoration.spec.ts |
| WEB-SC01–03, WEB-R04, WEB-P01/04/07 | Overlay scrollbar consumes no layout width, supports drag/keys/track paging and cleans up; canceled touch preserves next keyboard activation | scrollbar.spec.ts; refinements.spec.ts; platform-actions.spec.ts |

Delete/Undo and Rename are disposable sample operations, not evidence of durable deletion/recovery.
A production host must serve the entry document for `/drawing/<id>` routes; local Vite fallback
alone does not validate deployment.

## Presentation and motion checklist

- At desktop, intermediate and narrow widths, verify bounded centered cards, stable slots and one
  reachable New action. Long names and enlarged text must not hide actions or move focus unexpectedly.
- WEB-M01/02 compare artwork and shell bounds at both handoffs; WEB-M04 observes actual unforced
  playback. Both tracks must advance and hand off without a last-frame jump or duplicate surface.
  See artwork-motion.spec.ts and motion-playback.spec.ts.
- WEB-C01–03 cover New surface color/content in both directions, interruption and reduced motion.
  See creation-motion.spec.ts. Inspect light/dark, not only one theme's final frame.
- Rename text stays unscaled while its shell morphs. Menu/Delete/Undo handoffs retain one opaque
  surface and one label owner. Scroll, resize, detachment and new actions remove obsolete visuals.
- Check normal and reduced motion separately. Paused animation proves sampled geometry, not clock
  progression, subjective smoothness, frame pacing or performance.

WEB-RA04 visual-viewport keyboard injection is not a physical software-keyboard test. Physical
touch arbitration, native focus/IME, screen-reader speech and hardware performance remain unverified.
[Current failure and evidence rules](../README.md) apply; old successful counts are not current passes.
