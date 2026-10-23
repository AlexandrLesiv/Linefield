/** Nonmodal dismissal leaves the original outside pointer untouched. */
export function bindPanelDismissal(
  node: HTMLElement,
  isOpen: () => boolean,
  close: (restoreFocus: boolean) => void,
): () => void {
  const outside = (event: PointerEvent) => {
    if (isOpen() && event.target instanceof Node && !node.contains(event.target)) close(false);
  };
  const key = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["TEXTAREA", "SELECT"].includes(target.tagName) ||
        (target instanceof HTMLInputElement &&
          !["checkbox", "radio", "button"].includes(target.type)))
    )
      return;
    event.stopPropagation();
    close(true);
  };
  node.addEventListener("keydown", key);
  document.addEventListener("pointerdown", outside, true);
  return () => {
    node.removeEventListener("keydown", key);
    document.removeEventListener("pointerdown", outside, true);
  };
}
