import { expect, test } from "@playwright/test";

test("WEB-PC01 normal web entry omits all review controls, including after navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByText("Preview platform", { exact: true })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-platform", "web");
  await expect(page.getByRole("button", { name: "Reset samples" })).toHaveCount(0);
  await expect(page.getByText("Browser simulation", { exact: true })).toHaveCount(0);
  await expect(page.locator(".preview-controls")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "New drawing", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Open Coastal house" }).click();
  await expect(page.locator(".back")).toBeFocused();
  await page.locator(".back").click();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".preview-controls")).toHaveCount(0);
});

test("WEB-PC02 explicit review link restores picker without changing address or history", async ({
  page,
}) => {
  await page.goto("/?preview=1");
  const address = page.url();
  const historyLength = await page.evaluate(() => history.length);
  const picker = page.getByRole("combobox", { name: "Preview platform" });
  await expect(picker).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset samples" })).toBeVisible();
  await expect(page.getByText("Browser simulation", { exact: true })).toBeVisible();
  await picker.selectOption("ios");
  await expect(page.locator("html")).toHaveAttribute("data-platform", "ios");
  expect(page.url()).toBe(address);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await page.goto("/");
  await expect(picker).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-platform", "web");
});

test("WEB-PC03 valid platform links opt in; unrelated or invalid query values do not", async ({
  page,
}) => {
  await page.goto("/?platform=ipados");
  await expect(page.getByRole("combobox", { name: "Preview platform" })).toHaveValue("ipados");
  for (const query of ["preview=0", "platform=unknown", "review=gallery"]) {
    await page.goto("/?" + query);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-platform", "web");
  }
});
