import { test, expect } from "@playwright/test";
import {
  beginCapture,
  openDiagnostics,
  drawDiagnosticStroke,
  downloadReport,
} from "./diagnostics-ui.ts";
import {
  retentionObservation,
  attachDiagnosticBrowser,
} from "./diagnostics-retention-observation.ts";
test.beforeEach(async ({ browser }, info) => attachDiagnosticBrowser(browser, info));
for (const mode of ["hold", "reject", "ticket"] as const)
  test(`DIAG-01/03/05 actual application retention ${mode} preserves truthful accounting and failure export`, async ({
    page,
  }) => {
    await page.goto("/tests/fixtures/memory/app.html");
    await page.locator(".new-tile").click();
    const canvas = page.locator("[data-memory-canvas]");
    await expect(canvas).toHaveAttribute("data-state", "ready");
    await beginCapture(page);
    const initial = await retentionObservation(page);
    await drawDiagnosticStroke(page);
    await expect
      .poll(async () => (await retentionObservation(page)).resources?.hostGeometry ?? 0)
      .toBeGreaterThan(0);
    await expect
      .poll(async () => (await retentionObservation(page)).readinessValidations)
      .toBeGreaterThan(initial.readinessValidations);
    await expect.poll(async () => (await retentionObservation(page)).geometry.active).toBe(0);
    await page.evaluate(
      (detail) => document.dispatchEvent(new CustomEvent("fixture-retention-arm", { detail })),
      mode,
    );
    if (mode === "ticket") {
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      await expect(page.locator("body")).toHaveAttribute(
        "data-fixture-ticket-fault",
        "invalid-once",
      );
    } else {
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(page.locator("body")).toHaveAttribute(
        "data-fixture-retirement-held",
        /^[1-9][0-9]*$/,
      );
      expect((await retentionObservation(page)).retiring.bytes).toBeGreaterThan(0);
      await page.evaluate(() => document.dispatchEvent(new Event("fixture-retirement-release")));
      await expect(page.locator("body")).toHaveAttribute(
        "data-fixture-retirement-released",
        "fixture-retirement-release",
      );
    }
    if (mode === "hold") {
      await expect(canvas).toHaveAttribute("data-state", "ready");
      await expect.poll(async () => (await retentionObservation(page)).retiring.bytes).toBe(0);
      await drawDiagnosticStroke(page, 600);
    } else {
      await expect(canvas).toHaveAttribute("data-state", "resourceUnavailable");
      const current = await retentionObservation(page);
      if (mode === "reject") expect(current.retiring.bytes).toBeGreaterThan(0);
      else expect(current.retiring.uncertainTickets).toBeGreaterThan(0);
    }
    await openDiagnostics(page);
    await page.getByRole("button", { name: "Stop capture", exact: true }).click();
    const text = await downloadReport(page);
    expect(text).not.toContain("PRIVATE_CLEANUP_CANARY");
    const report: {
      events: {
        event: string;
        cause?: string;
        operation?: string;
        request?: string;
        outcome?: string;
      }[];
    } = JSON.parse(text);
    if (mode !== "hold")
      expect(report.events.some((value) => value.event === "resource.failure")).toBe(true);
    if (mode === "ticket") {
      const failure = report.events.find(
        (value) => value.event === "resource.failure" && value.cause === "cleanup-failed",
      );
      expect(failure?.operation).toMatch(/^[1-9][0-9]*$/);
      expect(failure?.request).toMatch(/^[1-9][0-9]*$/);
      const terminal = report.events.filter(
        (value) =>
          value.event === "worker.rejected" &&
          value.operation === failure?.operation &&
          value.request === failure?.request,
      );
      expect(terminal).toHaveLength(1);
      expect(terminal[0]?.cause).toBe("cleanup-failed");
      expect(
        report.events.some(
          (value) => value.event === "worker.finished" && value.operation === failure?.operation,
        ),
      ).toBe(false);
    }
  });
