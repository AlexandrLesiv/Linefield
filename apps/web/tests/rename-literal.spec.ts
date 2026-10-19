import { test, expect } from "@playwright/test";
import { withRenameDiagnostics } from "./rename-diagnostics.ts";

test.use({ trace: "retain-on-failure" });
test("WEB-D2-08 literal names, native context events and bounded controls", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const name = "<img src=x onerror=alert(1)> Київ ✨";
  await withRenameDiagnostics(page, testInfo, name, async () => {
    await page.locator('[data-id="sample-0"] .more').click();
    await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
    await page.getByLabel("Drawing name").fill(name);
    await page.getByRole("button", { name: "Rename", exact: true }).click();
    await page.locator('[data-id="sample-0"] .drawing-tile').click();
    await expect(page.locator(".canvas-title")).toHaveText(name);
    await expect(page.locator(".canvas-title img")).toHaveCount(0);
    const range = page.getByRole("slider", { name: "Width", exact: true });
    await range.focus();
    await range.press("Home");
    await range.press("ArrowLeft");
    await expect(range).toHaveValue("1");
    await range.press("End");
    await range.press("ArrowRight");
    await expect(range).toHaveValue("32");
    expect(
      await range.evaluate((node) => {
        const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
        node.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    ).toBe(false);
    // Browser normalization fixture, not text entry: no numeric parser is exposed.
    await range.evaluate((node) => {
      if (node instanceof HTMLInputElement) node.value = "NaN";
    });
    expect(Number(await range.inputValue())).toBeGreaterThanOrEqual(1);
  });
});
