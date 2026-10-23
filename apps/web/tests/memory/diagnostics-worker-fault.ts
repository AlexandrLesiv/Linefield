/** Browser-only E2E fault: fail one real request before its first page, after two admissions. */
export function failConcurrentPreparation(): void {
  const Original = Worker;
  let failed = false;
  class FaultWorker extends Original {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      let first: bigint | undefined, second: bigint | undefined;
      let pending: MessageEvent<unknown> | undefined;
      let receive: ((event: MessageEvent<unknown>) => void) | null = null;
      const fail = () => {
        if (failed || first === undefined || second === undefined || !pending) return;
        failed = true;
        pending = undefined;
        document.body.dataset.fixtureFailedRequests = `${first},${second}`;
        receive?.call(
          this,
          new MessageEvent("message", { data: { kind: "failed", request: first } }),
        );
      };
      const property = Object.getOwnPropertyDescriptor(Original.prototype, "onmessage");
      Object.defineProperty(this, "onmessage", {
        configurable: true,
        set(handler: ((event: MessageEvent<unknown>) => void) | null) {
          receive = handler;
          property?.set?.call(this, (event: MessageEvent<unknown>) => {
            const value = event.data;
            if (
              !failed &&
              value &&
              typeof value === "object" &&
              "kind" in value &&
              value.kind === "page" &&
              "request" in value &&
              value.request === first
            ) {
              pending = event;
              fail();
            } else handler?.call(this, event);
          });
        },
      });
      Object.defineProperty(this, "postMessage", {
        configurable: true,
        value: (message: unknown, transfer?: Transferable[]) => {
          Reflect.apply(Original.prototype.postMessage, this, [message, transfer]);
          if (
            !failed &&
            message &&
            typeof message === "object" &&
            "kind" in message &&
            message.kind === "start" &&
            "request" in message &&
            typeof message.request === "bigint"
          ) {
            if (first === undefined) first = message.request;
            else if (message.request !== first && second === undefined) second = message.request;
            // A task turn preserves the real postMessage/start-observation ordering.
            if (pending) setTimeout(fail, 0);
          }
        },
      });
    }
  }
  window.Worker = FaultWorker;
}
