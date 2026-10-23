import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  beginCapture,
  openDiagnostics,
  drawDiagnosticStroke,
  downloadReport,
} from "./diagnostics-ui.ts";
async function act(page: Page, action: string): Promise<string> {
  return page.evaluate((detail) => {
    document.dispatchEvent(new CustomEvent("fixture-diagnostics", { detail }));
    return document.body.dataset.fixtureDiagnosticState ?? "";
  }, action);
}
test.beforeEach(async ({ page }) => {
  await page.goto("/tests/fixtures/memory/app.html");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
});
test("DIAG-03/04 actual app discards unknown metadata, retains u64 IDs, and reads changing getters once", async ({
  page,
}) => {
  const state: unknown = JSON.parse(await act(page, "changing-getter"));
  expect(state).toMatchObject({ reads: 1, capturing: false });
  const counts = await page.evaluate(() => {
    const value: unknown = JSON.parse(document.body.dataset.fixtureDiagnosticState ?? "{}");
    if (!value || typeof value !== "object") throw Error("fixture state missing");
    return { before: Reflect.get(value, "before"), after: Reflect.get(value, "baseline") };
  });
  expect(counts.after).toBe(counts.before);
  const workerDetail: { before: number; baseline: number } = JSON.parse(
    await act(page, "worker-detail"),
  );
  expect(workerDetail.baseline).toBe(workerDetail.before);
  await beginCapture(page);
  await act(page, "privacy");
  await drawDiagnosticStroke(page);
  await openDiagnostics(page);
  await page.getByRole("button", { name: "Stop capture" }).click();
  const text = await downloadReport(page);
  expect(text).not.toContain("PRIVATE_");
  expect(JSON.parse(text)).toMatchObject({
    events: expect.arrayContaining([
      expect.objectContaining({
        session: "18446744073709551615",
        revision: "9007199254740993",
        admissionRevision: "18446744073709551615",
        admissionScene: "9007199254740993",
        admissionMapping: "0",
        cause: "timeout",
      }),
    ]),
  });
});
for (const [action, reason] of [
  ["overflow", "events"],
  ["byte-overflow", "bytes"],
  ["invalid", "invalid"],
  ["invalid-admission", "invalid"],
  ["invalid-cause", "invalid"],
  ["throwing-getter", "sink"],
] as const)
  test(`DIAG-02/03 ${action} freezes bounded partial capture while real input continues`, async ({
    page,
  }, info) => {
    await beginCapture(page);
    await page.mouse.move(300, 350);
    await page.mouse.down();
    await page.mouse.move(400, 400);
    const state: unknown = JSON.parse(await act(page, action));
    expect(state).toMatchObject({ capturing: false, reason, synchronousChanges: 0 });
    await page.mouse.move(550, 400);
    await page.mouse.up();
    await expect(page.getByRole("button", { name: "Undo last action" })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    await openDiagnostics(page);
    await expect(
      page
        .getByRole("dialog", { name: "Developer diagnostics" })
        .getByText("Partial report.", { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath(`diagnostics-${action}.png`) });
    const text = await downloadReport(page);
    expect(JSON.parse(text)).toMatchObject({ partial: true, reason });
    expect(text).not.toContain("PRIVATE_");
    expect(text.length).toBeLessThanOrEqual(2_097_152);
  });
