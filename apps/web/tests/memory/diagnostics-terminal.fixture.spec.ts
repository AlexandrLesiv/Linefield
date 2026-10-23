import { test, expect } from "@playwright/test";
import { preparationFault } from "./diagnostics-terminal-fault.ts";
import { beginCapture, openDiagnostics, downloadReport } from "./diagnostics-ui.ts";
interface Event {
  event: string;
  generation?: string;
  request?: string;
  operation?: string;
  session?: string;
  cause?: string;
  outcome?: string;
  count?: number;
}
for (const mode of ["timeout", "cancel", "midstream", "preadmission"] as const)
  test(`DIAG-01/03 ${mode} has a distinct correlated terminal cause without changing history`, async ({
    page,
  }) => {
    await page.addInitScript(preparationFault, mode);
    await page.goto("/tests/fixtures/memory/app.html");
    await page.locator(".new-tile").click();
    await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
    await beginCapture(page);
    await page.mouse.move(250, 300);
    await page.mouse.down();
    await page.mouse.move(750, 550, { steps: 300 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    if (mode === "preadmission") {
      await expect(page.locator("body")).toHaveAttribute("data-fixture-ready-held", "true");
      await expect
        .poll(async () =>
          page.evaluate(() => {
            document.dispatchEvent(new Event("fixture-observe"));
            const value: { geometry: { queue: number } } = JSON.parse(
              document.body.dataset.fixtureDiagnostics ?? "{}",
            );
            return value.geometry.queue;
          }),
        )
        .toBeGreaterThan(0);
    } else if (mode === "midstream")
      await expect(page.locator("body")).toHaveAttribute("data-fixture-midstream", /^[0-9]+$/);
    else
      await expect(page.locator("body")).toHaveAttribute(
        "data-fixture-held-requests",
        /^[0-9]+,[0-9]+$/,
      );
    if (mode === "cancel" || mode === "preadmission")
      await page.setViewportSize({ width: 1200, height: 800 });
    if (mode === "timeout") await page.waitForTimeout(10_100); // Exercise the unchanged real10s timeout.
    await openDiagnostics(page);
    await page.getByRole("button", { name: "Stop capture", exact: true }).click();
    const report: { events: Event[] } = JSON.parse(await downloadReport(page));
    const cause =
      mode === "timeout" ? "timeout" : mode === "midstream" ? "worker-failed" : "disposed";
    const outcomes = report.events.filter(
      (event) => event.event === "worker.rejected" && event.operation && event.cause === cause,
    );
    expect(outcomes.length).toBeGreaterThan(0);
    const requests =
      mode === "timeout" || mode === "cancel"
        ? ((await page.locator("body").getAttribute("data-fixture-held-requests"))?.split(",") ??
          [])
        : [];
    if (requests.length)
      expect(outcomes.filter((event) => requests.includes(event.request ?? "")).length).toBe(2);
    for (const outcome of outcomes) {
      expect(outcome.outcome).toBe(
        mode === "cancel" || mode === "preadmission" ? "cancelled" : "failed",
      );
      if (mode === "preadmission") expect(outcome.request).toBeUndefined();
      else {
        expect(outcome.request).toMatch(/^[1-9][0-9]*$/);
        expect(report.events).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              event: "worker.admitted",
              generation: outcome.generation,
              request: outcome.request,
              operation: outcome.operation,
              session: outcome.session,
            }),
          ]),
        );
      }
      const executor = report.events.filter(
        (event) =>
          event.event === "worker.rejected" &&
          !event.operation &&
          event.generation === outcome.generation &&
          event.request === outcome.request &&
          event.cause === cause,
      );
      expect(executor.length).toBe(mode === "preadmission" ? outcomes.length : 1);
      expect(
        report.events.filter(
          (event) =>
            event.event === "worker.rejected" &&
            event.operation === outcome.operation &&
            event.request === outcome.request,
        ).length,
      ).toBe(1);
    }
    if (mode === "midstream") expect(outcomes.some((event) => (event.count ?? 0) > 0)).toBe(true);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Redo last action", exact: true }),
    ).toHaveAttribute("aria-disabled", "false");
  });
