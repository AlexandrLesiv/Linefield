import { test, expect } from "@playwright/test";
import { traverseDisabled } from "./control-focus.ts";
test("MIG-CONTROL-01 disabled history preserves native Tab and Shift+Tab traversal", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const undo = page.getByRole("button", { name: "Undo last action", exact: true });
  await traverseDisabled(page, undo);
  await page.keyboard.press("Enter");
  await expect(undo).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Tab");
  await expect(undo).not.toBeFocused();
});
