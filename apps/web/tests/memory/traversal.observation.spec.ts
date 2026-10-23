import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { observeTraversal, longSyntheticSource } from "./traversal-observation.ts";
import { canvasArtwork } from "./canvas-artwork-capture.ts";
test.use({ viewport: { width: 1280, height: 900 } });
test("MIG-WORKER-13 warm all-culled index certifies exact receipt without preparation", async ({
  page,
}) => {
  test.setTimeout(60000);
  await observeTraversal(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const clip = { x: 230, y: 270, width: 540, height: 160 };
  const blank = await page.screenshot({ clip });
  const canvasPixels = () => canvasArtwork(page);
  const blankCanvas = await canvasPixels();
  await longSyntheticSource(page);
  const sourceRows: Readonly<Record<string, string | number | boolean>>[] = [];
  await expect
    .poll(async () => {
      const value = await page.evaluate(() => window["__linefieldPerfRead"]?.());
      if (!value || value.dropped) throw Error("source observation missing or dropped");
      sourceRows.push(...value.records);
      return sourceRows.some(
        (r) => r.kind === "stroke-count" && r.stroke === "1" && r.count === "65537" && !r.active,
      );
    })
    .toBe(true);
  await test.info().attach("accepted-generated-source", {
    body: JSON.stringify(sourceRows.filter((r) => r.kind === "stroke-count" && !r.active)),
    contentType: "application/json",
  });
  expect((await canvasPixels()).equals(blankCanvas)).toBe(false);
  await clear(page);
  await page.locator("canvas").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(150, 500);
  await page.mouse.down();
  await page.mouse.move(1250, 500);
  await page.mouse.up();
  await page.keyboard.up("Space");
  await page.evaluate(() => {
    document.documentElement.dataset.holdGpu = "false";
  });
  await complete(page);
  const awayCanvas = await canvasPixels();
  await test.info().attach("full-canvas-blank", { body: blankCanvas, contentType: "image/png" });
  await test.info().attach("full-canvas-away", { body: awayCanvas, contentType: "image/png" });
  expect(awayCanvas.equals(blankCanvas)).toBe(true);
  expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
  // Immutable index survives re-entry. Cold yielding is separately covered by the
  // explicitly evicted-index host fixture, not by expecting redundant preparation here.
  await page.locator(".back").click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await clear(page);
  await page.getByRole("button", { name: "Resume temporary drawing", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await page.getByRole("button", { name: "Reset canvas rotation", exact: true }).click();
  const observations: Readonly<Record<string, string | number | boolean>>[] = [];
  try {
    await complete(page, false, false, (records) => observations.push(...records));
  } finally {
    await test.info().attach("traversal-identity", {
      contentType: "application/json",
      body: JSON.stringify({
        observations,
        traversal: await page.locator("html").getAttribute("data-traversal"),
      }),
    });
  }
  await expect.poll(async () => page.locator("html").getAttribute("data-traversal")).not.toBeNull();
  const report: unknown = JSON.parse(
    (await page.locator("html").getAttribute("data-traversal")) ?? "[]",
  );
  if (!Array.isArray(report)) throw Error("invalid traversal observation");
  const latest = observations.findLast(
    (record) => record.kind === "input" && ["ok", "noop"].includes(`${record.outcome}`),
  );
  const acknowledged = observations.findLast(
    (record) =>
      record.kind === "receipt-ack" &&
      record.outcome === "ok" &&
      record.content === latest?.content &&
      record.mapping === latest?.mapping,
  );
  if (!acknowledged) throw Error("missing exact frame acknowledgement");
  const culled = report.find(
    (value: unknown) =>
      value &&
      typeof value === "object" &&
      "queries" in value &&
      "preparations" in value &&
      "hulls" in value &&
      "visits" in value &&
      "done" in value &&
      "id" in value &&
      value.id === acknowledged.receipt &&
      Number(value.queries) > 0 &&
      value.preparations === 0 &&
      value.hulls === 0 &&
      value.done === true &&
      Number(value.visits) < 512,
  );
  if (!culled || typeof culled !== "object" || !("queries" in culled))
    throw Error("warm all-culled certified frame was not exercised");
  expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
  await clear(page);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await complete(page);
  const original = await page.screenshot({ clip });
  expect(original.equals(blank)).toBe(false);
  await clear(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await complete(page);
  expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
  await expect(page.getByRole("button", { name: "Redo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  await clear(page);
  await page.getByRole("button", { name: "Redo last action", exact: true }).click();
  await complete(page, true);
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
});
