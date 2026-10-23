export const preparationCauses = [
  "timeout",
  "cancelled",
  "disposed",
  "malformed-response",
  "worker-error",
  "message-error",
  "worker-failed",
  "dispatch-unavailable",
  "dispatch-failed",
  "capacity",
  "preparation-failed",
  "cleanup-failed",
  "stale",
] as const;
export type PreparationCause = (typeof preparationCauses)[number];
export const cancellation = (cause: PreparationCause) =>
  cause === "cancelled" || cause === "disposed";
