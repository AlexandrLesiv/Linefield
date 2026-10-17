/** URL presentation only; drawing availability remains owned by the gallery. */
export function drawingRoute(): string | null {
  const match = /^\/drawing\/([a-z0-9-]+)$/.exec(location.pathname);
  return match?.[1] ?? null;
}

export function openRoute(id: string): void {
  const path = "/drawing/" + encodeURIComponent(id);
  if (location.pathname !== path)
    history.pushState({ linefieldDrawing: true }, "", path + location.search);
}

export function galleryRoute(): void {
  history.replaceState(null, "", "/" + location.search);
}

/** Direct links need an in-app Back destination; reload keeps an existing entry. */
export function initializeRoute(knownIds: readonly string[]): void {
  const id = drawingRoute();
  if (!id || !knownIds.includes(id)) {
    galleryRoute();
    return;
  }
  if (!history.state?.linefieldDrawing) {
    galleryRoute();
    openRoute(id);
  } else if (location.hash) {
    history.replaceState(history.state, "", location.pathname + location.search);
  }
}
