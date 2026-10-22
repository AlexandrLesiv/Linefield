// Background tabs must not spin a GPU queue or consume a no-progress deadline.
export function gpuTurn(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let frame = 0;
    const clear = () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visible);
      signal.removeEventListener("abort", aborted);
    };
    const done = () => {
      clear();
      resolve();
    };
    const aborted = () => {
      clear();
      reject(Error("disposed"));
    };
    const visible = () => {
      if (document.visibilityState !== "hidden") done();
    };
    if (signal.aborted) {
      aborted();
      return;
    }
    signal.addEventListener("abort", aborted, { once: true });
    if (document.visibilityState !== "hidden") frame = requestAnimationFrame(done);
    else document.addEventListener("visibilitychange", visible);
  });
}
