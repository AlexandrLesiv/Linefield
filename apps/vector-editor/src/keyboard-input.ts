/** Browser shortcut acquisition only. Commands mutate the owning editor, not
 * a second keyboard-specific document/history state.
 */
export interface KeyboardCommands {
  selectionToolActive(): boolean;
  escape(): void;
  deleteSelection(): void;
  setPanHeld(held: boolean): void;
  setRotationHeld(held: boolean): void;
  updateCursor(): void;
  history(redo: boolean): void;
}
export function installKeyboardInput(commands: KeyboardCommands): void {
  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.isComposing) return;
    if (e.key === "Escape") {
      commands.escape();
      return;
    }
    if (
      e.target instanceof HTMLElement &&
      (e.target.isContentEditable || e.target.closest("input, textarea, select, [role='textbox']"))
    )
      return;
    if (
      commands.selectionToolActive() &&
      (e.key === "Delete" || e.key === "Backspace") &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey
    ) {
      e.preventDefault();
      if (!e.repeat) commands.deleteSelection();
      return;
    }
    if (e.code === "KeyS" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      document.querySelector<HTMLButtonElement>("#slice")!.click();
    }
    if (e.code === "KeyV" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      document.querySelector<HTMLButtonElement>("#select")!.click();
    }
    if (e.code === "Space") {
      e.preventDefault();
      commands.setPanHeld(true);
      commands.updateCursor();
    }
    if (e.code === "KeyR" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      commands.setRotationHeld(true);
      commands.updateCursor();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      commands.history(e.shiftKey);
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") commands.setPanHeld(false);
    if (e.code === "KeyR") commands.setRotationHeld(false);
    commands.updateCursor();
  });
}
