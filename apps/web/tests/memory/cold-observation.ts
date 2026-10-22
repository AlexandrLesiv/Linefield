import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
export type ColdRecord = Readonly<Record<string, string | number | boolean>>;
export async function readCold(page: Page) {
  const value = await page.evaluate(() => window["__linefieldPerfRead"]?.());
  if (!value) throw Error("observation build required");
  expect(value.dropped).toBe(0);
  return value.records;
}
export function checkAdmissions(records: readonly ColdRecord[]) {
  const gates = records.filter((r) => r.kind === "frame-admission");
  expect(gates.length).toBeGreaterThan(0);
  for (const r of gates) {
    expect(Number(r.queued)).toBeLessThanOrEqual(32);
    expect(Number(r.bytes)).toBeLessThanOrEqual(1024 ** 2);
    expect(Number(r.peakSubscriptions)).toBeLessThanOrEqual(2);
    expect(Number(r.peakTimers)).toBeLessThanOrEqual(1);
    expect(Number(r.timers)).toBe(0);
    if (r.reason === "age") {
      expect(r.useful).toBe(true);
      expect(r.producer).toBe("pending");
      expect(Number(r.age)).toBeGreaterThanOrEqual(8);
    }
  }
  return gates;
}
export async function holdColdReplies(page: Page) {
  await page.addInitScript(() => {
    const Original = Worker;
    const held: { worker: Worker; data: unknown }[] = [];
    let replaying = false;
    const report = () => {
      document.documentElement.dataset.coldHeld = `${held.length}`;
    };
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event: MessageEvent<unknown>) => {
          const data = event.data;
          if (replaying || document.documentElement.dataset.coldHold !== "true") return;
          if (data && typeof data === "object" && "kind" in data && data.kind === "page") {
            event.stopImmediatePropagation();
            if (held.length >= 8) throw Error("cold reply bound");
            held.push({ worker: this, data });
            report();
          }
        });
      }
      override terminate() {
        for (let i = held.length - 1; i >= 0; i--) if (held[i]?.worker === this) held.splice(i, 1);
        report();
        super.terminate();
      }
    };
    document.addEventListener("cold-release", () => {
      const count = Number(document.documentElement.dataset.coldRelease ?? 8);
      replaying = true;
      try {
        for (const { worker, data } of held.splice(0, count))
          worker.dispatchEvent(new MessageEvent("message", { data }));
      } finally {
        replaying = false;
        report();
      }
    });
  });
}
export async function releaseCold(page: Page, count = 8, finish = false) {
  await page.evaluate(
    (value) => {
      if (value.finish) document.documentElement.dataset.coldHold = "false";
      document.documentElement.dataset.coldRelease = `${value.count}`;
      document.dispatchEvent(new Event("cold-release"));
    },
    { count, finish },
  );
}
export async function coldSource(page: Page, count = 8192) {
  await page.locator("canvas").evaluate((canvas) => {
    canvas.addEventListener(
      "pointerdown",
      (event) => {
        if (event instanceof PointerEvent)
          document.documentElement.dataset.coldPointer = `${event.pointerId}`;
      },
      { once: true },
    );
  });
  await page.mouse.move(250, 350);
  await page.mouse.down();
  const records: ColdRecord[] = [];
  // Bounded synthetic coalesced setup through the actual handler, not physical pen evidence.
  for (let offset = 1; offset <= count; offset += 256) {
    await page.evaluate((start) => {
      const canvas = document.querySelector("canvas");
      if (!canvas) throw Error("canvas missing");
      const samples: PointerEvent[] = [];
      for (let i = start; i < start + 256; i++)
        samples.push(
          new PointerEvent("pointermove", {
            pointerId: Number(document.documentElement.dataset.coldPointer),
            pointerType: "mouse",
            isPrimary: true,
            buttons: 1,
            clientX: 250 + (i % 1000) * 0.5,
            clientY: 350 + Math.sin(i * 0.01) * 60,
            bubbles: true,
          }),
        );
      const event = samples.at(-1);
      if (!event) throw Error("empty batch");
      Object.defineProperty(event, "getCoalescedEvents", { value: () => samples });
      canvas.dispatchEvent(event);
    }, offset);
    records.push(...(await readCold(page)));
  }
  await page.evaluate((last) => {
    document.querySelector("canvas")?.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: Number(document.documentElement.dataset.coldPointer),
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 0,
        clientX: 250 + (last % 1000) * 0.5,
        clientY: 350 + Math.sin(last * 0.01) * 60,
        bubbles: true,
      }),
    );
  }, count);
  await page.mouse.up();
  return records;
}
