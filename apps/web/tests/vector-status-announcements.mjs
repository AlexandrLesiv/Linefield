import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const locale of ["en-US", "uk-UA"]) {
    const page = await browser.newPage({ locale });
    await page.goto(process.env.LINEFIELD_PREVIEW_URL);
    await page.locator(".new-tile").click();
    const host = page.frameLocator("iframe");
    await host.locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    await expect(host.locator("#status")).toHaveAttribute("aria-live", "off");
    await expect(host.locator("#editor-announcement")).toHaveAttribute("role", "status");
    await frame.evaluate(() => {
      window.announcementChanges = 0;
      new MutationObserver(() => window.announcementChanges++).observe(
        document.querySelector("#editor-announcement"),
        { childList: true },
      );
    });
    const box = await host.locator("canvas").boundingBox();
    await page.mouse.move(box.x + 150, box.y + 250);
    await page.mouse.down();
    await page.mouse.move(box.x + 450, box.y + 250, { steps: 20 });
    await page.mouse.up();
    await frame.waitForFunction(() => !lab.renderPending());
    if (await frame.evaluate(() => announcementChanges)) throw Error("Drawing counters announced");
    // Exercise the actual runtime-error presentation path, without damaging state.
    await frame.evaluate(() =>
      window.dispatchEvent(new ErrorEvent("error", { message: "Bounded failure probe" })),
    );
    await expect(host.locator("#editor-announcement")).toContainText("Bounded failure probe");
    await frame.evaluate(() => new Promise((resolve) => setTimeout(resolve, 650)));
    if (await frame.evaluate(() => announcementChanges !== 1 || lab.core.visible(0) !== 1))
      throw Error("Repeated announcement or lost drawing");
    await host.locator("#undo").click();
    await frame.waitForFunction(() => lab.core.visible(0) === 0);
    await page.close();
  }
  console.log(
    "PASS EN/UK quiet drawing counters, single runtime failure announcement and preserved history",
  );
} finally {
  await browser.close();
}
