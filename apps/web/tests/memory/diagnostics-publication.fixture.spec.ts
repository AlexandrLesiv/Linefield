import { test, expect } from "@playwright/test";
import { beginCapture, openDiagnostics, downloadReport } from "./diagnostics-ui.ts";
import {
  retentionObservation,
  attachDiagnosticBrowser,
} from "./diagnostics-retention-observation.ts";
test.beforeEach(async ({ browser }, info) => attachDiagnosticBrowser(browser, info));
interface Record {
  event: string;
  command?: string;
  session?: string;
  interaction?: string;
  revision?: string;
  sourceRevision?: string;
  sourceMapping?: string;
  sourceThrough?: string;
  operation?: string;
  generation?: string;
  stroke?: string;
}
test("DIAG-01/05 real prefix publication during a new stroke is distinct from idle readiness validation", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/memory/app.html");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await beginCapture(page);
  await page.mouse.move(250, 300);
  await page.mouse.down();
  await page.mouse.move(750, 500, { steps: 300 });
  await page.mouse.up();
  await expect
    .poll(async () => (await retentionObservation(page)).resources?.hostGeometry ?? 0)
    .toBeGreaterThan(0);
  await page.evaluate(() =>
    document.dispatchEvent(new CustomEvent("fixture-job-hold", { detail: "paused" })),
  );
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-fixture-held-job", /request/);
  await page.mouse.move(300, 600);
  await page.mouse.down();
  await page.mouse.move(500, 650, { steps: 5 });
  const before = await retentionObservation(page);
  await page.evaluate(() => document.dispatchEvent(new Event("fixture-job-release")));
  await expect(page.locator("body")).toHaveAttribute(
    "data-fixture-job-released",
    "fixture-job-release",
  );
  await expect
    .poll(async () => (await retentionObservation(page)).publications)
    .toBeGreaterThan(before.publications);
  expect((await retentionObservation(page)).readinessValidations).toBe(before.readinessValidations);
  // Keep the second completed candidate unfinished while the third real stroke starts.
  // Its preceding live layer must be consumed into the display graph without a publication.
  await page.evaluate(() =>
    document.dispatchEvent(new CustomEvent("fixture-job-hold", { detail: "paused" })),
  );
  await page.mouse.up();
  await expect(page.locator("body")).toHaveAttribute("data-fixture-held-job", /request/);
  const beforeConsume = await retentionObservation(page);
  await page.mouse.move(600, 600);
  await page.mouse.down();
  await page.mouse.move(700, 650, { steps: 5 });
  await expect
    .poll(async () => (await retentionObservation(page)).copybacks)
    .toBeGreaterThan(beforeConsume.copybacks);
  expect((await retentionObservation(page)).copybackPublications).toBe(0);
  await page.evaluate(() => document.dispatchEvent(new Event("fixture-job-release")));
  await expect(page.locator("body")).toHaveAttribute(
    "data-fixture-job-released",
    "fixture-job-release",
  );
  await expect
    .poll(async () => (await retentionObservation(page)).publications)
    .toBeGreaterThan(beforeConsume.publications);
  expect((await retentionObservation(page)).readinessValidations).toBe(before.readinessValidations);
  await page.mouse.up();
  await expect
    .poll(async () => (await retentionObservation(page)).readinessValidations)
    .toBeGreaterThan(before.readinessValidations);
  const after = await retentionObservation(page);
  expect(after.copybacks).toBeGreaterThan(0);
  expect(after.copybackPublications).toBe(0);
  expect(after.diagnostic.publications).toBe(after.publications);
  await openDiagnostics(page);
  await page.getByRole("button", { name: "Stop capture", exact: true }).click();
  const report: { events: Record[] } = JSON.parse(await downloadReport(page));
  const begins = report.events.filter((value) => value.command === "begin");
  const lastBegin = begins.at(-1);
  expect(lastBegin?.interaction).toMatch(/^[1-9][0-9]*$/);
  const during = report.events.filter(
    (value) => value.event === "frame.published" && value.interaction === lastBegin?.interaction,
  );
  expect(during.length).toBeGreaterThan(0);
  for (const publication of during) {
    expect(publication).toMatchObject({
      session: lastBegin?.session,
      sourceRevision: lastBegin?.revision,
    });
    expect(publication.sourceMapping).toMatch(/^[0-9]+$/);
    expect(publication.sourceThrough).toMatch(/^[1-9][0-9]*$/);
    expect(
      report.events.filter(
        (value) =>
          value.event === "frame.published" &&
          value.session === publication.session &&
          value.generation === publication.generation &&
          value.operation === publication.operation,
      ),
    ).toHaveLength(1);
  }
  expect(report.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        event: "frame.trace",
        session: lastBegin?.session,
        interaction: lastBegin?.interaction,
        stroke: expect.stringMatching(/^[1-9][0-9]*$/),
      }),
    ]),
  );
});
