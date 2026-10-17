import { test, expect } from "@playwright/test";

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

test("WEB-ST01 real touch capture transfer preserves finger following and native vertical pan", async ({
  page,
}) => {
  await page.goto("/?platform=ios");
  const card = page.locator('[data-id="sample-0"]');
  const tile = card.locator(".drawing-tile");
  const box = await tile.boundingBox();
  if (!box) throw Error("Missing tile");
  const client = await page.context().newCDPSession(page);
  const touch = async (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) => {
    await client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }],
    });
  };
  const x = box.x + 240;
  const y = box.y + 90;
  await touch("touchStart", x, y);
  for (const distance of [30, 60, 90, 120]) {
    await touch("touchMove", x - distance, y);
    await expect
      .poll(() =>
        tile.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41),
      )
      .toBe(-distance);
  }
  await touch("touchEnd", x - 120, y);
  await expect(card).toHaveAttribute("data-swiped", "true");
  await page.keyboard.press("Escape");
  await page.reload();
  await touch("touchStart", x, y + 180);
  for (const distance of [30, 60, 90, 120]) await touch("touchMove", x, y + 180 - distance);
  await touch("touchEnd", x, y + 60);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(card).not.toHaveAttribute("data-swiped");
  await client.detach();
});
