/** Keep the menu's nearest corner while fitting the keyboard-visible viewport. */
export function placeRename(dialog: HTMLDialogElement, source: DOMRect): DOMRect {
  const viewport = window.visualViewport;
  const left = (viewport?.offsetLeft ?? 0) + 16;
  const top = (viewport?.offsetTop ?? 0) + 16;
  const width = Math.max(1, (viewport?.width ?? innerWidth) - 32);
  const height = Math.max(1, (viewport?.height ?? innerHeight) - 32);
  Object.assign(dialog.style, {
    position: "fixed",
    margin: "0",
    inset: "auto",
    width: `${Math.min(360, width)}px`,
    maxWidth: `${width}px`,
    maxHeight: `${height}px`,
    height: "auto",
    overflow: "auto",
  });
  const bounds = dialog.getBoundingClientRect();
  const alignRight = source.left + source.width / 2 > left + width / 2;
  const alignBottom = source.top + source.height / 2 > top + height / 2;
  const x = alignRight ? source.right - bounds.width : source.left;
  const y = alignBottom ? source.bottom - bounds.height : source.top;
  dialog.style.left = `${Math.max(left, Math.min(x, left + width - bounds.width))}px`;
  dialog.style.top = `${Math.max(top, Math.min(y, top + height - bounds.height))}px`;
  return dialog.getBoundingClientRect();
}
