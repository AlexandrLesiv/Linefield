# Drawing preview verification

[P05-D01](../../../../tasks/P05-D01.md) and the
[screen specification](../../../../docs/design/drawing-screen.md) define this UI-only
prototype: slim left rail, top contextual settings and unchanged sample/blank artwork.
CT/INV/SU identifiers are acceptance context, not proof of real editing semantics.

## Behavior checklist

- Pen is the entry default. Width is integer 1–32, default 8; opacity 0–100, default 100;
  smoothing 0–100, default 25. Entry resets local state. Pen shows all three; Line/Shapes show
  width/opacity; Eraser shows width with an opaque sample; Select has a localized no-settings
  message. Width/opacity affect only the sample; smoothing changes only its local value.
- Color/settings remain visibly unavailable with accurate names; zoom is fixed; the non-editable
  artwork disclosure stays visible. No save claim, engine operation or global shortcut is implied.
- Preserve native range keyboard behavior. Escape, blur, resize and pointercancel cancel unfinished
  pointer adjustment. Reject stale pointer input and mixed range-changing keys during that gesture;
  permit fresh keyboard editing after cancellation even if pointer release was lost.
- Idle/composing Escape must not navigate. Back/history can navigate. Controls stay hidden/inert
  during travel; stale completion must not steal deliberately moved focus.

| Scenario | Contracts and acceptance | Test sources under apps/web/tests |
| --- | --- | --- |
| WEB-D2-01/03 | CT-01/03/09; INV-01/08/11; SU-02 — disposable modes, bounds, reentry and unchanged artwork/history | drawing-shell.spec.ts; drawing-lifecycle.spec.ts |
| WEB-D2-02 | CT-08/09; INV-05/11; SU-07/20 — forward/reverse traversal, selected/disabled names and reachable targets | drawing-keyboard.spec.ts; drawing-layout.spec.ts |
| WEB-D2-04/06 | CT-02/08; INV-04/05; SU-07/08 — cancellation, IME priority, stale input and transition focus | drawing-shell.spec.ts; drawing-lifecycle.spec.ts; drawing-keyboard.spec.ts |
| WEB-D2-05 | CT-09; INV-11; SU-20 — narrow/short, themes, enlarged LTR and pseudo-RTL/forced colors | drawing-layout.spec.ts |
| WEB-D2-07 | CT-03/08; SU-08 — gallery history, repeated New, artwork endpoints and origin focus | navigation.spec.ts; blank-preview.spec.ts; artwork-motion.spec.ts |
| WEB-D2-08 | CT-07/09; SEC-09/12/13 — literal Unicode/HTML-like names, browser-owned context events and bounded controls | drawing-shell.spec.ts |

Narrow keyboard coverage includes reverse traversal and a partially clipped range: pointer focus
must not scroll the bar and move the control under the pointer. These are executable cases; an
earlier unrun report is not their current status. [P05-T01](../../../../tasks/P05-T01.md) preserves
the open WEB-D2-08 intermittent rename finding.

## Presentation checklist and limits

Inspect desktop en/light and uk/dark, 320/390px widths, short landscape, enlarged LTR/RTL and
forced colors. Verify unclipped thumbs, reachable Back, contextual scrolling and footer/header
separation. Preserve artwork direction independently of UI direction.

Input, pseudo-layout, composing and lifecycle injections are fixtures. Context-menu non-interception
is not physical long-press acceptance. WebKit touch is browser emulation. No numeric text parser,
native app, physical pen/touch, VoiceOver or proficient Ukrainian linguistic approval follows from
these checks. Static captures cannot certify interactive playback.
