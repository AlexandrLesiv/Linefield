# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> WEB-G12 viewer shows empty state after all samples are staged for deletion
- Location: tests/navigation.spec.ts:50:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('No downloaded drawings')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('No downloaded drawings') with timeout 5000ms
  - waiting for getByText('No downloaded drawings')

```

```yaml
- banner:
  - heading "Linefield" [level=1]
  - text: Preview platform
  - combobox "Preview platform":
    - option "Web"
    - option "macOS"
    - option "Windows"
    - option "Linux"
    - option "iPhone"
    - option "iPad"
    - option "Android"
    - option "ChromeOS"
    - option "watchOS" [selected]
    - option "Wear OS"
    - option "tvOS"
    - option "Android TV"
    - option "visionOS"
    - option "Android XR"
  - button "Reset samples"
  - text: Browser simulation
- main:
  - article:
    - button "Open Untitled": Untitled
- paragraph: Live design prototype · Samples stay in memory
- status: Drawing removed. Undo remains available in its place.
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("WEB-G09 Back/Forward during collapse converges to the latest route", async ({ page }) => {
  4  |   await page.goto("/");
  5  |   await page.getByRole("button", { name: "Open Coastal house" }).click();
  6  |   await expect(page.locator(".back")).toBeFocused();
  7  |   await page.goBack();
  8  |   await page.locator(".drawing-surface").evaluate((node) => {
  9  |     node.getAnimations().forEach((a) => a.pause());
  10 |   });
  11 |   await page.goForward();
  12 |   await page.locator(".drawing-surface").evaluate((node) => {
  13 |     node.getAnimations().forEach((a) => a.finish());
  14 |   });
  15 |   await expect(page.locator(".back")).toBeFocused();
  16 |   await expect(page).toHaveURL(/#drawing\/sample-0$/);
  17 |   await expect(page.locator(".drawing-surface")).toHaveCount(1);
  18 |   await page.goBack();
  19 |   await expect(page.locator(".drawing-surface")).toHaveCount(0);
  20 | });
  21 | 
  22 | test("WEB-G10 staged deletion cannot be undone from a viewer; editor Undo restores focus", async ({
  23 |   page,
  24 | }) => {
  25 |   await page.goto("/");
  26 |   const card = page.locator('[data-id="sample-0"]');
  27 |   await card.click({ button: "right" });
  28 |   await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  29 |   await page.getByLabel("Preview platform").selectOption("watchos");
  30 |   await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
  31 |   await expect(card).toHaveCount(0);
  32 |   await page.getByLabel("Preview platform").selectOption("web");
  33 |   await card.getByRole("button", { name: "Undo" }).focus();
  34 |   await page.keyboard.press("Enter");
  35 |   await expect(card.getByRole("button", { name: "Open Coastal house" })).toBeFocused();
  36 | });
  37 | 
  38 | test("WEB-G11 malformed history routes are inert", async ({ page }) => {
  39 |   const errors: string[] = [];
  40 |   page.on("pageerror", (error) => errors.push(error.message));
  41 |   await page.goto("/");
  42 |   await page.evaluate(() => {
  43 |     history.pushState(null, "", '#drawing/"]');
  44 |     dispatchEvent(new PopStateEvent("popstate"));
  45 |   });
  46 |   await expect(page.locator(".drawing-surface")).toHaveCount(0);
  47 |   expect(errors).toEqual([]);
  48 | });
  49 | 
  50 | test("WEB-G12 viewer shows empty state after all samples are staged for deletion", async ({
  51 |   page,
  52 | }) => {
  53 |   await page.goto("/");
  54 |   await page.emulateMedia({ reducedMotion: "reduce" });
  55 |   for (let index = 0; index < 6; index++) {
  56 |     const trigger = page.locator(`[data-id="sample-${index}"] .more`);
  57 |     await trigger.focus();
  58 |     await trigger.press("Enter");
  59 |     await page.keyboard.press("End");
  60 |     await page.keyboard.press("Enter");
  61 |   }
  62 |   await page.getByLabel("Preview platform").selectOption("watchos");
> 63 |   await expect(page.getByText("No downloaded drawings")).toBeVisible();
     |                                                          ^ Error: expect(locator).toBeVisible() failed
  64 |   await expect(page.locator(".undo")).toHaveCount(0);
  65 | });
  66 | 
  67 | test("WEB-G13 menu keeps source title visible and dismisses with animation", async ({ page }) => {
  68 |   await page.goto("/");
  69 |   const trigger = page.getByRole("button", { name: "Actions for Coastal house" });
  70 |   await trigger.focus();
  71 |   await trigger.press("Enter");
  72 |   await page.mouse.move(0, 0);
  73 |   const title = page.locator('[data-id="sample-0"] .drawing-name');
  74 |   await expect(title).toHaveCSS("opacity", "1");
  75 |   await page.keyboard.press("Escape");
  76 |   await expect(page.getByRole("menu")).toHaveCount(0);
  77 |   await expect(trigger).toBeFocused();
  78 | });
  79 | 
```