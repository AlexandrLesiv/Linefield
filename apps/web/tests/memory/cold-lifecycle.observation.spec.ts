import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import {
  checkAdmissions,
  coldSource,
  holdColdReplies,
  readCold,
  releaseCold,
  resumeCold,
} from "./cold-observation.ts";
import type { ColdRecord } from "./cold-observation.ts";
for (const interruption of ["Back", "context loss"] as const) {
  test(`MIG-WORKER-${interruption === "Back" ? 27 : 28} pending cold gate retires on ${interruption} without stale publication`, async ({
    page,
  }, info) => {
    await holdColdReplies(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    const clip = { x: 200, y: 220, width: 700, height: 400 };
    const blank = await page.screenshot({ clip });
    const source = await coldSource(page);
    await complete(page, false, false, (rows) => source.push(...rows));
    await info.attach("source-counts", {
      body: JSON.stringify(source.filter((r) => r.kind === "stroke-count" || r.kind === "input")),
      contentType: "application/json",
    });
    expect(source.some((r) => r.kind === "stroke-count" && r.count === "8193" && !r.active)).toBe(
      true,
    );
    const original = await page.screenshot({ clip });
    expect(original.equals(blank)).toBe(false);
    await clear(page);
    await resumeCold(page);
    await expect
      .poll(async () => Number(await page.locator("html").getAttribute("data-cold-held")))
      .toBe(8);
    const records: ColdRecord[] = await readCold(page);
    // Lifecycle identity belongs to the resumed candidate, not an input latency sample.
    const resumed = records.findLast((r) => r.kind === "overlay-submit");
    const previous = source.findLast((r) => r.kind === "input" && r.command === "end");
    expect(resumed).toBeDefined();
    expect(previous).toBeDefined();
    expect(resumed?.owner).toBe(previous?.owner);
    expect(resumed?.content).toBe(previous?.content);
    expect(resumed?.session).not.toBe(previous?.session);
    expect(records.filter((r) => r.kind === "frame-batch")).toHaveLength(0);
    if (interruption === "context loss") {
      await releaseCold(page, 1);
      await expect
        .poll(async () => {
          records.push(...(await readCold(page)));
          return records.some((r) => r.kind === "frame-admission" && r.reason === "age");
        })
        .toBe(true);
    }
    let extension;
    if (interruption === "Back") {
      await page.locator(".back").click();
      await expect(page.locator("canvas")).toHaveCount(0);
    } else {
      extension = await page.locator("canvas").evaluateHandle((canvas) => {
        if (!(canvas instanceof HTMLCanvasElement)) throw Error("canvas");
        const loss = canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context");
        if (!loss) throw Error("context loss unsupported");
        loss.loseContext();
        return loss;
      });
      await expect(page.locator("canvas")).toHaveAttribute("data-state", "displayLost");
    }
    await expect
      .poll(async () => {
        records.push(...(await readCold(page)));
        return records.some((r) => r.kind === "frame-retired" && r.cancelled);
      })
      .toBe(true);
    const gates = checkAdmissions(records);
    const stopped = gates.find((r) => r.reason === "stopped");
    expect(stopped).toBeDefined();
    if (interruption === "Back") {
      expect(gates.every((r) => r.peakTimers === 0)).toBe(true);
      expect(records.filter((r) => r.kind === "frame-batch")).toHaveLength(0);
    }
    await releaseCold(page, 8, true);
    if (extension) {
      await extension.evaluate((value) => value.restoreContext());
      await extension.dispose();
    } else
      await page.getByRole("button", { name: "Resume temporary drawing", exact: true }).click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    await clear(page);
    await page.getByRole("button", { name: "Reset view", exact: true }).click();
    await complete(page, false, false, (rows) => records.push(...rows));
    expect(
      records.some((r) => r.kind === "receipt-publish" && r.receipt === stopped?.receipt),
    ).toBe(false);
    await expect.poll(async () => (await page.screenshot({ clip })).equals(original)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    await expect.poll(async () => (await page.screenshot({ clip })).equals(blank)).toBe(true);
    await info.attach("cancelled-cold-gate", {
      body: JSON.stringify(records),
      contentType: "application/json",
    });
  });
}
