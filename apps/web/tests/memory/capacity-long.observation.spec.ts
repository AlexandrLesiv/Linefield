import { test, expect } from "@playwright/test";
import { heldPrefix, unfinished, releaseHistory, drainCapacity } from "./capacity-setup.ts";
import { complete, clear } from "./observed-frame.ts";
for (const packed of [false, true]) {
  test(`MIG-WORKER-29 held historical prefix streams beyond 768 chunks (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    test.setTimeout(45000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await heldPrefix(page, packed);
    const clip = { x: 880, y: 680, width: 60, height: 60 };
    const blank = await page.screenshot({ clip });
    await page.locator("canvas").evaluate((canvas) =>
      canvas.addEventListener(
        "pointerdown",
        (e) => {
          if (e instanceof PointerEvent)
            document.documentElement.dataset.capacityPointer = `${e.pointerId}`;
        },
        { once: true },
      ),
    );
    await page.mouse.move(250, 600);
    await page.mouse.down();
    // Generated coalesced actual-handler input; not a physical pen or timing measurement.
    const proof = await page.evaluate(async () => {
      const canvas = document.querySelector("canvas");
      if (!canvas) throw Error("canvas missing");
      let dropped = 0,
        stable = 0,
        count = 0;
      for (let from = 1; from <= 98816; from += 256) {
        const points = Array.from(
          { length: 256 },
          (_, j) =>
            new PointerEvent("pointermove", {
              pointerId: Number(document.documentElement.dataset.capacityPointer),
              pointerType: "mouse",
              isPrimary: true,
              buttons: 1,
              clientX: 250 + ((from + j) % 1000) * 0.5,
              clientY: 600 + Math.sin((from + j) * 0.01) * 40,
              bubbles: true,
            }),
        );
        const event = points.at(-1);
        if (!event) throw Error("batch");
        Object.defineProperty(event, "getCoalescedEvents", { value: () => points });
        canvas.dispatchEvent(event);
        await new Promise(requestAnimationFrame);
        const snapshot = window["__linefieldPerfRead"]?.();
        if (!snapshot) throw Error("observation");
        dropped += snapshot.dropped;
        for (const r of snapshot.records) {
          if (r.kind === "live-tail" && r.phase === "stable")
            stable = Math.max(stable, Number(r.through));
          if (r.kind === "stroke-count" && r.active) count = Math.max(count, Number(r.count));
        }
      }
      return { dropped, stable, count };
    });
    await info.attach("held-functional-source-progress", {
      body: JSON.stringify(proof),
      contentType: "application/json",
    });
    expect(proof.dropped).toBe(0);
    expect(proof.count).toBe(98817);
    expect(proof.stable).toBeGreaterThan(98304);
    await page.mouse.move(900, 700);
    await expect.poll(async () => (await page.screenshot({ clip })).equals(blank)).toBe(false);
    await unfinished(page);
    await page.mouse.up();
    await releaseHistory(page);
    await complete(page);
    const settled = await page.screenshot({ clip });
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page, true);
    expect((await page.screenshot({ clip })).equals(settled)).toBe(true);
    expect(errors).toEqual([]);
    await drainCapacity(page);
  });
}
