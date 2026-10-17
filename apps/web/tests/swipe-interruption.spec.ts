import { test, expect } from "@playwright/test";

test("WEB-SI01 foreign pointers cannot replace or cancel the active swipe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  const tile = page.locator('[data-id="sample-0"] .drawing-tile');
  const box = await tile.boundingBox();
  if (!box) throw Error("Missing tile");
  await page.mouse.move(box.x + 240, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 195, box.y + 80);
  await tile.dispatchEvent("pointerdown", { pointerId: 2, button: 0, clientX: 20, clientY: 20 });
  await tile.dispatchEvent("pointercancel", { pointerId: 2 });
  await tile.dispatchEvent("lostpointercapture", { pointerId: 2 });
  await page.mouse.move(box.x + 145, box.y + 80);
  expect((await tile.boundingBox())?.x).toBeCloseTo(box.x - 95, 0);
  await page.mouse.up();
  await expect(page.locator('[data-id="sample-0"]')).toHaveAttribute("data-swiped", "true");
});

test("WEB-SI02 same-column resize cancels active drag without stale continuation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=android");
  const card = page.locator('[data-id="sample-0"]');
  const tile = card.locator(".drawing-tile");
  const box = await tile.boundingBox();
  if (!box) throw Error("Missing tile");
  await page.mouse.move(box.x + 240, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 170, box.y + 80);
  await page.setViewportSize({ width: 420, height: 844 });
  await expect(card).not.toHaveAttribute("data-swiped");
  await page.mouse.move(box.x + 110, box.y + 80);
  await page.mouse.up();
  await expect(card).not.toHaveAttribute("data-swiped");
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
});

test("WEB-SI03 early Undo preserves the moving rail and artwork before reversing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  await page.locator('[data-id="sample-0"] .drawing-tile').focus();
  await page.keyboard.press("ArrowLeft");
  const result = await page.locator('[data-id="sample-0"]').evaluate((card) => {
    const measure = (root: Element) =>
      [".swipe-actions", ".drawing-tile"].map((selector) => {
        const node = root.querySelector(selector);
        if (!node) throw Error("Missing layer");
        const box = node.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      });
    card.querySelector<HTMLButtonElement>(".delete")?.click();
    const outgoing = document.querySelector("[data-mobile-slide]");
    if (!outgoing) throw Error("Missing outgoing layer");
    outgoing.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = 90;
    });
    const before = measure(outgoing);
    document.querySelector<HTMLButtonElement>('[data-id="sample-0"] .undo')?.click();
    const incoming = document.querySelector("[data-mobile-slide]");
    if (!incoming) throw Error("Missing incoming layer");
    incoming.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    return { before, after: measure(incoming) };
  });
  expect(result.after).toEqual(result.before);
  await expect(page.getByRole("button", { name: "Open Coastal house" })).toBeFocused();
});

test("WEB-SI04 a new drag starts from visible mid-settle translation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  const tile = page.locator('[data-id="sample-0"] .drawing-tile');
  await tile.focus();
  await tile.press("ArrowLeft");
  await tile.evaluate((node) =>
    node.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 50;
    }),
  );
  const box = await tile.boundingBox();
  if (!box) throw Error("Missing settling tile");
  await page.mouse.move(box.x + 170, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 190, box.y + 80);
  expect((await tile.boundingBox())?.x).toBeCloseTo(box.x + 20, 0);
  await page.mouse.up();
});

test("WEB-SI05 vertical cancellation settles a frozen partial reveal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  const card = page.locator('[data-id="sample-0"]');
  const tile = card.locator(".drawing-tile");
  await tile.focus();
  await tile.press("ArrowLeft");
  await tile.evaluate((node) =>
    node.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 50;
    }),
  );
  await tile.dispatchEvent("pointerdown", { pointerId: 1, button: 0, clientX: 120, clientY: 120 });
  await tile.dispatchEvent("pointermove", { pointerId: 1, clientX: 120, clientY: 160 });
  await tile.dispatchEvent("pointercancel", { pointerId: 1 });
  await expect(card).not.toHaveAttribute("data-swiped");
  await expect
    .poll(() =>
      tile.evaluate((node) => {
        const transform = getComputedStyle(node).transform;
        return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
      }),
    )
    .toBe(0);
});
