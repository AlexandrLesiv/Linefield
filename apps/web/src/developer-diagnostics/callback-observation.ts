let mark: (() => void) | undefined;
/** A single synchronous pointer callback, including acquisition and its editor commands. */
export function inputCommandObserved(): void {
  mark?.();
}
export function observeInputCallback<T>(action: () => T, finish: (observed: boolean) => void): T {
  const previous = mark;
  let observed = false;
  mark = () => {
    observed = true;
  };
  try {
    return action();
  } finally {
    mark = previous;
    finish(observed);
  }
}
