// One idle preparation slice, with an explicit wake-up for exit flushing.
export function idleYield(urgent: () => boolean) {
  let wake: (() => void) | undefined;
  return {
    wake: () => wake?.(),
    wait: () =>
      new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          wake = undefined;
          resolve();
        };
        if (urgent() || !window.requestIdleCallback) setTimeout(finish, 0);
        else {
          const id = requestIdleCallback(finish, { timeout: 50 });
          wake = () => {
            cancelIdleCallback(id);
            setTimeout(finish, 0);
          };
        }
      }),
  };
}
