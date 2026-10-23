import type { ReplyValue } from "./bridge.ts";
import type { FrameWake } from "./frame-wake.ts";
import { append } from "./performance-observation.ts";
export type FillReason = "ready" | "pending" | "budget" | "done";
export type AdmissionSnapshot = {
  queued: number;
  bytes: number;
  useful: boolean;
  done: boolean;
  stopped: boolean;
  oldest: number;
  reason: FillReason;
};
export async function admitFrame(
  read: () => AdmissionSnapshot,
  wake: FrameWake,
  state: ReplyValue,
  receipt: bigint,
) {
  const entered = performance.now();
  let snapshot = read(),
    reason = "error",
    waits = 0;
  try {
    for (;;) {
      snapshot = read();
      if (snapshot.stopped) {
        reason = "stopped";
        return false;
      }
      if (snapshot.done) {
        reason = "done";
        return snapshot.queued > 0;
      }
      if (snapshot.useful) {
        if (snapshot.queued >= 32 || snapshot.bytes > 1024 ** 2 - 24576) reason = "full";
        else if (snapshot.reason !== "pending") reason = snapshot.reason;
        else if (performance.now() >= snapshot.oldest + 8) reason = "age";
        else reason = "pending";
        if (reason !== "pending") return true;
      }
      waits++;
      // Pure group markers have no useful work and never arm an expired deadline.
      await wake.wait(snapshot.useful ? snapshot.oldest + 8 - performance.now() : undefined);
    }
  } catch (error) {
    reason = "error";
    throw error;
  } finally {
    if (import.meta.env.MODE === "performance-e2e") {
      const now = performance.now();
      append({
        kind: "frame-admission",
        owner: `${state.owner}`,
        session: `${state.session}`,
        receipt: `${receipt}`,
        reason,
        queued: snapshot.queued,
        bytes: snapshot.bytes,
        useful: snapshot.useful,
        producer: snapshot.reason,
        oldest: snapshot.oldest,
        entered,
        time: now,
        age: snapshot.queued ? now - snapshot.oldest : 0,
        overshoot: reason === "age" ? Math.max(0, now - snapshot.oldest - 8) : 0,
        waits,
        peakSubscriptions: wake.peakWaiters,
        peakTimers: wake.peakTimers,
        subscriptions: wake.subscriptions,
        timers: wake.timerCount,
      });
    }
  }
}
