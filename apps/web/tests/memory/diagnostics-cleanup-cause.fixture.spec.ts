import { test, expect } from "@playwright/test";
import { beginCapture, openDiagnostics, downloadReport } from "./diagnostics-ui.ts";
import { preparationFault } from "./diagnostics-terminal-fault.ts";
import { preparationEpochFault } from "./diagnostics-epoch-fault.ts";
import {
  retentionObservation,
  attachDiagnosticBrowser,
} from "./diagnostics-retention-observation.ts";
interface Record {
  event: string;
  operation?: string;
  request?: string;
  generation?: string;
  session?: string;
  cause?: string;
  outcome?: string;
}
test.beforeEach(async ({ browser }, info) => attachDiagnosticBrowser(browser, info));
for (const mode of ["worker-failed", "generator-return"] as const)
  test(`DIAG-01/03 ${mode} preserves its first cause when the real ticket cleanup also fails`, async ({
    page,
  }, info) => {
    if (mode === "worker-failed")
      await page.addInitScript(preparationFault, "armed-midstream" as const);
    else await page.addInitScript(preparationEpochFault, "paused" as const);
    await page.goto("/tests/fixtures/memory/app.html");
    await page.locator(".new-tile").click();
    const canvas = page.locator("[data-memory-canvas]");
    await expect(canvas).toHaveAttribute("data-state", "ready");
    await beginCapture(page);
    await page.mouse.move(250, 300);
    await page.mouse.down();
    await page.mouse.move(750, 550, { steps: 300 });
    await page.mouse.up();
    await expect
      .poll(async () => (await retentionObservation(page)).publications)
      .toBeGreaterThan(1);
    await expect.poll(async () => (await retentionObservation(page)).geometry.active).toBe(0);
    await page.evaluate(() =>
      document.dispatchEvent(new CustomEvent("fixture-job-hold", { detail: "paused" })),
    );
    if (mode === "worker-failed")
      await page.evaluate(() => document.dispatchEvent(new Event("fixture-worker-midstream-arm")));
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await expect(page.locator("body")).toHaveAttribute("data-fixture-held-job", /request/);
    const held: { generation: string; request: string } = JSON.parse(
      (await page.locator("body").getAttribute("data-fixture-held-job")) ?? "{}",
    );
    const admission = (await retentionObservation(page)).diagnostic.admissions.find(
      (value) => value.generation === held.generation && value.request === held.request,
    );
    expect(admission?.operation).toMatch(/^[1-9][0-9]*$/);
    if (!admission) throw Error("actual held job admission absent");
    await page.evaluate(
      (operation) =>
        document.dispatchEvent(
          new CustomEvent("fixture-retention-arm", { detail: { mode: "ticket", operation } }),
        ),
      admission.operation,
    );
    if (mode === "generator-return") {
      await page.evaluate(() => document.dispatchEvent(new Event("fixture-worker-error")));
      await expect(page.locator("body")).toHaveAttribute(
        "data-fixture-epoch-failure",
        /^[1-9][0-9]*$/,
      );
      await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    }
    await page.evaluate(() => document.dispatchEvent(new Event("fixture-job-release")));
    await expect(page.locator("body")).toHaveAttribute(
      "data-fixture-job-released",
      "fixture-job-release",
    );
    await expect(page.locator("body")).toHaveAttribute(
      "data-fixture-ticket-fault-operation",
      admission.operation,
    );
    await expect(canvas).toHaveAttribute("data-state", "resourceUnavailable");
    await expect
      .poll(async () => (await retentionObservation(page)).retiring.uncertainTickets ?? 0)
      .toBeGreaterThan(0);
    const firstCause = await page.locator("body").getAttribute("data-fixture-first-job-cause");
    if (mode === "worker-failed") expect(firstCause).toBe("worker-failed");
    else expect(["worker-error", "stale", "disposed"]).toContain(firstCause);
    // On return, current-scene invalidation and iterator unwinding can race. Whichever real
    // safe cause arrives first must survive, rather than being replaced by cleanup-failed.
    await info.attach("actual-cause-boundary", {
      body: JSON.stringify({ held, admission, firstCause }),
      contentType: "application/json",
    });
    await openDiagnostics(page);
    await page.getByRole("button", { name: "Stop capture", exact: true }).click();
    const report: { events: Record[] } = JSON.parse(await downloadReport(page));
    const sameJob = (value: Record) =>
      value.generation === held.generation && value.request === held.request;
    const cleanup = report.events.filter(
      (value) =>
        sameJob(value) &&
        value.operation === admission.operation &&
        value.event === "resource.failure" &&
        value.cause === "cleanup-failed",
    );
    expect(cleanup).toHaveLength(1);
    const ticket = report.events.filter(
      (value) =>
        sameJob(value) &&
        value.operation === admission.operation &&
        value.event === "worker.rejected",
    );
    expect(ticket).toHaveLength(1);
    expect(ticket[0]).toMatchObject({ cause: firstCause, session: admission.session });
    const executor = report.events.filter(
      (value) => sameJob(value) && !value.operation && value.event === "worker.rejected",
    );
    expect(executor).toHaveLength(1);
    expect(executor[0]?.cause).toBe(mode === "worker-failed" ? "worker-failed" : "worker-error");
    expect(report.events.some((value) => sameJob(value) && value.event === "worker.finished")).toBe(
      false,
    );
  });
