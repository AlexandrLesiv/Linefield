import assert from "node:assert/strict";
/** Real mouse and keyboard actions, with canonical reads only for assertions. */
export async function editingChecks(page, frame) {
  const canvas = frame.locator("canvas");
  const rect = await canvas.boundingBox();
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  await frame.locator("#pen").click();
  await page.mouse.move(center.x - 100, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 100, center.y, { steps: 30 });
  await page.mouse.up();
  await frame.waitForFunction(() => !lab.renderPending());
  const raw = await frame.evaluate(() => lab.core.raw_length(0));
  assert.ok(raw >= 31);
  await frame.locator("#select").click();
  await frame.locator("#selection-pick-mode").click();
  await page.mouse.click(center.x, center.y);
  assert.deepEqual(await frame.evaluate(() => lab.selection()), [0]);
  await frame.locator("#selection-clear").click();
  await frame.locator("#selection-lasso-mode").click();
  await page.mouse.move(center.x - 120, center.y - 60);
  await page.mouse.down();
  for (const [x, y] of [
    [120, -60],
    [120, 60],
    [-120, 60],
    [-120, -60],
  ])
    await page.mouse.move(center.x + x, center.y + y, { steps: 8 });
  await page.mouse.up();
  await frame.waitForFunction(() => !lab.lassoWorker().pending && lab.selection().length === 2);
  const before = await frame.evaluate(() => {
    const c = lab.core;
    c.image_read(0x80000000, 0n, 0, 0n, 0);
    return Array.from(new Float64Array(c.memory.buffer, c.image_output_ptr(), 15));
  });
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 80, center.y + 40, { steps: 12 });
  await page.mouse.up();
  const after = await frame.evaluate(() => {
    const c = lab.core;
    c.image_read(0x80000000, 0n, 0, 0n, 0);
    return Array.from(new Float64Array(c.memory.buffer, c.image_output_ptr(), 15));
  });
  assert.ok(Math.abs(after[11] - before[11] - 80) < 1e-5);
  assert.ok(Math.abs(after[12] - before[12] - 40) < 1e-5);
  await page.keyboard.press("Meta+z");
  await page.keyboard.press("Backspace");
  assert.equal(await frame.evaluate(() => lab.core.visible(0)), 0);
  await page.keyboard.press("Meta+z");
  assert.equal(await frame.evaluate(() => lab.core.raw_length(0)), raw);
  await frame.locator("#pen").click();
  await frame.evaluate(() => {
    const gl = document.querySelector("canvas").getContext("webgl2");
    const ext = gl.getExtension("WEBGL_lose_context");
    if (!ext) throw Error("Context-loss check unavailable");
    ext.loseContext();
    setTimeout(() => ext.restoreContext(), 100);
  });
  await frame
    .waitForFunction(() => !lab.renderPending(), { timeout: 10000 })
    .catch(async (error) => {
      console.log(
        await frame.evaluate(() => ({
          status: document.querySelector("#status").textContent,
          image: document.querySelector("#image-view-retry").textContent,
          hidden: document.querySelector("#image-view-retry").hidden,
          metrics: lab.metrics,
        })),
      );
      throw error;
    });
  return {
    rawSamples: raw,
    mixedPick: true,
    mixedLasso: true,
    mixedMove: true,
    mixedDeleteUndo: true,
    contextRecovery: true,
  };
}
