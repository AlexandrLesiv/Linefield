import type { Page } from "@playwright/test";
export async function observeTraversal(page: Page) {
  await page.addInitScript(() => {
    const instantiate = WebAssembly.instantiateStreaming;
    WebAssembly.instantiateStreaming = async (source, imports) => {
      const result = await instantiate(source, imports);
      const exports = result.instance.exports;
      const prepare = exports.memoryFramePreparation,
        visibility = exports.memoryFrameVisibility,
        table = exports["__wbindgen_externrefs"];
      if (
        typeof prepare !== "function" ||
        typeof visibility !== "function" ||
        !(table instanceof WebAssembly.Table)
      )
        return result;
      const frames = new Map<
        string,
        {
          id: string;
          queries: number;
          preparations: number;
          visits: number;
          hulls: number;
          done: boolean;
        }
      >();
      const frameFor = (id: string) => {
        const frame = frames.get(id) ?? {
          id,
          queries: 0,
          preparations: 0,
          visits: 0,
          hulls: 0,
          done: false,
        };
        frames.set(id, frame);
        if (frames.size > 16) frames.delete(frames.keys().next().value ?? "");
        return frame;
      };
      const flush = () => {
        document.documentElement.dataset.traversal = JSON.stringify([...frames.values()]);
      };
      Object.defineProperty(result.instance, "exports", {
        value: {
          ...exports,
          memoryFramePreparation: (...args: unknown[]) => {
            const value: unknown = Reflect.apply(prepare, undefined, args);
            if (document.documentElement.dataset.trackTraversal === "true") {
              frameFor(String(args.at(-1))).preparations++;
              flush();
            }
            return value;
          },
          memoryFrameVisibility: (...args: unknown[]) => {
            const value: unknown = Reflect.apply(visibility, undefined, args);
            if (document.documentElement.dataset.trackTraversal === "true") {
              // Borrow only scalar metadata; the producer owns and consumes arrays.
              const snapshot: unknown =
                Array.isArray(value) && value[2] === 0 && typeof value[0] === "number"
                  ? table.get(value[0])
                  : undefined;
              if (
                snapshot &&
                typeof snapshot === "object" &&
                "code" in snapshot &&
                snapshot.code === "ok" &&
                "visitedNodes" in snapshot &&
                "constructedHulls" in snapshot &&
                "done" in snapshot
              ) {
                const frame = frameFor(String(args[3]));
                frame.queries++;
                frame.visits += Number(snapshot.visitedNodes);
                frame.hulls += Number(snapshot.constructedHulls);
                frame.done = snapshot.done === true;
                flush();
              }
            }
            return value;
          },
        },
      });
      return result;
    };
    const wait = WebGL2RenderingContext.prototype.clientWaitSync;
    WebGL2RenderingContext.prototype.clientWaitSync = function (sync, flags, timeout) {
      if (document.documentElement.dataset.holdGpu === "true") return this.TIMEOUT_EXPIRED;
      return wait.call(this, sync, flags, timeout);
    };
  });
}
export async function longSyntheticSource(page: Page) {
  await page.locator("canvas").evaluate((canvas) => {
    canvas.addEventListener(
      "pointerdown",
      (event) => {
        if (event instanceof PointerEvent)
          document.documentElement.dataset.pointer = `${event.pointerId}`;
      },
      { once: true },
    );
  });
  await page.mouse.move(250, 350);
  await page.mouse.down();
  // Synthetic coalesced stress setup through the real handler; not physical input evidence.
  await page.evaluate(async () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) throw Error("canvas missing");
    const pointerId = Number(document.documentElement.dataset.pointer);
    for (let offset = 1; offset <= 65536; offset += 256) {
      const samples: PointerEvent[] = [];
      for (let i = offset; i < offset + 256; i++)
        samples.push(
          new PointerEvent("pointermove", {
            pointerId,
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
      await new Promise(requestAnimationFrame);
    }
    document.documentElement.dataset.holdGpu = "true";
    document.documentElement.dataset.trackTraversal = "true";
    canvas.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 0,
        clientX: 250 + (65536 % 1000) * 0.5,
        clientY: 350 + Math.sin(65536 * 0.01) * 60,
        bubbles: true,
      }),
    );
  });
  await page.mouse.up();
}
