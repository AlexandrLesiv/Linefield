export type EpochFault = "fallback" | "replacement" | "paused";
/** Real Worker boundary faults; the application still owns every job and ticket. */
export function preparationEpochFault(mode: EpochFault): void {
  const Original = Worker;
  let serial = 0;
  class FaultWorker extends Original {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      const ordinal = ++serial;
      const requests: string[] = [];
      let failed = false;
      const fault = () => {
        if (failed) return;
        failed = true;
        this.onerror?.call(this, new ErrorEvent("error"));
        document.body.dataset.fixtureEpochFailure = ordinal.toString();
      };
      document.addEventListener("fixture-worker-error", fault, { once: true });
      const terminate = this.terminate.bind(this);
      this.terminate = () => {
        document.removeEventListener("fixture-worker-error", fault);
        terminate();
      };
      const property = Object.getOwnPropertyDescriptor(Original.prototype, "onmessage");
      Object.defineProperty(this, "onmessage", {
        configurable: true,
        set(handler: ((event: MessageEvent<unknown>) => void) | null) {
          property?.set?.call(this, (event: MessageEvent<unknown>) => {
            const value = event.data;
            if (
              mode !== "paused" &&
              ordinal === 1 &&
              !failed &&
              value &&
              typeof value === "object" &&
              "kind" in value &&
              value.kind === "page"
            ) {
              fault();
              return;
            }
            handler?.call(this, event);
          });
        },
      });
      Object.defineProperty(this, "postMessage", {
        configurable: true,
        value: (message: unknown, transfer?: Transferable[]) => {
          Reflect.apply(Original.prototype.postMessage, this, [message, transfer]);
          if (
            ordinal > 1 &&
            requests.length < 8 &&
            message &&
            typeof message === "object" &&
            "kind" in message &&
            message.kind === "start" &&
            "request" in message &&
            typeof message.request === "bigint"
          ) {
            requests.push(message.request.toString());
            document.body.dataset.fixtureReplacementRequests = requests.join(",");
          }
        },
      });
    }
  }
  window.Worker = FaultWorker;
}
