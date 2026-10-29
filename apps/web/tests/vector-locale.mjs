import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const locale of ["en-US", "uk-UA"]) {
    const page = await browser.newPage({ locale, viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65286/");
    await page.locator(".new-tile").click();
    const host = page.frameLocator("iframe");
    await host.locator("#brush").waitFor();
    const frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    const uk = locale.startsWith("uk");
    if ((await host.locator("#pen").innerText()) !== (uk ? "Перо" : "Pen"))
      throw Error("Pen translation missing");
    if (
      (await host.locator('#brush option[value="2"]').innerText()) !==
      (uk ? "М’який олівець" : "Soft pencil")
    )
      throw Error("Brush translation missing");
    if ((await frame.evaluate(() => document.documentElement.lang)) !== (uk ? "uk" : "en"))
      throw Error("Editor language missing");
    if ((await host.locator("#layer-add").innerText()) !== (uk ? "Новий шар" : "New layer"))
      throw Error("Layer panel translation missing");
    if (
      (await host.locator("#selection-controls").getAttribute("aria-label")) !==
      (uk ? "Параметри вибору" : "Selection options")
    )
      throw Error("Selection accessibility translation missing");
    await host.locator("#pressure-toggle").click();
    await host.locator("#pressure-help").waitFor();
    if (uk && !(await host.locator("#pressure-help").innerText()).startsWith("Більші значення"))
      throw Error("Pressure help translation missing");
    await host.locator("#pressure-toggle").click();
    await host.locator("#brush").selectOption("2");
    const box = await host.locator("canvas").boundingBox();
    await page.mouse.move(box.x + 200, box.y + 300);
    await page.mouse.down();
    await page.mouse.move(box.x + 600, box.y + 340, { steps: 24 });
    await page.mouse.up();
    if ((await frame.evaluate(() => lab.core.count())) !== 1)
      throw Error("Localized drawing failed");
    await host.locator("#layers-toggle").click();
    await host
      .getByRole("button", { name: uk ? "Приховати Layer 1" : "Hide Layer 1", exact: true })
      .click();
    if ((await frame.evaluate(() => lab.core.visible(0))) !== 0)
      throw Error("Localized layer hide failed");
    await host.locator("#undo").click();
    if ((await frame.evaluate(() => lab.core.visible(0))) !== 1)
      throw Error("Localized Undo failed");
    await page.screenshot({ path: `.build-cache/restart/locale-${locale}.png` });
    if (errors.length) throw Error(errors.join("\n"));
    await page.close();
    console.log("PASS", locale, "controls, language, drawing, layer hide and history");
  }
} finally {
  await browser.close();
}
