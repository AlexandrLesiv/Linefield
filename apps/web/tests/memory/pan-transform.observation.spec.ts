import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { installCandidateTurnHold } from "./candidate-turn-hold.ts";
import type { Page } from "@playwright/test";
type Row = Readonly<Record<string, string | number | boolean>>;
const clip = { x: 180, y: 200, width: 920, height: 550 };
async function begin(page: Page, key: string) {
  await page.locator("canvas").focus();
  await page.keyboard.down(key);
  await page.mouse.move(1000, 450);
  await page.mouse.down();
}
async function end(page: Page, key: string, rows: Row[]) {
  await clear(page);
  await page.mouse.up();
  await page.keyboard.up(key);
  await complete(page, false, false, (value) => rows.push(...value));
}
async function reset(page: Page) {
  await clear(page);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await complete(page);
}
test("MIG-PAN-REVEAL-04 fractional reversal and changing held rotation reconstruct exact AA", async ({
  page,
  browser,
}, info) => {
  await installCandidateTurnHold(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const blank = await page.screenshot({ clip });
  await clear(page);
  await page.mouse.move(550, 350);
  await page.mouse.down();
  await page.mouse.move(800, 580, { steps: 48 });
  await page.mouse.up();
  await complete(page);
  const original = await page.screenshot({ clip });
  expect(original.equals(blank)).toBe(false);
  const rows: Row[] = [];
  for (const key of ["Space", "r"]) {
    const points =
      key === "Space"
        ? [
            [900.375, 470.625],
            [1080.625, 420.375],
          ]
        : [
            [900.375, 600.625],
            [750.625, 750.375],
          ];
    const references: Buffer[] = [];
    for (const point of points) {
      const [x, y] = point;
      if (x === undefined || y === undefined) throw Error("point");
      await reset(page);
      await begin(page, key);
      await page.mouse.move(x, y, { steps: 6 });
      await end(page, key, rows);
      references.push(await page.screenshot({ clip }));
    }
    await reset(page);
    await clear(page);
    const firstRecord = rows.length;
    await begin(page, key);
    await page.evaluate(() => {
      document.documentElement.dataset.holdCandidateTurn = "true";
    });
    const first = points[0],
      last = points[1];
    if (
      !first ||
      !last ||
      first[0] === undefined ||
      first[1] === undefined ||
      last[0] === undefined ||
      last[1] === undefined
    )
      throw Error("point");
    await page.mouse.move(first[0], first[1]);
    await expect
      .poll(async () => {
        const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
        if (!snapshot || snapshot.dropped) throw Error("observation overflow");
        rows.push(...snapshot.records);
        return snapshot.records.some((r) => r.kind === "frame-batch");
      })
      .toBe(true);
    await expect
      .poll(async () => Number(await page.locator("html").getAttribute("data-candidate-turns")))
      .toBeGreaterThan(0);
    await page.mouse.move(last[0], last[1]);
    await page.evaluate(() => document.dispatchEvent(new Event("release-candidate-turn")));
    for (const index of [1, 0, 1, 0]) {
      const point = points[index],
        reference = references[index];
      if (!point || point[0] === undefined || point[1] === undefined || !reference)
        throw Error("reference");
      await page.mouse.move(point[0], point[1], { steps: 4 });
      const intermediate = await page.screenshot({ clip });
      await info.attach(`${key}-${index}-intermediate`, {
        body: intermediate,
        contentType: "image/png",
      });
      expect(intermediate.equals(blank), "held transformed ink remains visible").toBe(false);
      let actual = intermediate;
      try {
        await expect
          .poll(async () => {
            const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
            if (!snapshot || snapshot.dropped) throw Error("observation overflow");
            rows.push(...snapshot.records);
            expect(snapshot.records.some((r) => r.kind === "receipt-ack")).toBe(false);
            actual = await page.screenshot({ clip });
            return actual.equals(reference);
          })
          .toBe(true);
      } finally {
        await info.attach(`${key}-${index}-canonical`, {
          body: reference,
          contentType: "image/png",
        });
        await info.attach(`${key}-${index}-held`, { body: actual, contentType: "image/png" });
      }
    }
    await info.attach(`${key}-controlled-transitions`, {
      body: JSON.stringify(rows.slice(firstRecord)),
      contentType: "application/json",
    });
    expect(
      rows
        .slice(firstRecord)
        .some((r) => r.kind === "coverage-transition" && r.phase === "view-consume"),
    ).toBe(true);
    if (key === "Space") {
      await end(page, key, rows);
      expect(
        (await page.screenshot({ clip })).equals(references[0] ?? Buffer.alloc(0)),
        "exact ended fractional view",
      ).toBe(true);
      await reset(page);
    } else {
      await clear(page);
      await page.keyboard.press("Escape");
      await page.mouse.up();
      await page.keyboard.up(key);
      await complete(page, false, false, (value) => rows.push(...value));
    }
    expect(
      (await page.screenshot({ clip })).equals(original),
      "exact cancelled canonical view",
    ).toBe(true);
  }
  await info.attach("controlled-actual-route", {
    body: JSON.stringify({
      browser: browser.version(),
      rows,
      evidence:
        "bounded real host task hold; exact held reconstruction vs canonical AA, no timing claim",
    }),
    contentType: "application/json",
  });
  expect(rows.some((r) => r.kind === "coverage-transition" && r.phase === "view-consume")).toBe(
    true,
  );
});
