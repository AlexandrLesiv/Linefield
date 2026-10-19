import { test, expect } from "@playwright/test";
test("WMP-05/11 isolated pan translation failure preserves owner and requires explicit display Retry", async ({
  page,
}, info) => {
  await page.goto("/tests/fixtures/memory/app.html");
  await page.locator(".new-tile").click();
  const canvas = page.locator("[data-memory-canvas]");
  const ready = () => expect(canvas).toHaveAttribute("data-state", "ready");
  await ready();
  const clip = { x: 100, y: 200, width: 650, height: 350 };
  const blank = await page.screenshot({ clip });
  await page.mouse.move(250, 300);
  await page.mouse.down();
  await page.mouse.move(400, 350, { steps: 8 });
  await page.mouse.up();
  await ready();
  const ink = await page.screenshot({ clip });
  await page.keyboard.down("Space");
  await page.mouse.move(550, 450);
  await page.mouse.down();
  await page.evaluate(() => document.dispatchEvent(new Event("fixture-fail-pan-translation")));
  await page.mouse.move(600, 500);
  await expect(canvas).toHaveAttribute("data-state", "resourceUnavailable");
  await page.mouse.up();
  await page.keyboard.up("Space");
  await page.evaluate(async () => {
    for (let i = 0; i < 8; i++)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    document.dispatchEvent(new Event("fixture-observe"));
  });
  await expect(canvas).toHaveAttribute("data-state", "resourceUnavailable");
  const diagnostics = JSON.parse(
    (await page.locator("body").getAttribute("data-fixture-diagnostics")) ?? "{}",
  );
  const failure = diagnostics.records.findLastIndex(
    (v: { command: string; outcome: string }) => v.command === "display" && v.outcome === "failed",
  );
  expect(failure).toBeGreaterThanOrEqual(0);
  expect(
    diagnostics.records
      .slice(failure + 1)
      .some((v: { command: string }) => v.command === "metrics"),
  ).toBe(false);
  await page.screenshot({ path: info.outputPath("pan-resource-failure.png") });
  await page.getByRole("button", { name: "Retry display", exact: true }).click();
  await ready();
  expect((await page.screenshot({ clip })).equals(ink)).toBe(true);
  await page.locator("[data-memory-undo]").click();
  await ready();
  expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
  await page.evaluate(() => document.dispatchEvent(new Event("fixture-observe")));
  const recovered = JSON.parse(
    (await page.locator("body").getAttribute("data-fixture-diagnostics")) ?? "{}",
  );
  expect(recovered.records.filter((v: { command: string }) => v.command === "create")).toHaveLength(
    1,
  );
});
