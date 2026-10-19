import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
for (const [count, moves] of [
  [32, 4],
  [64, 12],
] as const) {
  test(`WMP-11 bounded collection ${count} strokes with ${moves} moves each`, async ({
    page,
    context,
    browser,
  }, info) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.locator(".new-tile").click();
    const canvas = page.locator("[data-memory-canvas]");
    const ready = () => expect(canvas).toHaveAttribute("data-state", "ready");
    await ready();
    await page.evaluate(() => {
      const durations: number[] = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (durations.length < 100) durations.push(entry.duration);
        document.documentElement.dataset.testLongTasks = JSON.stringify(durations);
      }).observe({ type: "longtask" });
    });
    for (let i = 0; i < count; i++) {
      const x = 150 + (i % 8) * 100,
        y = 240 + Math.floor(i / 8) * 45;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 60, y + 8, { steps: moves });
      await page.mouse.up();
    }
    await ready();
    const copy = async () => {
      await page.locator("[data-memory-diagnostics]").click();
      return JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
    };
    const burst = await copy();
    expect(
      burst.input.records
        .filter(
          (v: { reason: string; outcome: string }) => v.reason === "end" && v.outcome === "ok",
        )
        .at(-1).content,
    ).toBe(String(count + 1));
    expect(burst.render.rebuilds).toBe(1);
    expect(burst.render.committedDraws).toBe(count);
    await canvas.focus();
    await page.keyboard.down("Space");
    await page.mouse.move(900, 600);
    await page.mouse.down();
    await canvas.evaluate((node) => {
      let readyFrames = 0;
      node.setAttribute("data-test-ready-frames", "0");
      new MutationObserver(() => {
        if (node.getAttribute("data-state") === "ready")
          node.setAttribute("data-test-ready-frames", String(++readyFrames));
      }).observe(node, { attributes: true, attributeFilter: ["data-state"] });
    });
    const start = performance.now();
    for (let i = 1; i <= 32; i++) {
      await page.mouse.move(900 + i * 2, 600 + i);
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
      );
    }
    const framesWhileMoving = Number(await canvas.getAttribute("data-test-ready-frames"));
    const settle = performance.now();
    await expect(page.locator("[data-memory-undo]")).toBeDisabled();
    await page.screenshot({ path: info.outputPath("held-after-continuous-pan.png") });
    const releaseStart = performance.now();
    await page.mouse.up();
    await page.keyboard.up("Space");
    await ready();
    const afterSettle = performance.now();
    const pan = await copy();
    const undoStart = performance.now();
    await page.locator("[data-memory-undo]").click();
    await ready();
    const undoMs = performance.now() - undoStart;
    const redoStart = performance.now();
    await page.locator("[data-memory-redo]").click();
    await ready();
    const redoMs = performance.now() - redoStart;
    const clip = { x: 100, y: 200, width: 1000, height: 450 };
    const image = await page.screenshot({ clip });
    await page.locator(".back").click();
    await expect(page.locator(".drawing-surface")).toHaveCount(0);
    await page.locator(".new-tile").click();
    await ready();
    expect((await page.screenshot({ clip })).equals(image)).toBe(true);
    const report = {
      scenario: {
        strokes: count,
        actualMouseMovesPerStroke: moves,
        panMoves: 32,
        panCadence: "one browser RAF between trusted mouse moves",
      },
      browser: browser.version(),
      build: burst.build,
      burst,
      pan,
      framesWhileMoving,
      exactReadyFramesWhileMoving: framesWhileMoving,
      previewPublications: pan.render.panPreviewPublications - burst.render.panPreviewPublications,
      continuousPanVerdict:
        "Preview publications measured; visible displacement separately asserted by pan-preview.spec.ts",
      movementMs: settle - start,
      releaseToReadyMs: afterSettle - releaseStart,
      undoMs,
      redoMs,
      longTasksMs: JSON.parse(
        await page.evaluate(() => document.documentElement.dataset.testLongTasks ?? "[]"),
      ),
      caveat:
        "Bounded headless diagnostic collection; includes automation latency, no physical/GPU or full performance-profile pass. Exact cold-rebuild pixel parity passed.",
    };
    await writeFile(info.outputPath("throughput.json"), JSON.stringify(report, null, 2));
    await info.attach("bounded-throughput", {
      body: JSON.stringify(report),
      contentType: "application/json",
    });
  });
}
