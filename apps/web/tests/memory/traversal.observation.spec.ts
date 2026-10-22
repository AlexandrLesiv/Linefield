import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { observeTraversal, longSyntheticSource } from "./traversal-observation.ts";
test("MIG-WORKER-13 all-culled source traversal yields actual tasks before complete acknowledgement", async ({
  page,
}) => {
  test.setTimeout(60000);
  await observeTraversal(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await longSyntheticSource(page);
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
      "calls" in value &&
      "culled" in value &&
      "id" in value &&
      value.id === acknowledged.receipt &&
      Number(value.calls) >= 512 &&
      value.calls === value.culled,
  );
  if (
    !culled ||
    typeof culled !== "object" ||
    !("calls" in culled) ||
    !("max" in culled) ||
    !("turns" in culled)
  )
    throw Error("all-culled frame traversal was not exercised");
  expect(Number(culled.turns)).toBeGreaterThan(1);
  expect(Number(culled.max)).toBeLessThan(Number(culled.calls));
  await clear(page);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await complete(page);
  await clear(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await complete(page);
  await expect(page.getByRole("button", { name: "Redo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
});
