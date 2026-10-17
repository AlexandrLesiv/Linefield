import { test, expect } from "@playwright/test";

for (const colorScheme of ["light", "dark"] as const) {
  test(`WEB-GL01 ${colorScheme} compose feedback and opaque accessibility fallbacks`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/?platform=ios");
    const compose = page.getByRole("button", { name: "New drawing", exact: true });
    await expect(compose).toHaveCSS("backdrop-filter", "blur(16px) saturate(1.1)");
    const bounds = await compose.boundingBox();
    const fill = () => compose.evaluate((node) => getComputedStyle(node).backgroundColor);
    const normal = await fill();
    await compose.hover();
    const hover = await fill();
    expect(hover).not.toBe(normal);
    await page.mouse.down();
    expect(await fill()).not.toBe(hover);
    expect(await compose.boundingBox()).toEqual(bounds);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-color-scheme", value: colorScheme },
        { name: "prefers-reduced-transparency", value: "reduce" },
      ],
    });
    await expect(compose).toHaveCSS("backdrop-filter", "none");
    const surface = colorScheme === "light" ? "rgb(255, 255, 255)" : "rgb(57, 57, 60)";
    await expect(compose).toHaveCSS("background-color", surface);
    await page.getByLabel("Preview platform").selectOption("ipados");
    for (const selector of [".app-toolbar", ".mobile-actions"]) {
      await expect(page.locator(selector)).toHaveCSS("backdrop-filter", "none");
      await expect(page.locator(selector)).toHaveCSS("background-color", surface);
    }
    await page.getByLabel("Preview platform").selectOption("ios");
    await page.emulateMedia({ forcedColors: "active" });
    await expect(compose).toHaveCSS("backdrop-filter", "none");
    await expect(compose).toHaveCSS("border-style", "solid");
    await cdp.detach();
  });
}

test("WEB-GL02 compose cannot activate behind Rename and restores after dismissal", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?platform=ios");
  const compose = page.getByRole("button", { name: "New drawing", exact: true });
  await page.locator('[data-id="sample-0"] .more').click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const bounds = await compose.boundingBox();
  if (!bounds) throw Error("Missing compose bounds");
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(page.locator(".rename-dialog")).toHaveCount(0);
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await compose.click();
  await expect(page.locator(".back")).toBeFocused();
  await expect(compose).toBeHidden();
  await page.locator(".back").click();
  await expect(compose).toBeFocused();
});
