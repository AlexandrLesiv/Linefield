import { test, expect } from "@playwright/test";

test("WEB-URL02 ordinary paths support direct entry, reload and in-app Back", async ({ page }) => {
  await page.goto("/drawing/sample-2");
  await expect(page.locator(".canvas-title")).toHaveText("Mountain study");
  await expect(page.locator(".back")).toBeFocused();
  await page.reload();
  await expect(page.locator(".back")).toBeFocused();
  expect(new URL(page.url()).hash).toBe("");
  await page.locator(".back").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Mountain study" })).toBeFocused();
  await page.goForward();
  await expect(page.locator(".canvas-title")).toHaveText("Mountain study");
});

test("WEB-URL03 unknown paths return to gallery", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of ["/drawing/missing", "/drawing/%22%5D"]) {
    await page.goto(path);
    await expect(page.locator(".drawing-surface")).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/");
  }
  expect(errors).toEqual([]);
});
