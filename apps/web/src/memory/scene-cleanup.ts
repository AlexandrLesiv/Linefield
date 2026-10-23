// Run every host cleanup even when an earlier release fails. A rejected result is not
// proof of drained ownership; the retirement record retains the resource getter.
export async function cleanupScene(actions: readonly (() => void | Promise<void>)[]) {
  const pending: Promise<void>[] = [];
  let failure: unknown;
  for (const action of actions) {
    try {
      pending.push(Promise.resolve(action()));
    } catch (error) {
      failure ??= error;
    }
  }
  for (const result of await Promise.allSettled(pending))
    if (result.status === "rejected") failure ??= result.reason;
  if (failure) throw failure;
}
