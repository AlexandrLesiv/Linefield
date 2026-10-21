# MIG-D1 — full in-memory vector drawing screen

P05-M01, 2026-10-21. Designer specification adopted by the lead under decision242's delegated
M01–M09 authority. This is design specification review, not actual-build visual acceptance.
Preserve the existing gallery, header/back/title/settings, slim rail, contextual top bar,
semantic themes, English/Ukrainian and native focus/IME. No imported lab chrome.

## Controls and defaults

Rail: Pen, Select, Slice, Pan, Rotate, color. Existing Line/Shapes remain unavailable.
Pen context: Ink/Hard/Soft, width/sample, opacity and Pressure panel. Ink8/Hard3/Soft12 fresh
widths, all1–512; black; opacity100%. Preserve accepted resumed settings. Pressure minimum
0–50%(fresh5%), exponent0.25–4(fresh1.8), fixed-width switch; Linear response preset20%/1.
Remove obsolete Smoothing Off wording; do not add a smoothing tool.
Select context: Lasso/Pick, partial/whole, active-layer filter, Lasso more, Clear/Delete,
Transform panel. Slice: width numeric0–500(default20), slider0–150 and zero action, active-layer
filter. Numeric widths above150 remain represented correctly; slider must not clamp them.

Layers opens an anchored bounded panel: names/counts/create/select/rename/show/lock/reorder/delete.
Paper/Grid live in drawing settings: None/Warm/Clean white; None/Notebook/Dots. Fresh warm/no grid;
existing white sessions retain white. Paper/pencil grain is world-anchored, independent of chrome.
Pencil transformed sources resample grain; width-derived deposition is a disclosed limitation.
Footer always communicates Not saved; lost on reload/tab close. Zoom5–1600%, angle controls,
angle reset and explicit Reset view (translation/100%/0°). No developer timing HUD in normal UI.
44px targets, scrollable top context and bounded panels at320CSSpx/200%text; no content clipping.

## Input, locks and continuity

Mouse/Wacom: actual pointer/coalesced samples. Space temporarily pans, held R rotates,
V selects and S activates Slice only outside editable/IME/dialog controls. Freeze gesture mode
at pointerdown. Releasing modifiers does not start ink. Touch remains browser-owned.
Pan/rotation follows input immediately; all ink stays aligned. Rotation drag uses view center,
Shift snaps15°. Angle reset preserves center/scale. Wheel zoom is pointer-anchored.
Active editing rejects view/tool/history/layer/incompatible settings without queue or implicit
commit/cancel. Temporarily locked buttons keep their colors; use not-allowed cursor and semantic
availability. No flashing controls, post-stroke loader or wait before the next valid stroke.
Escape first belongs to field/dialog/IME, then cancels interaction, otherwise clears selection.
Blur/hidden/capture loss/mapping-invalidating resize cancels unfinished work; completed history
survives. View cancellation restores prior view. Renderer loss cancels unfinished work only.

## Session and layers

Back/Resume retains content/history/view/layer/brush/paper/grid and valid selected IDs.
Navigation cancels unfinished work/closes panels. History prunes invalid selection IDs.
Selection/active-layer changes are not Undo entries. Create above active and select new layer;
host localized default name is passed as ordinary text. Top row is frontmost. Cannot delete last
layer. Layer deletion is undoable without another confirmation. Hidden/locked active layer
shows Show/Unlock/Choose; do not silently switch layers. Rename Enteraccept/Escape cancel,
blur attempts accept, outertrim/nonempty/length validation, invalid draft retained, IME first.
After delete focus active row; reorder/Undo preserve identity-based focus.

## Selection and Slice

Lasso/Pick supports partial/whole and layer filters independently of render-cache state.
Transform captures group membership/base transforms; MoveX/Y, Rotation, Uniformscale panel
Apply/Cancel gives a keyboard alternative and one Undo. No-op preserves redo. Previous/Next
eligible stroke actions expose selection count/identity; freehand is not claimed fully accessible.
Slice is named Slice, not an eraser. Preserve immediate feedback, every accepted gesture sample,
source intervals, zero-width cuts, transparent/pencil sibling blending and one Undo per gesture.

## Review states and scenarios

| IDs | Required observable review |
| --- | --- |
| MIG-D1-01 / MIG-UI-01 | Empty/resume/defaults/unsaved |
| MIG-D1-02 / MIG-UI-02 | Brushes/pressure/zero opacity |
| MIG-D1-03 / MIG-UI-03 | Active stable locks and immediate fresh stroke |
| MIG-D1-04 / MIG-UI-04 | Pan/rotate/zoom, cancellation and aligned reveal |
| MIG-D1-05 / MIG-UI-05 | Protected layers, rename, order/history/focus |
| MIG-D1-06 / MIG-UI-06 | Small/offscreen selection, group and keyboard transform |
| MIG-D1-07 / MIG-UI-07 | Zero/wide/no-hit Slice, protections/cancel/blending |
| MIG-D1-08 / MIG-UI-08 | Resource/context failure, retained work, Retry/Back |
| MIG-D1-09 / MIG-UI-09 | Compact, en/uk, themes, focus/IME and text enlargement |

Review actual changed states in light/dark/forced colors, English/Ukrainian, pseudo-expanded
layout and100/200%text. Separate functional, visual, accessibility and physical-device evidence.
Synthetic pen E2E does not certify actual Wacom timing or pressure. Native implementation is
future scope; host behavior mappings must not duplicate Rust editing rules.

M02 acquisition clarification: a recognized trusted capture-loss-before-release browser
sequence freezes acquisition until matching terminal release, without a timeout; this is
not treated as genuine gesture interruption. Blur/cancel/capture transfer still rolls back
through Rust. Existing mouse/Wacom terminal-order handling must survive renderer migration.

M02 entry-motion amendment: New/Resume establishes the final viewport-sized canvas and input
mapping before the editor reports ready. Do not animate the interactive surface's position,
size or transform during entry. Noninteractive chrome or tile presentation may fade; the
minimal implementation skips geometry motion for this live route while preserving gallery
mock-drawing motion and departure presentation after editor detachment. Animation completion
cannot reclaim focus or change the accepted mapping. Real window/DPR remapping and genuine
focus loss retain their shared cancellation rules. MIG-UI-01/03 must cover normal-motion
first-ready drawing without a settling delay, as well as reduced-motion behavior.
