import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const base = process.env.LINEFIELD_PREVIEW_URL ?? "http://127.0.0.1:65353";
const results = [];
const check = (ok, name) => {
  if (!ok) throw Error(name);
  results.push(name);
};
const out = ".build-cache/ui-cleanup";
mkdirSync(out, { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  await page.goto(base);
  await page.locator(".new-tile").click();
  await page.locator("iframe:not([hidden])").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  check(
    await frame
      .locator("#pan, #rotate, #rotation-reset, #undo, #redo, #reset")
      .evaluateAll((nodes) => nodes.every((n) => !n.getClientRects().length)),
    "Red controls absent from layout",
  );
  check(
    !(await frame.locator("#status").isVisible()) && !(await frame.locator(".notice").isVisible()),
    "Developer information hidden by default",
  );
  check(
    (await page.locator("iframe:not([hidden])").evaluate((n) => n.getBoundingClientRect().top)) ===
      0,
    "Removed outer header leaves full-height editor",
  );
  await frame.locator("#editor-settings-toggle").click();
  await frame.locator("#pressure-toggle").click();
  check(await frame.locator("#pressure-panel").isVisible(), "Pressure available inside settings");
  await frame.locator("#paper-style").selectOption("white");
  await frame.locator("#grid-style").selectOption("dots");
  await page.keyboard.press("Escape");
  check(!(await frame.locator("#editor-settings").isVisible()), "Escape closes settings");
  check(
    await frame.locator("#editor-settings-toggle").evaluate((n) => n === document.activeElement),
    "Settings focus restored",
  );
  await frame.locator("canvas").focus();
  await page.keyboard.press("Control+Alt+d");
  check(
    (await frame.locator("#editor-developer").isVisible()) &&
      (await frame.locator("#save-action").isVisible()),
    "Developer shortcut exposes saving and diagnostics",
  );
  await page.keyboard.press("Escape");
  const rect = await frame.locator("canvas").boundingBox();
  await page.mouse.move(rect.x + 160, rect.y + 160);
  await page.mouse.down();
  await page.mouse.move(rect.x + 300, rect.y + 220, { steps: 10 });
  await page.keyboard.press("Control+Alt+d");
  check(
    !(await frame.locator("#editor-developer").isVisible()),
    "Developer shortcut does not interrupt active stroke",
  );
  await frame.evaluate(() =>
    window.dispatchEvent(new CustomEvent("linefield-save-attention", { detail: "failed" })),
  );
  check(
    !(await frame.locator("#editor-developer").isVisible()),
    "Save failure does not steal drawing focus",
  );
  await page.mouse.up();
  check(
    (await frame.evaluate(() => window.lab.core.count())) === 1,
    "Stroke retained after attention notification",
  );
  await frame.locator("canvas").focus();
  await page.keyboard.press("Control+z");
  check((await frame.evaluate(() => window.lab.core.visible(0))) === 0, "Undo shortcut retained");
  await page.keyboard.press("Control+Shift+z");
  check((await frame.evaluate(() => window.lab.core.visible(0))) === 1, "Redo shortcut retained");
  const before = await frame.evaluate(() => window.lab.view());
  await page.keyboard.down("Space");
  await page.mouse.move(rect.x + 200, rect.y + 240);
  await page.mouse.down();
  await page.mouse.move(rect.x + 260, rect.y + 270, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  check(
    JSON.stringify(before) !== JSON.stringify(await frame.evaluate(() => window.lab.view())),
    "Space-drag panning retained",
  );
  await frame.evaluate(() => window.lab.saving.flush(true));
  await page.screenshot({ path: out + "/editor.png" });
  await frame.locator(".editor-home").click();
  await page.waitForFunction(() => !document.querySelector("iframe:not([hidden])"));
  await page.locator(".new-tile").waitFor({ state: "visible" });
  check((await page.locator(".drawing-card").count()) >= 1, "Wordmark returns to real gallery");
  await page.reload();
  await page.locator(".drawing-card").first().waitFor();
  check(
    (await page.locator(".drawing-card").count()) >= 1,
    "Saved drawing remains in reloaded gallery",
  );
  await context.close();
  writeFileSync(out + "/results.json", JSON.stringify({ base, results }, null, 2));
  console.log(results);
} finally {
  await browser.close();
}
