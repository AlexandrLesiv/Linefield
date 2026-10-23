import { test, expect } from "@playwright/test";
import { heldPrefix, releaseHistory, drainCapacity } from "./capacity-setup.ts";
import { complete, clear } from "./observed-frame.ts";
for (const packed of [false, true])
  test(`MIG-WORKER-31 sealed predecessor retains ended unfinished C until stable completion (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    await page.addInitScript(() => {
      const now = performance.now.bind(performance),
        raf = requestAnimationFrame;
      let offset = 0,
        calls = 0,
        pointer = 1;
      document.addEventListener(
        "pointerdown",
        (event) => {
          pointer = event.pointerId;
        },
        true,
      );
      Object.defineProperty(performance, "now", {
        value: () => {
          if (document.documentElement.dataset.holdEndedBudget === "true") {
            if (++calls > 512) throw Error("bounded ended budget fixture exhausted");
            offset += 3;
          }
          return now() + offset;
        },
      });
      window.requestAnimationFrame = (callback) =>
        raf((time) => {
          callback(time);
          const d = document.documentElement.dataset;
          if (d.armSealedEnd !== "true") return;
          const snapshot = window["__linefieldPerfRead"]?.();
          if (!snapshot || snapshot.dropped) throw Error("sealed observer overflow");
          const seal = snapshot.records.find(
            (r) => r.kind === "coverage-transition" && r.phase === "seal",
          );
          if (!seal) return;
          d.armSealedEnd = "false";
          d.sealedEndProof = JSON.stringify(seal);
          d.holdEndedBudget = "true";
          const canvas = document.querySelector("canvas");
          if (!canvas) throw Error("canvas required");
          // One generated actual-handler transition immediately after a positively observed seal.
          for (const type of ["pointermove", "pointerup"])
            canvas.dispatchEvent(
              new PointerEvent(type, {
                bubbles: true,
                pointerId: pointer,
                pointerType: "mouse",
                button: type === "pointerup" ? 0 : -1,
                buttons: type === "pointerup" ? 0 : 1,
                clientX: 780,
                clientY: 620,
              }),
            );
        });
    });
    await heldPrefix(page, packed);
    await page.locator("canvas").focus();
    await page.keyboard.down("Space");
    await page.mouse.move(400, 700);
    await page.mouse.down();
    await page.mouse.move(500, 720);
    await page.mouse.up();
    await page.keyboard.up("Space");
    await clear(page);
    await page.mouse.move(300, 600);
    await page.mouse.down();
    await page.mouse.move(750, 600, { steps: 32 });
    const before: Readonly<Record<string, string | number | boolean>>[] = [];
    await expect
      .poll(async () => {
        before.push(...(await drainCapacity(page)));
        return before.some(
          (r) => r.kind === "live-tail" && r.phase === "publish" && r.count === "33" && r.exact,
        );
      })
      .toBe(true);
    const clip = { x: 280, y: 580, width: 520, height: 60 };
    const front = await page.screenshot({ clip });
    await page.evaluate(() => {
      document.documentElement.dataset.armSealedEnd = "true";
    });
    await releaseHistory(page);
    const rows: Readonly<Record<string, string | number | boolean>>[] = [];
    let accepted: Readonly<Record<string, string | number | boolean>> | undefined;
    try {
      await expect(page.locator("html")).toHaveAttribute("data-arm-sealed-end", "false");
      await expect
        .poll(async () => {
          rows.push(...(await drainCapacity(page)));
          return rows.some(
            (r) =>
              r.kind === "live-tail" &&
              r.phase === "ended" &&
              r.count === "34" &&
              Number(r.through) < 34,
          );
        })
        .toBe(true);
      expect(rows.some((r) => r.kind === "coverage-transition" && r.phase === "consume")).toBe(
        false,
      );
      expect(rows.some((r) => r.kind === "receipt-ack")).toBe(false);
      expect((await page.screenshot({ clip })).equals(front)).toBe(true);
      accepted = rows.find((r) => r.kind === "input" && r.command === "end");
      expect(accepted).toBeDefined();
    } finally {
      await page.evaluate(() => {
        document.documentElement.dataset.holdEndedBudget = "false";
      });
    }
    await complete(page, false, false, (r) => rows.push(...r), accepted);
    const settled = await page.screenshot({ clip });
    await page.mouse.up();
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(settled)).toBe(true);
    await page.mouse.move(300, 750);
    await page.mouse.down();
    await page.mouse.move(700, 750, { steps: 16 });
    await page.mouse.up();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(settled)).toBe(true);
    await info.attach("sealed-before-end-forced-budget", {
      body: JSON.stringify({
        seal: await page.locator("html").getAttribute("data-sealed-end-proof"),
        before,
        rows,
        scope:
          "generated actual-handler terminal race plus forced budget exhaustion; not latency evidence",
      }),
      contentType: "application/json",
    });
  });
