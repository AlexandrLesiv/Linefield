import { test, expect } from "@playwright/test";
import { failConcurrentPreparation } from "./diagnostics-worker-fault.ts";
import { beginCapture, openDiagnostics, downloadReport } from "./diagnostics-ui.ts";
test("DIAG-01/03 concurrent pre-first-page failure joins exact immutable preparation tickets", async ({
  page,
}) => {
  await page.addInitScript(failConcurrentPreparation);
  await page.goto("/tests/fixtures/memory/app.html");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await beginCapture(page);
  await page.mouse.move(250, 300);
  await page.mouse.down();
  await page.mouse.move(750, 550, { steps: 300 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-fixture-failed-requests",
    /^[0-9]+,[0-9]+$/,
  );
  await openDiagnostics(page);
  await page.getByRole("button", { name: "Stop capture", exact: true }).click();
  const text = await downloadReport(page);
  type Event = {
    event: string;
    generation?: string;
    request?: string;
    operation?: string;
    session?: string;
    stroke?: string;
    outcome?: string;
    count?: number;
    frame?: string;
    revision?: string;
    scene?: string;
    mapping?: string;
    admissionRevision?: string;
    admissionScene?: string;
    admissionMapping?: string;
  };
  const report: { events: Event[] } = JSON.parse(text);
  const requests =
    (await page.locator("body").getAttribute("data-fixture-failed-requests"))?.split(",") ?? [];
  expect(requests).toHaveLength(2);
  const tickets = requests.map((request) =>
    report.events.find((event) => event.event === "worker.admitted" && event.request === request),
  );
  expect(tickets[0]?.operation).not.toBe(tickets[1]?.operation);
  for (const ticket of tickets) {
    expect(ticket).toMatchObject({
      operation: expect.stringMatching(/^[1-9][0-9]*$/),
      session: expect.stringMatching(/^[1-9][0-9]*$/),
      generation: expect.stringMatching(/^[1-9][0-9]*$/),
      frame: expect.stringMatching(/^[1-9][0-9]*$/),
      admissionRevision: expect.stringMatching(/^[0-9]+$/),
      admissionScene: expect.stringMatching(/^[0-9]+$/),
      admissionMapping: expect.stringMatching(/^[0-9]+$/),
    });
    expect(ticket?.revision).toBeUndefined();
    expect(ticket?.scene).toBeUndefined();
    expect(ticket?.mapping).toBeUndefined();
    expect(report.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "worker.started",
          request: ticket?.request,
          generation: ticket?.generation,
        }),
        expect.objectContaining({
          event: "worker.rejected",
          request: ticket?.request,
          generation: ticket?.generation,
          operation: ticket?.operation,
          session: ticket?.session,
          count: 0,
        }),
      ]),
    );
  }
  expect(text).not.toMatch(/points|parameters|pressure|clientX/);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
});
