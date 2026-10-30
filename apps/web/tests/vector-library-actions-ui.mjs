import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createDrawing, back, sameDrawing } from "./vector-library-actions-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated SAVE08 preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save08-actions-ui";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (const locale of ["en", "uk"]) {
    const context = await browser.newContext({
      locale,
      viewport: { width: 1200, height: 1000 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.on("dialog", (d) => d.accept());
    console.log(locale + ": create drawing");
    const expected = await createDrawing(page, url);
    await back(page, locale);
    const card = page.locator(`[data-id="${expected.id}"]`),
      more = card.locator(".more");
    const original = await card.locator(".drawing-name").textContent();
    await more.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menu").waitFor();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.activeElement?.classList.contains("more"));
    await page.keyboard.press("Enter");
    await page
      .getByRole("menuitem", { name: locale === "uk" ? "Перейменувати" : "Rename", exact: true })
      .press("Enter");
    const dialog = page.getByRole("dialog"),
      input = dialog.locator("input");
    await input.waitFor();
    await page.screenshot({ path: `${output}/${locale}-rename.png`, fullPage: true });
    assert.equal(await input.evaluate((e) => document.activeElement === e), true);
    await input.fill("Cancelled name");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    assert.equal(await card.locator(".drawing-name").textContent(), original);
    await more.press("Enter");
    await page
      .getByRole("menuitem", { name: locale === "uk" ? "Перейменувати" : "Rename", exact: true })
      .click();
    const title = `Київ · Paper 🖊️ ${locale}`;
    await page.getByRole("dialog").locator("input").fill(title);
    await page.getByRole("dialog").locator("input").press("Enter");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.waitForFunction(
      ({ id, expectedTitle }) =>
        document.querySelector(`[data-id="${id}"] .drawing-name`)?.textContent === expectedTitle,
      { id: expected.id, expectedTitle: title },
    );
    assert.equal(await more.evaluate((e) => document.activeElement === e), true);
    console.log(locale + ": renamed; reload");
    await page.reload();
    await card.waitFor();
    assert.equal(await card.locator(".drawing-name").textContent(), title);
    await card.locator(".drawing-tile:not([aria-hidden='true']):not([inert])").click();
    await sameDrawing(page, expected);
    await back(page, locale);
    console.log(locale + ": rename image matched");
    // The matching hidden editor still owns its lock here; Delete must flush and release it.
    await more.press("Enter");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    const undo = card.locator(".undo");
    await undo.waitFor();
    await page.screenshot({ path: `${output}/${locale}-delete-undo.png`, fullPage: true });
    assert.equal(await undo.evaluate((e) => document.activeElement === e), true);
    await undo.press("Enter");
    await card.locator(".drawing-tile:not([aria-hidden='true']):not([inert])").waitFor();
    await card.locator(".drawing-tile:not([aria-hidden='true']):not([inert])").click();
    await sameDrawing(page, expected);
    await back(page, locale);
    await more.click();
    await page
      .getByRole("menuitem", { name: locale === "uk" ? "Видалити" : "Delete", exact: true })
      .click();
    await card.locator(".undo").waitFor();
    await page.reload();
    await page.locator(".new-tile").waitFor();
    assert.equal(await page.locator(`[data-id="${expected.id}"]`).count(), 0);
    await page.goto(new URL(`drawing/${expected.id}`, url).href);
    await page
      .getByRole("button", {
        name: locale === "uk" ? "Повернутися до галереї" : "Return to gallery",
        exact: true,
      })
      .waitFor();
    assert.equal(await page.locator("iframe:not([hidden])").count(), 0);
    console.log(locale + ": delete/undo and durable removal complete");
    results.push({
      locale,
      renamePersisted: true,
      rawLayersPaperAndImagePreserved: true,
      cachedEditorDelete: true,
      undoExact: true,
      deletedReloadAndRouteBlocked: true,
    });
    await context.close();
  }
  await writeFile(output + "/results.json", JSON.stringify({ url, results }, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
