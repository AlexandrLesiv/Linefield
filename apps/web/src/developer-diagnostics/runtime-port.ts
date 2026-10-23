import { DiagnosticsStore } from "./store.ts";
import { buildIdentity } from "./build-identity.ts";
import { commands, diagnosticIdentity } from "./schema.ts";
import type { DiagnosticEvent } from "./schema.ts";
import { currentIntent } from "./intent.ts";
import type { ReplyValue, StateValue } from "../memory/bridge.ts";
import type { DiagnosticAvailability } from "./host.ts";
import { sameAvailability } from "./host.ts";
import { inputCommandObserved } from "./callback-observation.ts";
import type { Status } from "../memory/view.ts";
import { sourceMetric, resetMetrics } from "./runtime-metrics.ts";
export const diagnosticsStore = new DiagnosticsStore(buildIdentity);
let current: ReplyValue | undefined;
let ready = false,
  terminal = false,
  visible = false,
  interactionEpoch = 0;
let request = 0n;
let lastStatus: Status | undefined;
let listener: ((value: DiagnosticAvailability) => void) | undefined;
let lastAvailability: DiagnosticAvailability | undefined;
export function availability(): DiagnosticAvailability {
  return { idle: terminal || !current?.interaction, ready, terminal, visible, interactionEpoch };
}
function notify() {
  const value = availability();
  if (lastAvailability && sameAvailability(lastAvailability, value)) return;
  lastAvailability = value;
  try {
    listener?.(value);
  } catch {
    diagnosticsStore.sinkFailure();
  }
}
export function attachObserver(next: (value: DiagnosticAvailability) => void): () => void {
  listener = next;
  lastAvailability = undefined;
  visible = !document.hidden;
  notify();
  return () => {
    if (listener === next) {
      listener = undefined;
      visible = false;
    }
  };
}
export function observeReply(command: string, reply: ReplyValue) {
  try {
    recordReply(command, reply);
  } catch {
    diagnosticsStore.sinkFailure();
  }
}
function recordReply(command: string, reply: ReplyValue) {
  const previous = current;
  if (reply.code === "ok" || reply.code === "noop") {
    if (current?.session !== reply.session) resetMetrics();
    if (reply.interaction && reply.interaction !== current?.interaction) interactionEpoch++;
    if (
      current?.session !== reply.session ||
      current?.content !== reply.content ||
      current?.mapping !== reply.mapping ||
      current?.scene !== reply.scene
    )
      sourceMetric("pendingState");
    current = reply;
    notify();
  }
  const name = commands.find((value) => value === command);
  if (!name) return;
  if (name === "presented") return;
  if (
    [
      "begin",
      "append",
      "end",
      "cancel",
      "pan.begin",
      "pan.update",
      "pan.end",
      "rotate.begin",
      "rotate.update",
      "rotate.end",
    ].includes(name)
  )
    inputCommandObserved();
  const detailed = ["append", "pan.update", "rotate.update"].includes(name);
  if (detailed && !diagnosticsStore.capturing) return;
  request++;
  const outcome =
    reply.code === "ok"
      ? "accepted"
      : reply.code === "noop"
        ? "completed"
        : reply.code.startsWith("stale")
          ? "stale"
          : "rejected";
  diagnosticsStore.record(
    {
      event: "command.result",
      atMs: performance.now(),
      command: name,
      outcome,
      ...identity(reply),
      ...((name === "end" || name === "cancel" || name.endsWith(".end")) &&
      previous?.session === reply.session &&
      previous.interaction
        ? { interaction: previous.interaction.toString(10) }
        : {}),
      request: request.toString(10),
      ...(currentIntent() ?? { origin: "lifecycle" }),
    },
    detailed,
  );
}
export function identity(
  reply: ReplyValue,
): Pick<DiagnosticEvent, "session" | "interaction" | "revision" | "scene" | "mapping"> {
  const value: Partial<
    Record<"session" | "interaction" | "revision" | "scene" | "mapping", string>
  > = {};
  for (const [key, input] of [
    ["session", reply.session],
    ["interaction", reply.interaction],
    ["revision", reply.content],
    ["scene", reply.scene],
    ["mapping", reply.mapping],
  ] as const) {
    const id = diagnosticIdentity(input);
    if (id !== undefined) value[key] = id;
  }
  return value;
}
export function observeState(state: StateValue) {
  ready = state.phase === "ready" && state.canBeginInk;
  observeReply("read", state);
}
export function observeStatus(status: Status) {
  try {
    recordStatus(status);
  } catch {
    diagnosticsStore.sinkFailure();
  }
}
function recordStatus(status: Status) {
  if (lastStatus === status) return;
  const previous = lastStatus;
  lastStatus = status;
  terminal ||= status === "fatal";
  if (status !== "ready") {
    ready = false;
    sourceMetric("unavailable");
  }
  const failed =
    status === "displayLost" ||
    status === "resourceUnavailable" ||
    status === "fatal" ||
    status === "loadFailed";
  const recovered = status === "ready" && previous !== "loading" && previous !== undefined;
  if (failed || recovered)
    diagnosticsStore.record({
      event: recovered
        ? "surface.recovered"
        : status === "displayLost"
          ? "surface.lost"
          : "resource.failure",
      atMs: performance.now(),
      origin: "renderer",
      outcome: recovered ? "completed" : "failed",
      failure: recovered
        ? "none"
        : status === "displayLost"
          ? "context"
          : status === "resourceUnavailable"
            ? "allocation"
            : "internal",
      ...(current ? identity(current) : {}),
    });
  notify();
}
export function observeVisibility(value: boolean) {
  visible = value;
  notify();
}
export function isCurrent(reply: ReplyValue): boolean {
  return (
    current?.session === reply.session &&
    current.content === reply.content &&
    current.scene === reply.scene &&
    current.mapping === reply.mapping &&
    !terminal
  );
}
