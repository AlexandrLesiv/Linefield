// Operation failure can recover after verified cleanup; failed ownership release cannot.
// This type follows cleanup provenance, never an operation error's text.
export class CleanupFailure extends Error {
  constructor(cause: unknown) {
    super("cleanup-failed", { cause });
  }
}
export function cleanupSync<T>(action: () => T): T {
  try {
    return action();
  } catch (error) {
    throw error instanceof CleanupFailure ? error : new CleanupFailure(error);
  }
}
export function cleanupRelease(action: () => string) {
  cleanupSync(() => {
    const code = action();
    if (code !== "ok" && code !== "stale-session") throw Error(`release-${code}`);
  });
}
export async function cleanupAsync(action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    throw error instanceof CleanupFailure ? error : new CleanupFailure(error);
  }
}
export function finishCleanup(cleanup: () => void, settled: () => void, prior?: CleanupFailure) {
  let failure: unknown = prior;
  try {
    cleanupSync(cleanup);
  } catch (error) {
    failure ??= error;
  }
  try {
    settled();
  } catch (error) {
    failure ??= error;
  }
  if (failure) throw failure;
}
