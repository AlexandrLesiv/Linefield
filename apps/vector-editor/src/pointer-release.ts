/** Host event ordering only. Rust remains the owner of stroke transactions. */
export class PointerRelease {
  private contact: {
    id: number;
    source: string;
    started: number;
    pendingAt: number | null;
  } | null = null;
  begin(event: PointerEvent): void {
    this.contact = {
      id: event.pointerId,
      source: event.pointerType,
      started: event.timeStamp,
      pendingAt: null,
    };
  }
  get pending(): boolean {
    return this.contact?.pendingAt !== null && this.contact !== null;
  }
  matches(event: PointerEvent): boolean {
    const contact = this.contact;
    return (
      !!contact &&
      event.pointerId === contact.id &&
      event.pointerType === contact.source &&
      event.timeStamp >= contact.started
    );
  }
  defer(event: PointerEvent): boolean {
    if (
      !this.matches(event) ||
      event.buttons !== 0 ||
      !["mouse", "pen"].includes(event.pointerType)
    )
      return false;
    if (this.contact && this.contact.pendingAt === null) this.contact.pendingAt = event.timeStamp;
    return true;
  }
  canRelease(event: PointerEvent): boolean {
    return this.matches(event) && event.button >= 0 && event.buttons === 0;
  }
  clear(): void {
    this.contact = null;
  }
}
