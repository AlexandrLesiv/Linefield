import type { Page } from "@playwright/test";

export async function holdPreparationReplies(page: Page) {
  await page.addInitScript(() => {
    const Original = Worker;
    const held: { worker: Worker; data: unknown }[] = [];
    let terminated = 0;
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event: MessageEvent<unknown>) => {
          const data = event.data;
          if (
            document.documentElement.dataset.holdReplies === "true" &&
            data &&
            typeof data === "object" &&
            "kind" in data &&
            data.kind === "page"
          ) {
            event.stopImmediatePropagation();
            if (held.length >= 8) throw Error("held reply bound");
            held.push({ worker: this, data });
            document.documentElement.dataset.heldReplies = `${held.length}`;
          }
        });
      }
      override terminate() {
        document.documentElement.dataset.terminatedWorkers = `${++terminated}`;
        // Only the obsolete executor is held; reconstruction may start a new worker.
        document.documentElement.dataset.holdReplies = "false";
        return super.terminate();
      }
    };
    document.addEventListener("release-held-preparation", () => {
      document.documentElement.dataset.holdReplies = "false";
      for (const { worker, data } of held.splice(0))
        worker.dispatchEvent(new MessageEvent("message", { data }));
      document.documentElement.dataset.heldReplies = "0";
    });
  });
}
