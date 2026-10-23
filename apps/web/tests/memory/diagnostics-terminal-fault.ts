export type PreparationFault =
  | "timeout"
  | "cancel"
  | "midstream"
  | "armed-midstream"
  | "preadmission";
/** Isolated browser fault at the real Worker boundary; never imported by the application. */
export function preparationFault(mode: PreparationFault): void {
  const Original = Worker;
  let armed = mode !== "armed-midstream";
  const midstream = mode === "midstream" || mode === "armed-midstream";
  document.addEventListener(
    "fixture-worker-midstream-arm",
    () => {
      armed = true;
    },
    { once: true },
  );
  let chosen = false;
  class FaultWorker extends Original {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      const selected = !chosen;
      chosen = true;
      const requests: bigint[] = [];
      let receive: ((event: MessageEvent<unknown>) => void) | null = null;
      let first: bigint | undefined;
      let failed = false;
      const property = Object.getOwnPropertyDescriptor(Original.prototype, "onmessage");
      Object.defineProperty(this, "onmessage", {
        configurable: true,
        set(handler: ((event: MessageEvent<unknown>) => void) | null) {
          receive = handler;
          property?.set?.call(this, (event: MessageEvent<unknown>) => {
            const value = event.data;
            if (selected && value && typeof value === "object" && "kind" in value) {
              if (mode === "preadmission" && value.kind === "ready") {
                document.body.dataset.fixtureReadyHeld = "true";
                return;
              }
              if ((mode === "timeout" || mode === "cancel") && value.kind === "page") return;
              if (
                armed &&
                midstream &&
                value.kind === "page" &&
                first === undefined &&
                "request" in value &&
                typeof value.request === "bigint"
              ) {
                first = value.request;
                document.body.dataset.fixtureMidstream = first.toString();
                handler?.call(
                  this,
                  new MessageEvent("message", { data: { ...value, done: false } }),
                );
                return;
              }
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
            !selected ||
            !message ||
            typeof message !== "object" ||
            !("kind" in message) ||
            !("request" in message) ||
            typeof message.request !== "bigint"
          )
            return;
          if (message.kind === "start" && requests.length < 2) {
            requests.push(message.request);
            if (requests.length === 2)
              document.body.dataset.fixtureHeldRequests = requests.join(",");
          }
          if (
            armed &&
            midstream &&
            !failed &&
            message.kind === "next" &&
            message.request === first
          ) {
            failed = true;
            queueMicrotask(() =>
              receive?.call(
                this,
                new MessageEvent("message", { data: { kind: "failed", request: first } }),
              ),
            );
          }
        },
      });
    }
  }
  window.Worker = FaultWorker;
}
