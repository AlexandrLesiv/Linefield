import { test, expect } from "@playwright/test";
import { heldPrefix, unfinished, releaseHistory } from "./capacity-setup.ts";
import { complete, clear } from "./observed-frame.ts";
import { installCapacityPixels, probeCapacity, checkCapacityPixels } from "./capacity-pixels.ts";
for (const packed of [false, true]) {
  test(`MIG-WORKER-30 C End then D End and active E before RAF retain independent ink (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await installCapacityPixels(page);
    await heldPrefix(page, packed);
    const cClip = { x: 330, y: 580, width: 350, height: 40 };
    const eClip = { x: 330, y: 780, width: 350, height: 40 };
    const blankE = await page.screenshot({ clip: eClip });
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
    await page.mouse.move(300, 600);
    await page.mouse.down();
    await page.mouse.move(750, 600, { steps: 32 });
    const c = await page.screenshot({ clip: cClip });
    await probeCapacity(page, 450, 600);
    // One task delivers actual-handler transitions; no claim of physical device ordering.
    await page.locator("canvas").evaluate((canvas) => {
      const emit = (type: string, x: number, y: number, buttons: number) =>
        canvas.dispatchEvent(
          new PointerEvent(type, {
            pointerId: Number(document.documentElement.dataset.capacityPointer),
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            buttons,
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        );
      emit("pointerup", 750, 600, 0);
      emit("pointerdown", 300, 700, 1);
      emit("pointermove", 750, 700, 1);
      emit("pointerup", 750, 700, 0);
      emit("pointerdown", 300, 800, 1);
    });
    await page.mouse.move(750, 800, { steps: 32 });
    await expect
      .poll(async () => (await page.screenshot({ clip: eClip })).equals(blankE))
      .toBe(false);
    expect((await page.screenshot({ clip: cClip })).equals(c)).toBe(true);
    const pending = await unfinished(page);
    await info.attach("held-handoff-observations", {
      body: JSON.stringify(pending),
      contentType: "application/json",
    });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect
      .poll(async () => (await page.screenshot({ clip: eClip })).equals(blankE))
      .toBe(true);
    expect((await page.screenshot({ clip: cClip })).equals(c)).toBe(true);
    await releaseHistory(page);
    await complete(page);
    await info.attach("C-every-display-continuity", {
      body: JSON.stringify(await checkCapacityPixels(page)),
      contentType: "application/json",
    });
    const final = await page.screenshot({ clip: { x: 250, y: 550, width: 550, height: 280 } });
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    expect((await page.screenshot({ clip: cClip })).equals(c)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page, true);
    expect(
      (await page.screenshot({ clip: { x: 250, y: 550, width: 550, height: 280 } })).equals(final),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
