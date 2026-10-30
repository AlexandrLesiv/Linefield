/** Host event ordering only. Rust remains the owner of stroke transactions. */
export class PointerRelease {
  private retired = new Set<number>();
  private latest = 0;
  private contact: {
    id: number;
    source: string;
    primary: boolean;
    started: number;
    pendingAt: number | null;
  } | null = null;
  begin(event: PointerEvent): void {
    this.retired.clear();
    this.latest = event.timeStamp;
    this.contact = {
      id: event.pointerId,
      source: event.pointerType,
      primary: event.isPrimary,
      started: event.timeStamp,
      pendingAt: null,
    };
  }
  get pending(): boolean {
    return this.contact?.pendingAt !== null && this.contact !== null;
  }
  get identityRecovery() {
    return { retired: this.retired.size, limitReached: this.retired.size >= 64 };
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
  isNewContact(event: PointerEvent): boolean {
    const contact = this.contact;
    return (
      !!contact &&
      contact.primary &&
      ["pen", "mouse"].includes(contact.source) &&
      event.pointerType === contact.source &&
      event.isPrimary &&
      event.button === 0 &&
      event.buttons === 1 &&
      event.timeStamp > this.latest
    );
  }
  isNewDevice(event: PointerEvent): boolean {
    const contact = this.contact;
    return (
      !!contact &&
      contact.pendingAt !== null &&
      contact.primary &&
      ["pen", "mouse"].includes(contact.source) &&
      ["pen", "mouse"].includes(event.pointerType) &&
      event.pointerType !== contact.source &&
      event.isPrimary &&
      event.type === "pointerdown" &&
      event.button === 0 &&
      event.buttons === 1 &&
      event.timeStamp > this.latest &&
      event.timeStamp > contact.pendingAt
    );
  }
  observe(event: PointerEvent): void {
    if (this.matches(event)) this.latest = Math.max(this.latest, event.timeStamp);
  }
  transitionPen(event: PointerEvent): boolean {
    const contact = this.contact;
    if (
      !contact ||
      contact.source !== "pen" ||
      !contact.primary ||
      this.pending ||
      event.pointerType !== "pen" ||
      !event.isPrimary ||
      (event.buttons & 1) === 0 ||
      event.pointerId === contact.id ||
      this.retired.has(event.pointerId) ||
      this.retired.size >= 64 ||
      event.timeStamp <= this.latest
    )
      return false;
    this.retired.add(contact.id);
    contact.id = event.pointerId;
    contact.started = event.timeStamp;
    this.latest = event.timeStamp;
    return true;
  }
  clear(): void {
    this.contact = null;
    this.retired.clear();
  }
}
