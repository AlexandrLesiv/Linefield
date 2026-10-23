import { test, expect } from "@playwright/test";
import {
  beginCapture,
  openDiagnostics,
  drawDiagnosticStroke,
  downloadReport,
} from "./diagnostics-ui.ts";
test.beforeEach(async ({ page }) => {
  await page.goto("/tests/fixtures/memory/app.html");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
});
test("DIAG-01/04 empty editor reports no fabricated worker work", async ({ page }) => {
  await beginCapture(page);
  await openDiagnostics(page);
  await page.getByRole("button", { name: "Stop capture", exact: true }).click();
  const text = await downloadReport(page);
  expect(text).not.toMatch(/worker.started|worker.finished|worker.rejected/);
});
test("DIAG-01/03 worker sink failure freezes diagnostics without failing real drawing", async ({
  page,
}) => {
  await beginCapture(page);
  await page.evaluate(() =>
    document.dispatchEvent(new CustomEvent("fixture-diagnostics", { detail: "worker-sink" })),
  );
  await drawDiagnosticStroke(page);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-fixture-worker-sink", "failed-once");
  await openDiagnostics(page);
  const text = await downloadReport(page);
  expect(JSON.parse(text)).toMatchObject({ reason: "sink", partial: true });
  expect(text).not.toContain("PRIVATE_WORKER_SINK_CANARY");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect(page.getByRole("button", { name: "Redo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
});
test("DIAG-01/04 real preparation joins immutable ticket identity and rejects duplicate late delivery", async ({
  page,
}) => {
  // Duplicate one actual validated worker response after its waiter was already consumed.
  await page.addInitScript(() => {
    const Original = Worker;
    let duplicated = false;
    class ObservedWorker extends Original {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        const property = Object.getOwnPropertyDescriptor(Original.prototype, "onmessage");
        Object.defineProperty(this, "onmessage", {
          configurable: true,
          set(handler: ((event: MessageEvent<unknown>) => void) | null) {
            property?.set?.call(this, (event: MessageEvent<unknown>) => {
              handler?.call(this, event);
              const value = event.data;
              if (
                !duplicated &&
                value &&
                typeof value === "object" &&
                "kind" in value &&
                value.kind === "page"
              ) {
                duplicated = true;
                handler?.call(this, event);
                document.body.dataset.fixtureWorkerDuplicate = "delivered";
              }
            });
          },
        });
      }
    }
    window.Worker = ObservedWorker;
  });
  await page.goto("/tests/fixtures/memory/app.html");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await beginCapture(page);
  await drawDiagnosticStroke(page);
  // Accurate camera replacement requests retained preparation through the real worker.
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-fixture-worker-duplicate", "delivered");
  await openDiagnostics(page);
  await page.getByRole("button", { name: "Stop capture", exact: true }).click();
  const text = await downloadReport(page);
  const report: {
    events: {
      event: string;
      generation?: string;
      request?: string;
      operation?: string;
      session?: string;
      stroke?: string;
      outcome?: string;
    }[];
  } = JSON.parse(text);
  const ticket = report.events.find(
    (event) =>
      event.event === "worker.finished" && event.operation && event.outcome === "completed",
  );
  expect(ticket).toMatchObject({
    generation: expect.stringMatching(/^[1-9][0-9]*$/),
    request: expect.stringMatching(/^[1-9][0-9]*$/),
    session: expect.stringMatching(/^[1-9][0-9]*$/),
    stroke: expect.stringMatching(/^[1-9][0-9]*$/),
  });
  expect(report.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        event: "worker.started",
        generation: ticket?.generation,
        request: ticket?.request,
      }),
      expect.objectContaining({
        event: "worker.finished",
        generation: ticket?.generation,
        request: ticket?.request,
      }),
      expect.objectContaining({ event: "worker.rejected", outcome: "stale" }),
    ]),
  );
  const executorFinish = report.events.find(
    (event) =>
      event.event === "worker.finished" &&
      event.operation === undefined &&
      event.generation === ticket?.generation &&
      event.request === ticket?.request,
  );
  expect(executorFinish).toBeDefined();
  expect(text).not.toMatch(/points|parameters|originX|originY|clientX|pressure/);
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
});
