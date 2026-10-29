import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(new URL("../package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const base = process.env.LINEFIELD_PREVIEW_URL;
if (!base) throw Error("Explicit candidate required");
const output = ".build-cache/save06-create-review";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const results = [];
try {
  await page.goto(base);
  await page.locator(".new-tile").click();
  await page.waitForURL("**/drawing/*");
  await page.locator("iframe:not([hidden])").waitFor();
  const a = page.url(),
    frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  const box = await frame.locator("canvas").boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + 150, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 350, box.y + 230, { steps: 10 });
  await page.mouse.up();
  await frame.evaluate(() => lab.saving.flush(true));
  const count = await frame.evaluate(() => lab.core.count());
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.evaluate(() => {
    const OriginalWorker = window.Worker;
    window.reviewCreateRequests = [];
    window.reviewFailCreate = true;
    window.Worker = class extends OriginalWorker {
      postMessage(data, ...rest) {
        if (data.kind === "library-create") {
          window.reviewCreateRequests.push(data.document);
          if (window.reviewFailCreate) {
            window.reviewFailCreate = false;
            setTimeout(
              () =>
                this.dispatchEvent(
                  new MessageEvent("message", { data: { id: data.id, error: "storage-capacity" } }),
                ),
              0,
            );
            return;
          }
        }
        return super.postMessage(data, ...rest);
      }
    };
  });
  await page.locator(".new-tile").click();
  await page.getByRole("button", { name: "Retry", exact: true }).waitFor();
  assert.equal(await page.locator(".drawing-card").count(), 1);
  assert.equal(await page.locator(".drawing-tile").isEnabled(), true);
  await page.locator(".drawing-tile").click();
  await page.locator("iframe:not([hidden])").waitFor();
  assert.equal(page.url(), a);
  assert.equal(page.frames().includes(frame), true);
  assert.equal(await frame.evaluate(() => lab.core.count()), count);
  assert.ok(await frame.evaluate(() => lab.core.can_undo()));
  results.push(
    "failed create leaves existing card accessible without reload; prior engine/history retained",
  );
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.locator(".new-tile").click();
  await page.waitForURL((url) => url.href !== a && url.pathname.startsWith("/drawing/"));
  await page.locator("iframe:not([hidden])").waitFor();
  const requests = await page.evaluate(() => window.reviewCreateRequests);
  assert.equal(requests.length, 2);
  assert.equal(requests[0], requests[1]);
  results.push("later creation retry reuses failed intent identity and succeeds");
  const secondRoute = page.url();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.evaluate(() => {
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(data, ...rest) {
        if (data.kind === "library-create") {
          window.releaseReviewCreate = () =>
            this.dispatchEvent(
              new MessageEvent("message", { data: { id: data.id, error: "storage-capacity" } }),
            );
          return;
        }
        return super.postMessage(data, ...rest);
      }
    };
  });
  await page.locator(".new-tile").click();
  await page.waitForFunction(() => typeof window.releaseReviewCreate === "function");
  await page.goForward();
  await page.evaluate(() => window.releaseReviewCreate());
  await page.locator("iframe:not([hidden])").waitFor();
  assert.equal(page.url(), secondRoute);
  results.push("Forward queued during failed create drains when busy clears");
  await writeFile(
    output + "/results.json",
    JSON.stringify({ base, browser: browser.version(), results }, null, 2),
  );
  console.log(JSON.stringify({ passed: results.length, results, output }));
} catch (error) {
  await writeFile(
    output + "/failure.json",
    JSON.stringify({ error: String(error), url: page.url(), results }, null, 2),
  );
  throw error;
} finally {
  await browser.close();
}
