import { observeEditorCalls } from "./editor-call-observation.ts";
import { test, expect } from "@playwright/test";
import { settleSurface } from "./layout-assertions.ts";
test("WMR-04 isolated actual engine trap stays fatal across Back Resume without further Rust calls", async ({
  page,
}, info) => {
  await observeEditorCalls(page);
  await page.goto("/tests/fixtures/memory/app.html");
  await page.getByRole("button", { name: "Arm isolated engine trap" }).click();
  await expect(page.locator("#arm")).toBeHidden();
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "fatal");
  await expect(page.getByRole("button", { name: /Retry/ })).toBeHidden();
  await settleSurface(page);
  await page.screenshot({ path: info.outputPath("fatal-editor.png") });
  const read = () =>
    page.evaluate(() => {
      document.dispatchEvent(new Event("fixture-observe"));
      return document.body.dataset.fixtureDiagnostics;
    });
  const before = await read();
  expect(Number(await page.locator("html").getAttribute("data-wrapped-calls"))).toBeGreaterThan(0);
  expect(Number(await page.locator("html").getAttribute("data-engine-calls"))).toBeGreaterThan(0);
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".prototype-label")).toContainText("cannot be recovered");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "fatal");
  expect(await read()).toBe(before);
  await expect(page.locator("html")).toHaveAttribute("data-after-trap", "0");
});
