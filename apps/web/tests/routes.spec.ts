import { test, expect } from "@playwright/test";

test("WEB-URL01 platform selection leaves the address and history unchanged", async ({ page }) => {
  await page.goto("/?preview=1");
  const original = page.url();
  const length = await page.evaluate(() => history.length);
  for (const platform of ["ios", "android", "macos", "web"]) {
    await page.getByLabel("Preview platform").selectOption(platform);
    expect(page.url()).toBe(original);
    expect(await page.evaluate(() => history.length)).toBe(length);
    await expect(page.locator("html")).toHaveAttribute("data-platform", platform);
  }
  await page.getByLabel("Preview platform").selectOption("ios");
  await page.getByRole("button", { name: "Open Coastal house" }).click();
  await expect(page).toHaveURL(/\/drawing\/sample-0\?preview=1$/);
  await expect(page.locator(".back")).toBeFocused();
  await page.goBack();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  expect(page.url()).toBe(original);
  await expect(page.getByLabel("Preview platform")).toHaveValue("ios");
  await page.goForward();
  await expect(page.locator(".back")).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("data-platform", "ios");
});

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

test("WEB-URL03 unknown paths and forbidden blank viewer routes return to gallery", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/drawing/missing",
    "/drawing/%22%5D",
    "/drawing/preview-new?platform=watchos",
  ]) {
    await page.goto(path);
    await expect(page.locator(".drawing-surface")).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/");
  }
  expect(errors).toEqual([]);
});
