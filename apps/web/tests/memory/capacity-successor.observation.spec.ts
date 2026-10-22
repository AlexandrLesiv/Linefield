import { test, expect } from "@playwright/test";
import { heldPrefix, drainCapacity, releaseHistory } from "./capacity-setup.ts";
import { clear, complete } from "./observed-frame.ts";
for (const packed of [false, true])
  test(`MIG-WORKER-32 Undo pending successor promptly retains predecessor (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    await heldPrefix(page, packed);
    const clip = { x: 280, y: 280, width: 500, height: 40 };
    const original = await page.screenshot({ clip });
    const undoneClip = { x: 280, y: 580, width: 500, height: 40 };
    const emptyC = await page.screenshot({ clip: undoneClip });
    await page.mouse.move(300, 600);
    await page.mouse.down();
    await page.mouse.move(750, 600, { steps: 32 });
    await page.mouse.up();
    await clear(page);
    await page.evaluate(() => document.dispatchEvent(new Event("release-history-current")));
    await expect
      .poll(async () => Number(await page.locator("html").getAttribute("data-history-replies")))
      .toBeGreaterThan(0);
    const pending = await drainCapacity(page);
    expect(pending.some((r) => r.kind === "receipt-ack")).toBe(false);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    const rows: Readonly<Record<string, string | number | boolean>>[] = [];
    await complete(page, false, false, (r) => rows.push(...r));
    const undo = rows.find((r) => r.kind === "input" && r.command === "undo");
    const ack = rows.find((r) => r.kind === "receipt-ack");
    expect(undo).toBeDefined();
    expect(ack).toBeDefined();
    expect(Number(ack?.time) - Number(undo?.time)).toBeLessThanOrEqual(500);
    expect(
      rows.some((r) => r.kind === "coverage-transition" && r.phase === "extension-retain"),
    ).toBe(true);
    expect(Number(await page.locator("html").getAttribute("data-history-replies"))).toBeGreaterThan(
      0,
    );
    expect((await page.screenshot({ clip })).equals(original)).toBe(true);
    await releaseHistory(page);
    await page.mouse.move(300, 700);
    await page.mouse.down();
    await page.mouse.move(750, 700, { steps: 16 });
    await page.mouse.up();
    await complete(page);
    const fresh = await page.screenshot({ clip: { x: 280, y: 680, width: 500, height: 40 } });
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page);
    expect(
      (await page.screenshot({ clip: { x: 280, y: 680, width: 500, height: 40 } })).equals(fresh),
    ).toBe(true);
    expect((await page.screenshot({ clip })).equals(original)).toBe(true);
    expect((await page.screenshot({ clip: undoneClip })).equals(emptyC)).toBe(true);
    await info.attach("held-successor-cancel-transitions", {
      body: JSON.stringify({ pending, rows }),
      contentType: "application/json",
    });
  });
