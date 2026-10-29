import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65289/");
  await page.locator(".new-tile").click();
  const host = page.frameLocator("iframe");
  await host.locator("#brush").waitFor();
  const frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  await frame.evaluate(() => (window.sessionMarker = {}));
  const marker = await frame.evaluateHandle(() => window.sessionMarker);
  const box = await host.locator("canvas").boundingBox();
  async function stroke(y) {
    await page.mouse.move(box.x + 200, box.y + y);
    await page.mouse.down();
    await page.mouse.move(box.x + 650, box.y + y + 20, { steps: 20 });
    await page.mouse.up();
  }
  await stroke(250);
  await host.locator("#layers-toggle").click();
  await host.locator("#layer-add").click();
  await host.locator("#layers-close").click();
  await stroke(350);
  const snapshot = () =>
    frame.evaluate(() => ({
      layers: lab.layers.state(),
      view: lab.view(),
      raw: Array.from({ length: lab.core.count() }, (_, id) => ({
        visible: lab.core.visible(id),
        points: Array.from({ length: lab.core.raw_length(id) }, (unused, i) =>
          [0, 1, 2].map((field) => lab.core.raw_point(id, i, field)),
        ),
      })),
    }));
  const before = await snapshot();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.keyboard.press("Control+z");
  if (JSON.stringify(await snapshot()) !== JSON.stringify(before))
    throw Error("Gallery shortcut mutated hidden session");
  await page.locator(".new-tile").click();
  await host.locator("#brush").waitFor();
  if (!(await frame.evaluate((old) => window.sessionMarker === old, marker)))
    throw Error("Resume recreated editor");
  if (JSON.stringify(await snapshot()) !== JSON.stringify(before))
    throw Error("Resume changed document/layers/camera");
  await page.mouse.move(box.x + 200, box.y + 450);
  await page.mouse.down();
  await page.mouse.move(box.x + 650, box.y + 470, { steps: 20 });
  // Programmatic navigation while capture is held exercises the same Back action.
  await page
    .getByRole("button", { name: "← Back", exact: true })
    .evaluate((button) => button.click());
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.mouse.up();
  if ((await frame.evaluate(() => lab.core.visible(2))) !== 0)
    throw Error("Active stroke was not cancelled by leaving editor");
  await page.locator(".new-tile").click();
  await host.locator("#brush").waitFor();
  await host.locator("#undo").click();
  if ((await frame.evaluate(() => lab.core.visible(1))) !== 0)
    throw Error("Cancelled stroke polluted history");
  await host.locator("#redo").click();
  if ((await frame.evaluate(() => lab.core.visible(1))) !== 1)
    throw Error("Retained history failed");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS retained layers/raw/history, same engine instance, gallery isolation and active-stroke cancellation",
  );
} finally {
  await browser.close();
}
