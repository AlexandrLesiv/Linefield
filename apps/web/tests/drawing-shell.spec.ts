import { test, expect } from "@playwright/test";

test("WEB-D2-01/02/03 disposable tools and properties preserve artwork and history", async ({
  page,
}) => {
  await page.goto("/drawing/sample-0");
  await expect(page.locator(".back")).toBeFocused();
  const image = await page.locator(".canvas-art").getAttribute("src");
  const url = page.url();
  const pen = page.getByRole("button", { name: "Pen", exact: true });
  await page.keyboard.press("Tab");
  await expect(pen).toBeFocused();
  await expect(pen).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("slider", { name: "Width", exact: true })).toHaveValue("8");
  const width = page.getByRole("slider", { name: "Width", exact: true });
  await width.focus();
  await width.press("End");
  await expect(width).toHaveValue("32");
  await expect(page.locator(".stroke-preview path")).toHaveAttribute("stroke-width", "8");
  await page.getByRole("slider", { name: "Opacity", exact: true }).fill("0");
  await expect(page.locator(".stroke-preview svg")).toHaveCSS("opacity", "0");
  for (const [tool, count] of [
    ["Select", 0],
    ["Eraser", 1],
    ["Line", 2],
    ["Shapes", 2],
    ["Pen", 3],
  ] as const) {
    await page.getByRole("button", { name: tool, exact: true }).click();
    await expect(page.getByRole("slider")).toHaveCount(count);
    await expect(page.getByRole("button", { name: tool, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  await expect(
    page.getByRole("button", { name: "Color · unavailable in this preview" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Settings · unavailable in this preview" }),
  ).toBeDisabled();
  await expect(page.locator(".canvas-art")).toHaveAttribute("src", image ?? "");
  expect(page.url()).toBe(url);
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.goForward();
  await expect(width).toHaveValue("8");
  await expect(page.getByRole("slider", { name: "Opacity", exact: true })).toHaveValue("100");
});

test("WEB-D2-04/06 active pointer cancellation and idle Escape never navigate", async ({
  page,
}) => {
  await page.goto("/drawing/sample-0");
  await expect(page.locator(".back")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/sample-0$/);
  const width = page.getByRole("slider", { name: "Width", exact: true });
  const box = await width.boundingBox();
  if (!box) throw Error("Missing width control");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(width).not.toHaveValue("8");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(width).toHaveValue("8");
  await page.keyboard.press("Shift");
  await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2);
  await page.mouse.up();
  await expect(width).toHaveValue("8");
  await width.press("ArrowRight");
  await expect(width).toHaveValue("9");
  await width.press("Escape");
  await expect(width).toHaveValue("9");
  await expect(page).toHaveURL(/sample-0$/);
});

test("WEB-D2-06 transition controls are inert and stale completion does not steal focus", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-id="sample-0"] .drawing-tile').click();
  await page
    .locator(".drawing-surface")
    .evaluate((node) => node.getAnimations().forEach((a) => a.pause()));
  await expect(page.locator(".drawing-chrome")).toHaveJSProperty("inert", true);
  // Injected external-focus fixture; represents deliberate browser/host focus movement.
  await page.evaluate(() => {
    const target = document.createElement("button");
    target.id = "external-focus";
    document.body.append(target);
    target.focus();
  });
  await page
    .locator(".drawing-surface")
    .evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
  await expect(page.locator(".drawing-chrome")).toHaveJSProperty("inert", false);
  await expect(page.locator("#external-focus")).toBeFocused();
  await page.goBack();
  await page
    .locator(".drawing-surface")
    .evaluate((node) => node.getAnimations().forEach((a) => a.pause()));
  await page.locator(".drawing-surface").evaluate(() => {
    document.querySelector<HTMLButtonElement>("#external-focus")?.blur();
    document.querySelector<HTMLButtonElement>("#external-focus")?.focus();
  });
  await page
    .locator(".drawing-surface")
    .evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator("#external-focus")).toBeFocused();
});
