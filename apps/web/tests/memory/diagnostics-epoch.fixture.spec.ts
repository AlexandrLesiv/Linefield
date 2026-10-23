import { test, expect } from "@playwright/test";
import { preparationEpochFault } from "./diagnostics-epoch-fault.ts";
import { beginCapture, openDiagnostics, downloadReport } from "./diagnostics-ui.ts";
interface Event {
  event: string;
  generation?: string;
  request?: string;
  operation?: string;
  session?: string;
  origin?: string;
  cause?: string;
  outcome?: string;
}
for (const mode of ["fallback", "replacement", "paused"] as const)
  test(`DIAG-01/03 ${mode} cancellation keeps the dispatched worker's own first cause`, async ({
    page,
  }) => {
    await page.addInitScript(preparationEpochFault, mode);
    await page.goto("/tests/fixtures/memory/app.html");
    await page.locator(".new-tile").click();
    await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
    await beginCapture(page);
    await page.evaluate((detail) => {
      document.dispatchEvent(new CustomEvent("fixture-job-hold", { detail }));
    }, mode);
    await page.mouse.move(250, 300);
    await page.mouse.down();
    await page.mouse.move(750, 550, { steps: 300 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    if (mode === "replacement") {
      await expect(page.locator("body")).toHaveAttribute("data-fixture-epoch-failure", "1");
      // Cross the real power-of-two detail boundary; 125% to156% reuses retained detail2.
      for (let step = 0; step < 3; step++)
        await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    }
    await expect(page.locator("body")).toHaveAttribute("data-fixture-held-job", /request/);
    const held: { generation: string; request: string; urgent: boolean } = JSON.parse(
      (await page.locator("body").getAttribute("data-fixture-held-job")) ?? "{}",
    );
    expect(held.request).toMatch(/^[1-9][0-9]*$/);
    expect(held.urgent).toBe(mode === "fallback");
    if (mode !== "replacement")
      await page.evaluate(() => document.dispatchEvent(new Event("fixture-worker-error")));
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await page.evaluate(() => document.dispatchEvent(new Event("fixture-job-release")));
    await expect(page.locator("body")).toHaveAttribute(
      "data-fixture-job-released",
      "fixture-job-release",
    );
    await expect(
      page.getByRole("button", { name: "Redo last action", exact: true }),
    ).toHaveAttribute("aria-disabled", "false");
    await openDiagnostics(page);
    await page.getByRole("button", { name: "Stop capture", exact: true }).click();
    const report: { events: Event[] } = JSON.parse(await downloadReport(page));
    const terminal = report.events.filter(
      (event) =>
        event.event === "worker.rejected" &&
        !event.operation &&
        event.generation === held.generation &&
        event.request === held.request,
    );
    expect(terminal).toHaveLength(1);
    expect(terminal[0]).toMatchObject({
      cause: mode === "paused" ? "worker-error" : "cancelled",
      outcome: mode === "paused" ? "failed" : "cancelled",
      origin: mode === "fallback" ? "renderer" : "worker",
    });
    const admission = report.events.find(
      (event) =>
        event.event === "worker.admitted" &&
        event.generation === held.generation &&
        event.request === held.request,
    );
    expect(admission?.operation).toMatch(/^[1-9][0-9]*$/);
    const ticket = report.events.filter(
      (event) =>
        event.event === "worker.rejected" &&
        event.operation === admission?.operation &&
        event.request === held.request &&
        event.generation === held.generation &&
        event.session === admission?.session,
    );
    expect(ticket).toHaveLength(1);
    // Camera/history invalidation is the cache boundary's separate observed stale cause.
    expect(ticket[0]).toMatchObject({ cause: "stale", outcome: "stale" });
  });
