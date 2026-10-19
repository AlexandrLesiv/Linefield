const observers = new WeakMap<HTMLElement, ResizeObserver>();
/** Reserve the actual compact action height, including translated/enlarged labels. */
export function creationClearance(root: HTMLElement, action: HTMLElement, grid: HTMLElement): void {
  observers.get(root)?.disconnect();
  const update = () => {
    const height = action.getBoundingClientRect().height;
    grid.style.setProperty(
      "--creation-clearance",
      height ? `${Math.ceil(height) + 48}px` : "110px",
    );
    const notice = root.parentElement?.querySelector<HTMLElement>(".prototype-label");
    if (notice) notice.style.paddingBottom = height ? `${Math.ceil(height) + 48}px` : "";
  };
  const observer = new ResizeObserver(update);
  observers.set(root, observer);
  observer.observe(action);
  update();
}
