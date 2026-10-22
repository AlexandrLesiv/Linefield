import { test, expect } from "@playwright/test";
import { heldPrefix, releaseHistory, drainCapacity } from "./capacity-setup.ts";
import { complete, clear } from "./observed-frame.ts";
import { installCapacityPixels, probeCapacity, checkCapacityPixels } from "./capacity-pixels.ts";
for (const packed of [false, true]) {
  test(`MIG-WORKER-31 sealed prefix survives cancellable pan and restores exact frame (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    await heldPrefix(page, packed);
    const clip = { x: 280, y: 280, width: 500, height: 40 };
    const original = await page.screenshot({ clip });
    await clear(page);
    await page.locator("canvas").focus();
    await page.keyboard.down("Space");
    await page.mouse.move(400, 700);
    await page.mouse.down();
    await page.mouse.move(500, 720);
    await releaseHistory(page);
    const rows: Readonly<Record<string, string | number | boolean>>[] = [];
    await expect
      .poll(async () => {
        rows.push(...(await drainCapacity(page)));
        return rows.some((r) => r.kind === "coverage-transition" && r.phase === "seal");
      })
      .toBe(true)
      .finally(async () =>
        info.attach("seal-diagnostic", {
          body: JSON.stringify(rows),
          contentType: "application/json",
        }),
      );
    expect(rows.some((r) => r.kind === "receipt-ack")).toBe(false);
    expect(
      (await page.screenshot({ clip: { ...clip, x: clip.x + 100, y: clip.y + 20 } })).equals(
        original,
      ),
    ).toBe(true);
    await clear(page);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.keyboard.up("Space");
    await complete(page, false, false, (r) => rows.push(...r));
    expect((await page.screenshot({ clip })).equals(original)).toBe(true);
    expect(rows.some((r) => r.kind === "coverage-transition" && r.phase === "consume")).toBe(true);
    await info.attach("sealed-pan-transitions", {
      body: JSON.stringify(rows),
      contentType: "application/json",
    });
  });
  test(`MIG-WORKER-31 active ink survives sealed prefix RGB copyback (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    await installCapacityPixels(page);
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
    const clip = { x: 330, y: 580, width: 350, height: 40 };
    const active = await page.screenshot({ clip });
    await probeCapacity(page, 450, 600);
    await releaseHistory(page);
    const rows: Readonly<Record<string, string | number | boolean>>[] = [];
    await complete(page, false, true, (r) => rows.push(...r));
    expect(rows.some((r) => r.kind === "coverage-transition" && r.phase === "copyback")).toBe(true);
    expect((await page.screenshot({ clip })).equals(active)).toBe(true);
    await page.mouse.up();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(active)).toBe(true);
    await info.attach("E-every-display-continuity", {
      body: JSON.stringify(await checkCapacityPixels(page)),
      contentType: "application/json",
    });
    await info.attach("active-copyback-transitions", {
      body: JSON.stringify(rows),
      contentType: "application/json",
    });
  });
}
