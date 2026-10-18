import { test, expect } from "@playwright/test";

for (const locale of ["en", "en-US", "uk", "uk-UA", "de-DE"]) {
  test(`I18N-LAUNCH-002 ${locale} launch and reload select supported browser language`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:65142/");
    const uk = locale.startsWith("uk");
    await expect(page.locator("html")).toHaveAttribute("lang", uk ? "uk" : "en");
    await expect(page.locator(".new-tile")).toHaveAccessibleName(
      uk ? "Новий малюнок" : "New drawing",
    );
    await page.locator(".new-tile").click();
    await expect(page.locator(".back")).toBeFocused();
    await expect(page.locator(".canvas-title")).toHaveText(uk ? "Без назви" : "Untitled");
    await expect(page.locator(".property-width input")).toHaveAccessibleName(
      uk ? "Товщина" : "Width",
    );
    await page.reload();
    await expect(page.locator(".back")).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("lang", uk ? "uk" : "en");
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await context.close();
  });
}

for (const languages of [
  ["fr-FR", "uk-UA", "en-US"],
  ["en-GB", "uk-UA"],
  ["ja-JP", "de-DE"],
]) {
  test(`I18N-LAUNCH-002 ordered preference fixture ${languages.join(",")}`, async ({ browser }) => {
    const context = await browser.newContext({ locale: "de-DE" });
    // Explicit injected preference fixture; it does not modify browser/OS settings.
    await context.addInitScript((values) => {
      Object.defineProperty(navigator, "languages", { get: () => values });
    }, languages);
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:65142/drawing/preview-new");
    await expect(page.locator(".back")).toBeFocused();
    const expected = languages[0] === "fr-FR" ? "uk" : "en";
    await expect(page.locator("html")).toHaveAttribute("lang", expected);
    const formatted = "100\u00a0%";
    await expect(page.locator(".property-opacity input")).toHaveAttribute(
      "aria-valuetext",
      formatted,
    );
    await expect(page.locator(".canvas-zoom")).toHaveText(formatted);
    // Region stays de-DE even with Ukrainian/English UI, and launch choice is stable.
    expect(await page.evaluate(() => navigator.language)).toBe("de-DE");
    await context.close();
  });
}

test("I18N-UK-002 browser Ukrainian labels and literal Unicode names survive navigation", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "uk-UA" });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:65142/");
  await page.locator('[data-id="sample-0"] .more').click();
  await page.getByRole("menuitem", { name: "Перейменувати", exact: true }).click();
  const name = "Київ · e\u0301 · رسم · 🖊️";
  await page.getByLabel("Назва малюнка").fill(name);
  await page.getByRole("button", { name: "Перейменувати", exact: true }).click();
  await page.locator('[data-id="sample-0"] .drawing-tile').click();
  await expect(page.locator(".back")).toBeFocused();
  await expect(page.locator(".canvas-title")).toHaveText(name);
  for (const label of ["Перо", "Вибір", "Гумка", "Лінія", "Фігури"]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.locator(".property-opacity input")).toHaveAccessibleName("Непрозорість");
  await expect(page.locator(".property-smoothing input")).toHaveAccessibleName("Згладжування");
  await page.locator(".back").click();
  await expect(page.locator('[data-id="sample-0"] .drawing-tile')).toHaveAccessibleName(
    `Відкрити ${name}`,
  );
  await context.close();
});
