/// <reference lib="dom" />
import playwright from "../../node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/index.js";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { platform, release, arch } from "node:os";
import { join } from "node:path";
import { startPreview } from "./preview-server.ts";
import { renderTask } from "./render.ts";
import { taskFixture } from "./fixture.ts";
import { previewStyle } from "./preview-style.ts";
import { loadTokens } from "../diagrams/tokens.ts";
import { root } from "./generate.ts";

const malicious = taskFixture();
malicious.documents = [];
malicious.evidence = [];
malicious.acceptance = [];
malicious.summary = '<script>window.injected=true</script><img src="https://example.org/leak">';
malicious.title = "LongTitle".repeat(150);
const tokens: unknown = JSON.parse(
  await readFile(join(root, "shared/diagrams/style.tokens.json"), "utf8"),
);
const fixture = await renderTask(root, malicious, previewStyle(loadTokens(tokens)));
const { server, url } = await startPreview(new Map([["/hostile.html", fixture]]));
const browser = await playwright.chromium.launch({ channel: "chrome", headless: true });
const output = join(root, ".build-cache/task-preview-v4");
await mkdir(output, { recursive: true });
const results: { id: string; status: string; screenshot?: string; sha256?: string }[] = [];
try {
  for (const width of [1280, 390]) {
    for (const task of ["index", "P05-S01", "S02L"]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      const failures: string[] = [];
      page.on("pageerror", (error) => failures.push(error.message));
      await page.goto(`${url}/${task}.html`);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.locator("script, iframe, img").count(), 0);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page.locator(".skip").evaluate((node) => node === document.activeElement),
        true,
      );
      await page.keyboard.press("Enter");
      assert.equal(new URL(page.url()).hash, "#main");
      if (task !== "index") {
        assert.equal(await page.locator("details.group[open]").count(), 0);
        assert.equal(await page.locator("details.group").count(), 4);
        const before = await page.locator("h1").boundingBox();
        assert.equal(
          await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter),
          "stable",
        );
        await page.locator("#verification-group > summary").focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("#verification-group").getAttribute("open"), "");
        const after = await page.locator("h1").boundingBox();
        assert.equal(after?.x, before?.x);
        assert.equal(after?.width, before?.width);
      }
      if (task === "P05-S01") {
        assert.equal(await page.locator(".primary").isVisible(), true);
        await page.locator("#technical-group > summary").click();
        assert.equal(
          await page
            .locator('#pr a[href="https://github.com/AlexandrLesiv/Linefield/pull/3"]')
            .count(),
          1,
        );
        assert.match(await page.locator("#pr").innerText(), /Snapshot only/);
        await page.locator("#technical-group > summary").click();
      }
      if (task === "S02L") {
        assert.match(await page.locator(".status").innerText(), /Blocked/);
        assert.match(await page.locator("#evidence").innerText(), /Recorded failed/);
        assert.equal(await page.locator("#acceptance article").count(), 6);
      }
      if (task !== "index") {
        const summary = page.locator("#acceptance summary").first();
        await summary.focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("#acceptance details").first().getAttribute("open"), "");
        if (width === 390 && task === "P05-S01") {
          const screenshot = "P05-S01-expanded-390.png";
          assert.equal(
            await summary.evaluate((node) => getComputedStyle(node).outlineStyle !== "none"),
            true,
          );
          const bytes = await page.screenshot({ path: join(output, screenshot) });
          results.push({
            id: "TASK-05-expanded-keyboard-focus",
            status: "passed",
            screenshot,
            sha256: createHash("sha256").update(bytes).digest("hex"),
          });
        }
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        await page.keyboard.press("Enter");
        await page.locator("#verification-group > summary").click();
        assert.equal(await page.locator("details.group[open]").count(), 0);
      }
      await page.evaluate(() => {
        (document.activeElement as HTMLElement)?.blur();
        window.scrollTo(0, 0);
      });
      const screenshot = `${task}-${width}.png`;
      const bytes = await page.screenshot({
        path: join(output, screenshot),
        fullPage: task === "index",
      });
      results.push({
        id: `TASK-05-${task}-${width}`,
        status: "passed",
        screenshot,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
      assert.deepEqual(failures, []);
      await page.close();
    }
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url);
  await page.locator('a[href="S00.html"]').click();
  assert.match(await page.locator(".status").innerText(), /Source task/);
  await page.locator("summary").click();
  assert.match(
    await page.locator(".group-content").innerText(),
    /Status: planned; not implemented/,
  );
  await page.locator(".back").click();
  assert.equal(await page.locator("h1").innerText(), "Tasks");
  results.push({ id: "TASK-05-source-task-navigation", status: "passed" });
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(url)) external.push(request.url());
  });
  await page.goto(`${url}/hostile.html`);
  assert.equal(await page.locator("script,img").count(), 0);
  assert.match(await page.locator(".lead").innerText(), /<script>/);
  assert.deepEqual(external, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal((await page.request.get(`${url}/tasks/P05-S01/task.json`)).status(), 404);
  assert.equal((await page.request.post(`${url}/index.html`)).status(), 404);
  results.push({ id: "TASK-05-untrusted-text-and-route-boundary", status: "passed" });
  await page.close();
  await writeFile(
    join(output, "browser-results.json"),
    JSON.stringify(
      {
        browser: browser.version(),
        host: { platform: platform(), release: release(), arch: arch() },
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`${results.length} task preview browser scenarios passed. Captures: ${output}`);
} finally {
  await browser.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
