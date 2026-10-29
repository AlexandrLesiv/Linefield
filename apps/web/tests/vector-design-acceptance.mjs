import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
// CT-03/09, INV-11, SU-20; I18N-LAYOUT/KEYBOARD/AX-001.
// Composition events test DOM routing, not physical IME or screen-reader acceptance.
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/design-acceptance";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const locale of ["en-US", "uk-UA"]) {
    const page = await browser.newPage({ locale, viewport: { width: 1280, height: 720 } });
    await page.goto(process.env.LINEFIELD_PREVIEW_URL);
    await page.locator(".new-tile").click();
    const host = page.frameLocator("iframe");
    await host.locator("#brush").waitFor();
    const frame = page.frames().find((item) => item.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    const uk = locale.startsWith("uk");
    async function check(id, action) {
      try {
        await action();
        results.push({ locale, id, pass: true });
      } catch (error) {
        results.push({ locale, id, pass: false, error: String(error) });
      }
    }
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const size = `${viewport.width}x${viewport.height}`;
      await check(`DESIGN-HEADER-${size}`, async () => {
        await expect
          .poll(
            () =>
              page.evaluate(() => {
                const header = document.querySelector(".drawing-surface header");
                const rect = header.getBoundingClientRect();
                const text = header.lastElementChild.getBoundingClientRect();
                const range = document.createRange();
                range.selectNodeContents(header.children[1]);
                const title = range.getBoundingClientRect();
                const iframe = document.querySelector("iframe").getBoundingClientRect();
                return (
                  (title.right <= text.left || title.bottom <= text.top) &&
                  text.top >= rect.top &&
                  text.bottom <= rect.bottom + 1 &&
                  text.right <= innerWidth &&
                  Math.abs(iframe.top - rect.bottom) < 1
                );
              }),
            { timeout: 1500 },
          )
          .toBe(true);
      });
      await host.locator("#pressure-toggle").click();
      await check(`DESIGN-PRESSURE-${size}`, async () => {
        // Reopening preserves panel scroll; explicitly scroll to its beginning.
        const panel = host.locator("#pressure-panel");
        const box = await panel.boundingBox();
        await page.mouse.move(box.x + box.width / 2, Math.min(box.y + 30, viewport.height - 10));
        await page.mouse.wheel(0, -10000);
        await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBe(0);
        const visible = await host.locator("#pressure-panel h2").evaluate((heading) => {
          const r = heading.getBoundingClientRect();
          return heading.contains(document.elementFromPoint(r.x + 2, r.y + r.height / 2));
        });
        expect(visible, "Pressure heading unobscured after scrolling to start").toBe(true);
        await page.screenshot({ path: `${output}/${locale}-${size}-top.png` });
        await host.locator("#pressure-original").focus();
        const fits = await host.locator("#pressure-original").evaluate((button) => {
          const r = button.getBoundingClientRect();
          return r.top >= 0 && r.bottom <= innerHeight && document.scrollingElement.scrollTop === 0;
        });
        expect(fits, "Focused preset visible without whole-editor scrolling").toBe(true);
      });
      await page.screenshot({ path: `${output}/${locale}-${size}.png` });
      await host.locator("#pressure-toggle").click();
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await host.locator("#layers-toggle").click();
    const row = host.locator('.layer-row[data-layer-id="0"]');
    for (const [id, before, after] of [
      ["visibility", uk ? "Приховати" : "Hide", uk ? "Показати" : "Show"],
      ["lock", uk ? "Заблокувати" : "Lock", uk ? "Розблокувати" : "Unlock"],
    ]) {
      await check(`DESIGN-FOCUS-${id}`, async () => {
        await row.getByRole("button", { name: new RegExp(`^${before} `) }).press("Space");
        await expect(row.getByRole("button", { name: new RegExp(`^${after} `) })).toBeFocused({
          timeout: 1500,
        });
      });
      await row.getByRole("button", { name: new RegExp(`^${after} `) }).click();
    }
    await check("DESIGN-FOCUS-delete", async () => {
      await host.locator("#layer-add").click();
      await host
        .locator('.layer-row[data-layer-id="1"]')
        .getByRole("button", { name: new RegExp(`^${uk ? "Видалити" : "Delete"} `) })
        .press("Space");
      await expect(row.locator(".layer-name")).toBeFocused({ timeout: 1500 });
    });
    for (const key of ["Enter", "Escape"]) {
      for (const composition of ["isComposing", "keyCode229"]) {
        await check(`DESIGN-IME-${key}-${composition}`, async () => {
          await row
            .getByRole("button", { name: new RegExp(`^${uk ? "Перейменувати" : "Rename"} `) })
            .click();
          const input = row.locator('input[type="text"]');
          await input.fill("Composition ✎");
          const before = await frame.evaluate(() => lab.layers.state());
          await input.dispatchEvent("keydown", {
            key,
            code: key,
            bubbles: true,
            cancelable: true,
            isComposing: composition === "isComposing",
            keyCode: composition === "keyCode229" ? 229 : 0,
          });
          await expect(input).toBeFocused({ timeout: 1500 });
          await expect(host.locator("#layers-toggle")).toHaveAttribute("aria-expanded", "true");
          expect(await frame.evaluate(() => lab.layers.state())).toEqual(before);
        });
        const input = row.locator('input[type="text"]');
        if (await input.count()) await input.press("Escape");
        if (await host.locator("#layers-panel").isHidden())
          await host.locator("#layers-toggle").click();
      }
    }
    await host.locator("#layers-close").click();
    await check("DESIGN-CANVAS-focus", async () => {
      await host.locator("#grid-style").press("Tab");
      await expect(host.locator("canvas")).toBeFocused();
      expect(
        await host.locator("canvas").evaluate((canvas) => {
          const style = getComputedStyle(canvas);
          return (
            canvas.matches(":focus-visible") &&
            style.outlineStyle !== "none" &&
            parseFloat(style.outlineWidth) >= 2
          );
        }),
      ).toBe(true);
    });
    await page.close();
  }
} finally {
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(
      { url: process.env.LINEFIELD_PREVIEW_URL, browser: browser.version(), results },
      null,
      2,
    ),
  );
  await browser.close();
}
console.log(JSON.stringify(results));
if (results.some((item) => !item.pass)) process.exitCode = 1;
