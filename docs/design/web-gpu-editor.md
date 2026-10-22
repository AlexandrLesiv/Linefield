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

## M03 asynchronous geometry presentation

Designer specification review,2026-10-21, against M02 runtime1157aeba; adopted by the lead
under decision242. Actual M03 build review remains required. No new controls/screens.

Pending geometry is not an unfinished tool interaction. After ending A, accept B immediately
and restore normal history/tool availability without a spinner, flashing colors or repeated
loading announcements. Base, completed-pending and active overlays compose each logical group
exactly once in order. Promotion into the base cannot brighten, darken, disappear, duplicate or
jump. Test intermediate frames, not only final artwork. MIG-E01/E06/E07 and MIG-UI-03 apply.

Pan transforms only Rust-certified coherent coverage, keeping every overlay aligned. Replacement
must not snap; newly revealed content must meet the existing completion-time gates and never
receive a complete-frame acknowledgement while absent. Rapid zoom must not regress detail;
Escape restores the pre-drag view, and late results cannot restore the cancelled view.
MIG-E03/E06, MIG-X03 and MIG-UI-04 apply.

Undo/rebranch immediately invalidates affected content's semantic currentness and obsolete
overlays. The M03 continuity repair retains one already validated historical base as display-only
presentation until a valid current frame swaps atomically; it must not clear unaffected artwork
to white while rebuilding. Historical pixels cannot acknowledge currentness, drive hit tests or
enter the new branch. This explicitly supersedes the earlier requirement to remove affected
base pixels before the next presentation. History still changes immediately in Rust and retains
its completion-time limits. No spinner, fade, focus change or disabled controls is introduced.
Fresh accepted strokes absent from that raster appear immediately once, with bounded base
reconstruction progress. Rust transforms historical pixels and current overlays consistently
during pan/zoom; newly revealed coverage remains incomplete until actually rendered. Repeated
history targets the latest valid state, without cycling obsolete replacements onto the display.
Cancel removes only current unfinished overlays; context loss cannot retain invalid GPU pixels.
A late result cannot resurrect obsolete content after replacement. Worker-only loss is transparent when bounded
fallback can maintain usable output; no error overlay solely for worker failure. Mandatory
display loss follows existing recovery: cancel only unfinished interaction, retain completed
work/history, one reduced rebuild then Retry/Back, truthful readiness. MIG-E04/E05/E06,
MIG-X02/X05 and MIG-UI-08 apply.

Back/Resume, blur and resize discard obsolete presentation results without stealing focus,
reopening routes or restoring cancelled previews. Keep localized unsaved disclosure, stable
layout, field/IME priority, browser-owned touch and equal normal/reduced-motion semantics.
MIG-E02/E04/E11 and MIG-UI-01/09 apply. Physical-device and accessibility evidence remain
separate from synthetic input, source review and eventual final-frame parity.

Scoped designer recheck on2026-10-22 used production B9GGOEeT / editor QxntagEX. The Ukrainian
320px dark presentation at200% text now keeps the focused Width control and numeric value visible.
Normal-motion first-ready drawing, immediate A→B, pan alignment/Escape restoration, Back/Resume
and focus passed the reviewed behavior. Active-pan captures showed rougher stroke edges than
the stationary frame; transient visual fidelity remains unresolved and is not a pass.
This does not certify subsequent scheduling builds, complete M03 performance,
physical Wacom input, assistive technology or Ukrainian linguistic quality. Final changed-build
review and the remaining resource/failure acceptance still apply.
