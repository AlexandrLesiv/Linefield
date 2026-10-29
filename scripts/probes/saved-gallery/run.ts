import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type {
  Browser,
  Page,
  Frame,
} from "../../../node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/index.js";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium } = require("@playwright/test") as {
  chromium: { launch(options: object): Promise<Browser> };
};
const base = process.env.LINEFIELD_PREVIEW_URL ?? "http://127.0.0.1:65353";
const output = ".build-cache/save06-app";
mkdirSync(output, { recursive: true });
type Lab = {
  core: { count(): number; visible(id: number): number };
  saving: { flush(exit: boolean): Promise<void> };
};
type LabWindow = Window & { lab: Lab };
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results: string[] = [];
function check(value: unknown, message: string) {
  if (!value) throw Error(message);
  results.push(message);
}
async function editor(page: Page): Promise<Frame> {
  await page.locator("iframe:not([hidden])").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  if (!frame) throw Error("Missing editor");
  await frame.waitForFunction(() => !!(window as unknown as LabWindow).lab);
  return frame;
}
async function draw(page: Page, frame: Frame, y: number) {
  const box = await frame.locator("canvas").boundingBox();
  if (!box) throw Error("Missing canvas");
  await page.mouse.move(box.x + 170, box.y + y);
  await page.mouse.down();
  await page.mouse.move(box.x + 450, box.y + y + 40, { steps: 25 });
  await page.mouse.up();
  await frame.evaluate(() => (window as unknown as LabWindow).lab.saving.flush(true));
}
async function back(page: Page) {
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.locator(".new-tile").waitFor();
}
try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator(".new-tile").waitFor();
  check((await page.locator(".drawing-card").count()) === 0, "fresh gallery has no placeholders");
  await page.locator(".new-tile").click();
  let frame = await editor(page);
  const first = page.url();
  await draw(page, frame, 250);
  const count = await frame.evaluate(() => (window as unknown as LabWindow).lab.core.count());
  await back(page);
  check((await page.locator(".drawing-card").count()) === 1, "created drawing is a gallery entry");
  await page.locator(".drawing-tile").click();
  frame = await editor(page);
  await frame.locator("#undo").click();
  check(
    (await frame.evaluate(() => (window as unknown as LabWindow).lab.core.visible(0))) === 0,
    "same-document Back preserves Undo",
  );
  await frame.locator("#redo").click();
  await frame.evaluate(() => (window as unknown as LabWindow).lab.saving.flush(true));
  await back(page);
  await page.locator(".new-tile").click();
  frame = await editor(page);
  const second = page.url();
  check(first !== second, "New allocates separate stable identity");
  check(
    (await frame.evaluate(() => (window as unknown as LabWindow).lab.core.count())) === 0,
    "second drawing starts empty",
  );
  await draw(page, frame, 350);
  await draw(page, frame, 450);
  await back(page);
  await page.reload();
  await page.locator(".drawing-card").first().waitFor();
  check(
    (await page.locator(".drawing-card").count()) === 2,
    "two saved drawings survive gallery reload",
  );
  check(
    (await page.locator(".drawing-card img").count()) === 0,
    "white thumbnails contain no sample art",
  );
  await page.goto(first);
  frame = await editor(page);
  check(
    (await frame.evaluate(() => (window as unknown as LabWindow).lab.core.count())) === count,
    "first direct route restores own strokes",
  );
  await frame.waitForFunction(
    () =>
      !(
        window as unknown as LabWindow & { lab: Lab & { renderPending(): boolean } }
      ).lab.renderPending(),
  );
  const image = createHash("sha256")
    .update(await frame.locator("canvas").screenshot())
    .digest("hex");
  await page.reload();
  frame = await editor(page);
  await frame.waitForFunction(
    () =>
      !(
        window as unknown as LabWindow & { lab: Lab & { renderPending(): boolean } }
      ).lab.renderPending(),
  );
  check(
    createHash("sha256")
      .update(await frame.locator("canvas").screenshot())
      .digest("hex") === image,
    "reload exact canvas image",
  );
  await page.goto(second);
  frame = await editor(page);
  check(
    (await frame.evaluate(() => (window as unknown as LabWindow).lab.core.count())) === 2,
    "second direct route restores distinct strokes",
  );
  await page.goto(base + "/drawing/00000000-0000-4000-8000-000000000000");
  await page.getByText("This saved drawing is unavailable.", { exact: false }).waitFor();
  check((await page.locator("iframe").count()) === 0, "missing document never opens blank editor");
  await page.goto(base);
  await page.locator(".drawing-card").first().waitFor();
  check((await page.locator(".drawing-card").count()) === 2, "missing route did not create a file");
  await page.screenshot({ path: output + "/gallery.png" });
  check(errors.length === 0, "no uncaught app errors");
  writeFileSync(
    output + "/results.json",
    JSON.stringify({ base, browser: browser.version(), results, errors }, null, 2),
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
