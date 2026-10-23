import { test, expect } from "@playwright/test";
import { recoveryFault } from "./recovery-fault.ts";
for (const phase of ["sampler", "target"] as const)
  test(`MIG-RECOVERY-02 ${phase} failure latches after one reduced retry; explicit Retry preserves work`, async ({
    page,
    browser,
  }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("data-state", "ready");
    const clip = { x: 100, y: 180, width: 1000, height: 500 };
    await page.mouse.move(250, 250);
    await page.mouse.down();
    await page.mouse.move(550, 350, { steps: 12 });
    await page.mouse.up();
    const completed = await page.screenshot({ clip });
    const fault = await recoveryFault(canvas, phase);
    const capture = async (step: string) => {
      const value = await fault.evaluate((state) => ({ ...state }));
      await info.attach(`recovery-${step}`, {
        body: JSON.stringify({ browser: browser.version(), phase, ...value }),
        contentType: "application/json",
      });
      return value;
    };
    try {
      await page.mouse.move(250, 450);
      await page.mouse.down();
      await page.mouse.move(550, 550, { steps: 8 });
      await expect(canvas).toHaveAttribute("data-state", "resourceUnavailable");
      await page.mouse.up();
      await expect.poll(() => fault.evaluate((s) => s.attempts)).toBe(1);
      const automatic = await capture("automatic");
      expect(automatic.injected).toBeGreaterThan(0);
      expect(automatic.deleted).toBe(1);
      // Target faults retain both optional R8 and complete RGBA allocation attempts.
      expect(automatic.allocations).toBe(phase === "target" ? 2 : 0);
      const zoom = page.getByRole("button", { name: "Zoom in", exact: true });
      await expect(zoom).toHaveAttribute("aria-disabled", "true");
      const bounds = await zoom.boundingBox();
      if (!bounds) throw Error("zoom-control");
      for (let i = 0; i < 3; i++)
        await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.evaluate(() => window.dispatchEvent(new Event("resize")));
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      const latched = await capture("latched");
      expect(latched.attempts).toBe(1);
      expect(latched.allocations).toBe(phase === "target" ? 2 : 0);
      await page.getByRole("button", { name: "Retry display", exact: true }).click();
      await expect.poll(() => fault.evaluate((s) => s.attempts)).toBe(3);
      const explicit = await capture("explicit");
      expect(explicit.deleted).toBe(3);
      expect(explicit.allocations).toBe(phase === "target" ? 6 : 0);
      await expect(canvas).toHaveAttribute("data-state", "resourceUnavailable");
      await fault.evaluate((s) => {
        s.fail = false;
      });
      await page.getByRole("button", { name: "Retry display", exact: true }).click();
      await expect(canvas).toHaveAttribute("data-state", "ready");
      const recovered = await capture("recovered");
      expect(recovered.attempts).toBe(4);
      expect(recovered.deleted).toBe(3);
      expect((await page.screenshot({ clip })).equals(completed)).toBe(true);
      await page.getByRole("button", { name: "Undo last action", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Undo last action", exact: true }),
      ).toHaveAttribute("aria-disabled", "true");
    } finally {
      await capture("final");
      await fault.dispose();
    }
  });
test("MIG-RECOVERY-03 rejected display remap suspends old mapping until valid recovery", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-state", "ready");
  await page.mouse.move(250, 250);
  await page.mouse.down();
  await page.mouse.move(550, 350, { steps: 12 });
  await page.mouse.up();
  const clip = { x: 100, y: 180, width: 1000, height: 500 };
  const completed = await page.screenshot({ clip });
  const original = await page.evaluate(() => devicePixelRatio);
  await page.evaluate(() => {
    Object.defineProperty(window, "devicePixelRatio", { value: 5, configurable: true });
    window.dispatchEvent(new Event("resize"));
  });
  await expect(canvas).toHaveAttribute("data-state", "sizeUnavailable");
  await page.mouse.move(250, 450);
  await page.mouse.down();
  await page.mouse.move(550, 550, { steps: 8 });
  await page.mouse.up();
  await page.evaluate((value) => {
    Object.defineProperty(window, "devicePixelRatio", { value, configurable: true });
    window.dispatchEvent(new Event("resize"));
  }, original);
  await expect(canvas).toHaveAttribute("data-state", "ready");
  expect((await page.screenshot({ clip })).equals(completed)).toBe(true);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});
