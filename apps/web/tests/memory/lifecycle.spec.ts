import { test, expect } from "@playwright/test";
import { settleSurface } from "./layout-assertions.ts";
test("WMR-02 delayed initialization Back Resume old completion cannot reopen or steal focus", async ({
  page,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*linefield_web_memory*.wasm", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  const cards = await page.locator(".drawing-card").count();
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "loading");
  await expect(page.locator(".back")).toBeEnabled();
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.locator(".new-tile").click();
  await page.locator("[data-memory-canvas]").focus();
  release();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await expect(page.locator("[data-memory-canvas]")).toBeFocused();
  await expect(page.locator(".drawing-surface")).toHaveCount(1);
  await page.locator(".back").click();
  await expect(page.locator(".drawing-card")).toHaveCount(cards);
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".new-tile")).toHaveAccessibleName("Resume temporary drawing");
});
test("WMR-04 asset failure has bounded explicit Retry and Back", async ({ page }, info) => {
  let fail = true;
  await page.route("**/*linefield_web_memory*.wasm", async (route) => {
    if (fail) await route.abort("failed");
    else await route.continue();
  });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "loadFailed");
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  await expect(page.locator(".drawing-surface")).toHaveCSS("width", "1280px");
  await settleSurface(page);
  await page.screenshot({ path: info.outputPath("initialization-failure.png") });
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".new-tile")).toHaveAccessibleName("Resume temporary drawing");
});
test("WMR-03/04 real WebGL context loss restores same attachment and supports Back Resume", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator(".new-tile").click();
  const canvas = page.locator("[data-memory-canvas]");
  await expect(canvas).toHaveAttribute("data-state", "ready");
  const control = await canvas.evaluateHandle((node) => {
    if (!(node instanceof HTMLCanvasElement)) throw Error("canvas");
    const gl = node.getContext("webgl2") ?? node.getContext("webgl");
    if (!gl) throw Error("real WebGL unavailable");
    const extension = gl.getExtension("WEBGL_lose_context");
    if (!extension) throw Error("context-loss fixture unavailable");
    return { extension, attributes: gl.getContextAttributes() };
  });
  expect(await control.evaluate((value) => value.attributes)).toMatchObject({
    depth: false,
    antialias: false,
    stencil: false,
  });
  await control.evaluate((value) => value.extension.loseContext());
  await expect(canvas).toHaveAttribute("data-state", "displayLost");
  await settleSurface(page);
  await page.screenshot({ path: info.outputPath("display-loss.png") });
  await control.evaluate((value) => value.extension.restoreContext());
  await control.dispose();
  await expect(canvas).toHaveAttribute("data-state", "ready");
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".new-tile")).toHaveAccessibleName("Resume temporary drawing");
  await page.goForward();
  await expect(canvas).toHaveAttribute("data-state", "ready");
});
test("WMR-02 cold temporary URL and reload return honest gallery without fake drawing", async ({
  page,
}) => {
  await page.goto("/drawing/preview-new");
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".prototype-label")).toContainText("unavailable");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await page.reload();
  await expect(page.locator(".prototype-label")).toContainText("unavailable");
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".new-tile")).toHaveAccessibleName("New drawing");
});
