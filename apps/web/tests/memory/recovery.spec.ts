import { test, expect } from "@playwright/test";
test("MIG-RECOVERY-02 repeated GPU failure latches after one reduced retry; explicit Retry preserves work", async ({
  page,
}) => {
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
  const fault = await canvas.evaluateHandle((node) => {
    if (!(node instanceof HTMLCanvasElement)) throw Error("canvas");
    const gl = node.getContext("webgl2");
    if (!gl) throw Error("WebGL2");
    const getError = gl.getError.bind(gl),
      createTexture = gl.createTexture.bind(gl);
    const state = { fail: true, allocations: 0 };
    gl.getError = () => (state.fail ? gl.OUT_OF_MEMORY : getError());
    gl.createTexture = () => {
      state.allocations++;
      return createTexture();
    };
    return state;
  });
  await page.mouse.move(250, 450);
  await page.mouse.down();
  await page.mouse.move(550, 550, { steps: 8 });
  await expect(canvas).toHaveAttribute("data-state", "resourceUnavailable");
  await page.mouse.up();
  await expect.poll(() => fault.evaluate((s) => s.allocations)).toBe(1);
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(await fault.evaluate((s) => s.allocations)).toBe(1);
  await page.getByRole("button", { name: "Retry display", exact: true }).click();
  await expect.poll(() => fault.evaluate((s) => s.allocations)).toBe(3);
  await expect(canvas).toHaveAttribute("data-state", "resourceUnavailable");
  await fault.evaluate((s) => {
    s.fail = false;
  });
  await page.getByRole("button", { name: "Retry display", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-state", "ready");
  expect((await page.screenshot({ clip })).equals(completed)).toBe(true);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await fault.dispose();
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
