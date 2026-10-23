import { test, expect } from "@playwright/test";
import { openDiagnostics, drawDiagnosticStroke } from "./diagnostics-ui.ts";
import {
  retentionObservation,
  attachDiagnosticBrowser,
} from "./diagnostics-retention-observation.ts";
test.beforeEach(async ({ browser }, info) => attachDiagnosticBrowser(browser, info));
test("DIAG-05 actual consumed retained requests and finer hits agree with the displayed totals", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/memory/app.html");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  const initial = await retentionObservation(page);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator(".canvas-footer")).toContainText("125%");
  await expect
    .poll(async () => (await retentionObservation(page)).readinessValidations)
    .toBeGreaterThan(initial.readinessValidations);
  const empty = await retentionObservation(page);
  expect(empty.geometry.preparedRequests).toBe(0);
  // At DPR1,125% requests detail2. No stroke has existed at detail1 in this document.
  await drawDiagnosticStroke(page);
  await expect
    .poll(async () => (await retentionObservation(page)).geometry.preparedMisses)
    .toBeGreaterThan(0);
  await expect
    .poll(async () => (await retentionObservation(page)).publications)
    .toBeGreaterThan(empty.publications);
  await expect
    .poll(async () => (await retentionObservation(page)).readinessValidations)
    .toBeGreaterThan(empty.readinessValidations);
  await expect.poll(async () => (await retentionObservation(page)).geometry.active).toBe(0);
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect(page.locator(".canvas-footer")).toContainText("100%");
  await page.waitForTimeout(300); // Exercise the unchanged 250ms quiet-detail retention boundary.
  const before = await retentionObservation(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await page.getByRole("button", { name: "Redo last action", exact: true }).click();
  await expect
    .poll(async () => (await retentionObservation(page)).geometry.preparedHits)
    .toBeGreaterThan(before.geometry.preparedHits);
  await expect
    .poll(async () => (await retentionObservation(page)).readinessValidations)
    .toBeGreaterThan(before.readinessValidations);
  const actual = await retentionObservation(page);
  expect(actual.geometry.preparedFinerHits).toBeGreaterThan(before.geometry.preparedFinerHits);
  expect(actual.geometry.preparedHitPages).toBeGreaterThan(before.geometry.preparedHitPages);
  expect(actual.geometry.preparedRequests).toBe(
    actual.geometry.preparedHits + actual.geometry.preparedMisses,
  );
  expect(actual.geometry.preparedFinerHits).toBeLessThanOrEqual(actual.geometry.preparedHits);
  await openDiagnostics(page);
  const panel = page.getByRole("dialog", { name: "Developer diagnostics" });
  const row = (text: string) => panel.locator("dt", { hasText: text }).locator("..").locator("dd");
  await expect(row("Prepared requests (total)")).toHaveText(
    String(actual.geometry.preparedRequests),
  );
  await expect(row("Prepared cache hits (total)")).toHaveText(String(actual.geometry.preparedHits));
  await expect(row("Prepared cache misses (total)")).toHaveText(
    String(actual.geometry.preparedMisses),
  );
  await expect(row("Finer-detail hits (total)")).toHaveText(
    String(actual.geometry.preparedFinerHits),
  );
  await expect(
    panel.getByText(
      "Memory values are cached accounting, including estimates. They may lag cleanup and do not measure physical process or GPU memory.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(row("Accepted not submitted")).toHaveText("Unavailable");
});
