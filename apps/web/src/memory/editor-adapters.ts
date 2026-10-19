import type { MemoryView } from "./view.ts";
import type { EditorCommands } from "./pen-input.ts";
import { attachPenInput } from "./pen-input.ts";
import { attachViewportInput } from "./viewport-input.ts";
import { attachEditorControls } from "./editor-controls.ts";
import { attachRotationControls } from "./rotation-controls.ts";
import { attachZoomControls } from "./zoom-controls.ts";
import { observePointerLifecycle } from "./pointer-diagnostics.ts";
export function attachEditorAdapters(view: MemoryView, commands: EditorCommands) {
  const stopTrace = observePointerLifecycle(view.canvas, commands.read);
  const viewport = attachViewportInput(view.canvas, commands, view.pendingRelease);
  const input = attachPenInput(view.canvas, commands, view.pendingRelease);
  const controls = attachEditorControls(view.surface, commands);
  const zoom = attachZoomControls(view.surface, commands);
  const rotation = attachRotationControls(view.surface, commands);
  rotation.refresh();
  zoom.refresh();
  return {
    refresh() {
      viewport.sync();
      input.sync();
      controls.refresh();
      zoom.refresh();
      rotation.refresh();
    },
    dispose() {
      viewport.dispose();
      input.dispose();
      controls.dispose();
      zoom.dispose();
      rotation.dispose();
      stopTrace();
    },
  };
}
