import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65281/");
  await page.locator(".new-tile").click();
  console.log("opened");
  const f = page.frameLocator("iframe");
  await f.locator("#brush").waitFor();
  const frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
  console.log("frame", frame.url());
  await frame.waitForFunction(() => !!window.lab, {}, { timeout: 15000 });
  console.log("ready");
  for (const brush of ["0", "1", "2"]) {
    await f.locator("#brush").selectOption(brush);
    const b = await f.locator("canvas").boundingBox();
    await page.mouse.move(b.x + 200, b.y + 250 + Number(brush) * 80);
    await page.mouse.down();
    await page.mouse.move(b.x + 600, b.y + 280 + Number(brush) * 80, { steps: 25 });
    await page.mouse.up();
  }
  await f.locator("#pan").click();
  const box = await f.locator("canvas").boundingBox();
  await page.mouse.move(box.x + 700, box.y + 400);
  await page.mouse.down();
  await page.mouse.move(box.x + 780, box.y + 450, { steps: 10 });
  await page.mouse.up();
  await page.mouse.wheel(0, -160);
  console.log("drawn and panned");
  const before = await frame.evaluate(() => ({
    count: window.lab.core.count(),
    view: window.lab.view(),
  }));
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.locator(".new-tile").waitFor();
  await page.locator(".new-tile").click();
  await f.locator("#brush").waitFor();
  const after = await frame.evaluate(() => ({
    count: window.lab.core.count(),
    view: window.lab.view(),
  }));
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw Error("Resume changed document/camera");
  if (before.count !== 3 || before.view.cx === 0) throw Error("Drawing or pan failed");
  await f.locator("#undo").click();
  if ((await frame.evaluate(() => window.lab.core.visible(2))) !== 0) throw Error("Undo failed");
  await f.locator("#redo").click();
  if ((await frame.evaluate(() => window.lab.core.visible(2))) !== 1) throw Error("Redo failed");
  await page.screenshot({ path: ".build-cache/restart/integrated.png" });
  if (errors.length) throw Error(errors.join("\n"));
  await writeFile(
    ".build-cache/restart/smoke.json",
    JSON.stringify({ before, after, errors, browser: browser.version() }, null, 2),
  );
  console.log("PASS three brushes, Back/Resume, Undo/Redo, no uncaught errors");
} finally {
  await browser.close();
}
