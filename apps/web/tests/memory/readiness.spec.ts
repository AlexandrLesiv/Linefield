import { test, expect } from "@playwright/test";
test("MIG-GPU-02 first and recovery input wait for a usable validated base, ordinary next stroke does not", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.clientWaitSync;
    WebGL2RenderingContext.prototype.clientWaitSync = function (sync, flags, timeout) {
      if (document.documentElement.dataset.holdGpu === "true") return this.TIMEOUT_EXPIRED;
      return original.call(this, sync, flags, timeout);
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.dataset.holdGpu = "true";
  });
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(650, 400, { steps: 16 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.evaluate(() => {
    document.documentElement.dataset.holdGpu = "false";
  });
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const clip = { x: 200, y: 220, width: 600, height: 400 },
    blank = await page.screenshot({ clip });
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(650, 400, { steps: 16 });
  await page.mouse.up();
  const first = await page.screenshot({ clip });
  expect(first.equals(blank)).toBe(false);
  await page.evaluate(() => {
    document.documentElement.dataset.holdGpu = "true";
    const gl = document.querySelector("canvas")?.getContext("webgl2"),
      extension = gl?.getExtension("WEBGL_lose_context");
    if (!extension) throw Error("context loss unavailable");
    extension.loseContext();
    setTimeout(() => extension.restoreContext(), 30);
  });
  await expect(page.locator("canvas")).not.toHaveAttribute("data-state", "ready");
  await page.mouse.move(300, 500);
  await page.mouse.down();
  await page.mouse.move(650, 550, { steps: 16 });
  await page.mouse.up();
  await page.evaluate(() => {
    document.documentElement.dataset.holdGpu = "false";
  });
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await expect.poll(async () => (await page.screenshot({ clip })).equals(first)).toBe(true);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect.poll(async () => (await page.screenshot({ clip })).equals(blank)).toBe(true);
});
