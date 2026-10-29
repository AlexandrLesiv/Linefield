# UI-01 — unclutter the integrated editor

Owner approved the annotated screenshot on 2026-10-30. Branch codex/editor-ui-cleanup
starts at SAVE-07 checkpoint 3fd1b73; capacity work is held separately. No merge.

Remove the visible host Back/title/storage header and Pan, Rotate, rotation reset,
Undo, Redo and view reset buttons. Preserve commands and input semantics. The existing
Linefield wordmark returns to the gallery through the save/leave guard. Keyboard
Undo/Redo, Space-pan, R-rotate and wheel zoom remain; 0 resets view and Shift+0 resets
rotation when canvas controls have focus.

Gear opens localized settings with Pressure, Paper and Grid. Ctrl+Alt+D opens developer
tools with save status/actions, render counters and existing bounded input-log export.
Panels overlay without resizing canvas, close with Escape and restore focus. They cannot
open during the editor's active pointer transaction. Text input, IME and AltGraph retain
priority. Saving/rendering errors mark the gear and expose recovery in Settings without
stealing drawing focus. Controlled exit retains its Stay/Escape cancellation path.

Keep all frozen previews unchanged and open a new frozen preview. No drawing/rendering,
quality, persistence schema, accepted-input or Rust semantics changes. EN/UK, light/dark,
narrow layouts and keyboard access must pass designer review; independent review covers
navigation, failures and input lifetimes. E2E behavior plus static/build checks only.

## Validation checkpoint

Frozen preview65357 passes15 focused UI/browser checks. Designer reviewed8 locale/theme/viewport
contexts. Independent recovery checks passed secondary-pointer safety, same-ID resume and
Escape cancellation during held saving. GPU fault injection reached exhausted Retry and
visible attention without focus theft, but the full retry/parity run terminated (exit137);
complete GPU recovery parity is not claimed. Retain the runnable recovery test for follow-up.
Root static/types/localization/format and editor/web builds pass. Existing previews unchanged.
