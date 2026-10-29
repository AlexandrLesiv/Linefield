import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/approved-acceptance";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const [fixture, brush] of [
    ["paper-contact-behavior", 0],
    ["paper-contact-rendering", 0],
    ["editing-checks", 0],
    ["editing-checks", 1],
    ["editing-checks", 2],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
    });
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65282/");
      await page.locator(".new-tile").click();
      const host = page.frameLocator("iframe");
      await host.locator("#brush").waitFor();
      const frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      await host.locator("#brush").selectOption(String(brush));
      const source = await readFile(
        new URL(`./fixtures/approved-vector/${fixture}.js`, import.meta.url),
        "utf8",
      );
      const result = await frame.evaluate(source);
      results.push({
        fixture,
        brush,
        sourceHash: createHash("sha256").update(source).digest("hex"),
        result,
        errors,
      });
      console.log(fixture, brush, JSON.stringify(result));
    } catch (error) {
      results.push({ fixture, brush, failure: String(error), errors });
    } finally {
      await page.close();
    }
    await writeFile(
      `${output}/results.json`,
      JSON.stringify(
        { browser: browser.version(), viewport: [1440, 1000], dpr: 2, results },
        null,
        2,
      ),
    );
  }
  if (
    results.some((entry) => entry.failure || entry.result?.passed !== true || entry.errors.length)
  )
    throw Error(`Approved acceptance has failures; inspect ${output}`);
} finally {
  await browser.close();
}
