/** Fixed-size, content-free counters. Repeated move delivery is counted even when
 * the lifecycle ring deduplicates its entries. No drawing samples are retained. */
function counters() {
  return {
    documentEvents: 0,
    coalescedSamples: 0,
    documentMoves: 0,
    ownerMoves: 0,
    foreignMoves: 0,
    appMoves: 0,
    handledMoves: 0,
    rejectedMoves: 0,
    acceptedSamples: 0,
    rejectedSamples: 0,
  };
}
type Counter = keyof ReturnType<typeof counters>;
export class InputTraffic {
  private total = counters();
  private current = counters();
  private sources = { pen: counters(), mouse: counters(), other: counters() };
  private lastAcceptedAt: number | null = null;
  private owner: { id: number; type: string } | null = null;
  private lastOwnerAt: number | null = null;
  private lastOwnerMoveAt: number | null = null;
  private lastOwnerKind: string | null = null;
  private rejection: string | null = null;
  private moveTransition = "";
  begin(event: PointerEvent): void {
    this.current = counters();
    this.lastAcceptedAt = null;
    this.lastOwnerMoveAt = null;
    this.rejection = null;
    this.moveTransition = "";
    this.adopt(event);
  }
  adopt(event: PointerEvent): void {
    this.owner = { id: event.pointerId, type: event.pointerType };
    this.lastOwnerAt = performance.now();
    this.lastOwnerKind = event.type;
    if (event.type === "pointermove") this.lastOwnerMoveAt = this.lastOwnerAt;
  }
  end(): void {
    this.owner = null;
  }
  private count(key: Counter, source = this.owner?.type, amount = 1): void {
    this.total[key] += amount;
    this.current[key] += amount;
    this.sources[source === "pen" || source === "mouse" ? source : "other"][key] += amount;
  }
  get identity() {
    return this.owner ? { ...this.owner } : null;
  }
  coalesced(count: number): void {
    this.count("coalescedSamples", this.owner?.type, count);
  }
  document(event: PointerEvent): void {
    this.count("documentEvents", event.pointerType);
    const owned = this.owner?.id === event.pointerId && this.owner.type === event.pointerType;
    if (owned) {
      this.lastOwnerAt = performance.now();
      this.lastOwnerKind = event.type;
      if (event.type === "pointermove") this.lastOwnerMoveAt = this.lastOwnerAt;
    }
    if (event.type !== "pointermove") return;
    this.count("documentMoves", event.pointerType);
    if (owned) this.count("ownerMoves", event.pointerType);
    else if (this.owner) this.count("foreignMoves", event.pointerType);
  }
  sample(accepted: boolean): void {
    if (accepted) this.lastAcceptedAt = performance.now();
    this.count(accepted ? "acceptedSamples" : "rejectedSamples");
  }
  move(event: PointerEvent, reason: string | null): boolean {
    this.count("appMoves", event.pointerType);
    this.count(reason ? "rejectedMoves" : "handledMoves", event.pointerType);
    this.rejection = reason;
    const transition = `${event.pointerId}:${event.pointerType}:${reason ?? "handled"}`;
    if (transition === this.moveTransition) return false;
    this.moveTransition = transition;
    return true;
  }
  snapshot() {
    return {
      total: { ...this.total },
      sources: {
        pen: { ...this.sources.pen },
        mouse: { ...this.sources.mouse },
        other: { ...this.sources.other },
      },
      sinceGestureBegin: { ...this.current },
      owner: this.owner ? { ...this.owner } : null,
      lastOwnerMoveAgeMs:
        this.lastOwnerMoveAt === null ? null : performance.now() - this.lastOwnerMoveAt,
      lastOwnerEventAgeMs: this.lastOwnerAt === null ? null : performance.now() - this.lastOwnerAt,
      lastAcceptedSampleAgeMs:
        this.lastAcceptedAt === null ? null : performance.now() - this.lastAcceptedAt,
      lastOwnerKind: this.lastOwnerKind,
      lastMoveRejection: this.rejection,
    };
  }
}
