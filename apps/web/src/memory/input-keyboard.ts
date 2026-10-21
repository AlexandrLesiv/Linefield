import { edit } from "./edit-bridge.ts";
import { editable } from "./input-state.ts";
import type { Commands } from "./input-state.ts";
export function inputKeyboard(commands: Commands, cancel: () => void) {
  const held = { space: false, rotate: false };
  return {
    held,
    reset() {
      held.space = held.rotate = false;
    },
    down(e: KeyboardEvent) {
      if (editable(e)) return;
      if (
        e.target instanceof Element &&
        e.target.closest("button,a,summary,[role=button],[role=menuitem]")
      )
        return;
      if (e.code === "Space") {
        held.space = true;
        e.preventDefault();
      }
      if (e.code === "KeyR" && !e.metaKey && !e.ctrlKey) {
        held.rotate = true;
        e.preventDefault();
      }
      if (e.key === "Escape") {
        cancel();
        e.preventDefault();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        commands.run((s) => edit.undo(s, e.shiftKey));
        e.preventDefault();
      }
    },
    up(e: KeyboardEvent) {
      if (e.code === "Space") held.space = false;
      if (e.code === "KeyR") held.rotate = false;
    },
  };
}
