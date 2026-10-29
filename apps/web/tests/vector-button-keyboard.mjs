import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/button-keyboard";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const locale of ["en-US", "uk-UA"]) {
    const page = await browser.newPage({ locale, viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.LINEFIELD_PREVIEW_URL);
    await page.locator(".new-tile").click();
    const host = page.frameLocator("iframe");
    await host.locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    const toggle = host.locator("#layers-toggle");
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 1500 });
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    const box = await host.locator("canvas").boundingBox();
    await page.mouse.move(box.x + 200, box.y + 300);
    await page.mouse.down();
    await page.mouse.move(box.x + 500, box.y + 300, { steps: 16 });
    await page.mouse.up();
    await frame.waitForFunction(() => lab.core.count() === 1 && !lab.renderPending());
    await host.locator("#undo").focus();
    await page.keyboard.press("Space");
    await frame.waitForFunction(() => lab.core.visible(0) === 0);
    await host.locator("#redo").focus();
    await page.keyboard.press("Space");
    await frame.waitForFunction(() => lab.core.visible(0) === 1);
    const before = await frame.evaluate(() => lab.view());
    await host.locator("canvas").focus();
    await page.keyboard.down("Space");
    await page.mouse.move(box.x + 500, box.y + 400);
    await page.mouse.down();
    await page.mouse.move(box.x + 550, box.y + 430, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up("Space");
    const after = await frame.evaluate(() => ({ view: lab.view(), count: lab.core.count() }));
    if (JSON.stringify(before) === JSON.stringify(after.view) || after.count !== 1 || errors.length)
      throw Error(JSON.stringify({ before, after, errors }));
    results.push({ locale, buttonActivation: true, canvasPan: true, errors });
    await page.close();
  }
  console.log(
    "PASS EN/UK Space activation of focused buttons; canvas Space-pan and history preserved",
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
