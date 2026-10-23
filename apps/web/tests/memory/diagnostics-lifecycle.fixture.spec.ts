import { test, expect } from "@playwright/test";
import {
  beginCapture,
  openDiagnostics,
  drawDiagnosticStroke,
  downloadReport,
} from "./diagnostics-ui.ts";
import { observeEditorCalls } from "./editor-call-observation.ts";
test("DIAG-02/03 terminal editor retains export without another Rust call", async ({ page }) => {
  await observeEditorCalls(page);
  await page.goto("/tests/fixtures/memory/app.html");
  await page.locator(".new-tile").click();
  const canvas = page.locator("[data-memory-canvas]");
  await expect(canvas).toHaveAttribute("data-state", "ready");
  await beginCapture(page);
  await drawDiagnosticStroke(page);
  // Explicit existing fault control, not a simulated user gesture or dispatcher test.
  await page.locator("#arm").dispatchEvent("click");
  await expect(page.locator("#arm")).toBeHidden();
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(canvas).toHaveAttribute("data-state", "fatal");
  await openDiagnostics(page);
  await expect(page.getByRole("button", { name: "New capture (replaces report)" })).toBeDisabled();
  expect(JSON.parse(await downloadReport(page))).toMatchObject({
    reason: "terminal",
    partial: true,
    events: expect.arrayContaining([
      expect.objectContaining({
        event: "resource.failure",
        outcome: "failed",
        session: expect.stringMatching(/^[1-9][0-9]*$/),
      }),
    ]),
  });
  await expect(page.locator("html")).toHaveAttribute("data-after-trap", "0");
});
test("DIAG-02/03 real duration expiry does not cancel held mouse input or steal focus", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.goto("/tests/fixtures/memory/app.html");
  await page.locator(".new-tile").click();
  const canvas = page.locator("[data-memory-canvas]");
  await expect(canvas).toHaveAttribute("data-state", "ready");
  await beginCapture(page);
  await page.mouse.move(300, 350);
  await page.mouse.down();
  await page.mouse.move(400, 400);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          document.dispatchEvent(new CustomEvent("fixture-diagnostics", { detail: "inspect" }));
          return JSON.parse(document.body.dataset.fixtureDiagnosticState ?? "{}");
        }),
      { timeout: 35_000, intervals: [500] },
    )
    .toMatchObject({ capturing: false, reason: "duration" });
  await expect(canvas).toBeFocused();
  await page.mouse.move(550, 400);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Undo last action" })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  await openDiagnostics(page);
  expect(JSON.parse(await downloadReport(page))).toMatchObject({
    reason: "duration",
    partial: false,
  });
});
