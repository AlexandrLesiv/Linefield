export function pendingReleaseLoss(event: PointerEvent, canvas: HTMLCanvasElement, source: string) {
  return (
    event.isTrusted &&
    event.isPrimary &&
    ["mouse", "pen"].includes(source) &&
    event.pointerType === source &&
    event.target === canvas &&
    event.buttons === 0 &&
    event.button === -1
  );
}
export function pendingReleaseEnd(event: PointerEvent, source: string, since: number) {
  return (
    event.isTrusted &&
    event.isPrimary &&
    event.pointerType === source &&
    event.timeStamp >= since &&
    event.button === 0 &&
    event.buttons === 0
  );
}
