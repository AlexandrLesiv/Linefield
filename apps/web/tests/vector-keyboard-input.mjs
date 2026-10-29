import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/keyboard-input";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const variant of ["previous", "shared"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      variant === "shared"
        ? process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65319/"
        : process.env.LINEFIELD_BASELINE_URL || "http://127.0.0.1:65318/",
    );
    await page.locator(".new-tile").click();
    const host = page.frameLocator("iframe");
    await host.locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    const box = await host.locator("canvas").boundingBox();
    const visible = () =>
      frame.evaluate(() =>
        Array.from({ length: lab.core.count() }, (_, id) => id).filter((id) =>
          lab.core.visible(id),
        ),
      );
    const checks = [];
    async function expectIds(ids, label) {
      if (JSON.stringify(await visible()) !== JSON.stringify(ids)) throw Error(label);
      checks.push(label);
    }
    await page.mouse.move(box.x + 200, box.y + 250);
    await page.mouse.down();
    await page.mouse.move(box.x + 600, box.y + 250, { steps: 20 });
    await page.mouse.up();
    await page.keyboard.press("Control+z");
    await expectIds([], "Ctrl Undo");
    await page.keyboard.press("Control+Shift+z");
    await expectIds([0], "Ctrl Shift Redo");
    await host.locator("#width").focus();
    await page.keyboard.press("Control+z");
    await expectIds([0], "Text/control focus protects document history");
    await page.keyboard.press("v");
    if ((await host.locator("#select").getAttribute("aria-pressed")) === "true")
      throw Error("Control typing switched tools");
    checks.push("Control typing protects tool choice");
    await host.locator("canvas").focus();
    await frame.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "z",
          code: "KeyZ",
          ctrlKey: true,
          isComposing: true,
        }),
      );
      const event = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "z",
        code: "KeyZ",
        ctrlKey: true,
      });
      event.preventDefault();
      window.dispatchEvent(event);
    });
    await expectIds([0], "Composition and consumed keys ignored");
    await page.keyboard.press("v");
    await host.locator("#selection-pick-mode").click();
    await page.mouse.click(box.x + 400, box.y + 250);
    if (JSON.stringify(await frame.evaluate(() => lab.selection())) !== "[0]")
      throw Error("V selection setup failed");
    await frame.evaluate(() =>
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Delete",
          repeat: true,
        }),
      ),
    );
    await expectIds([0], "Repeated Delete ignored");
    await page.keyboard.press("Delete");
    await expectIds([], "Delete selection");
    await page.keyboard.press("Control+z");
    await expectIds([0], "Undo selection deletion");
    await page.keyboard.press("Escape");
    if ((await frame.evaluate(() => lab.selection())).length)
      throw Error("Escape retained selection");
    checks.push("Escape clears selection");
    await page.keyboard.press("s");
    if ((await host.locator("#slice").getAttribute("aria-pressed")) !== "true")
      throw Error("S did not choose Slice");
    checks.push("S chooses Slice");
    await host.locator("#pen").click();
    await host.locator("canvas").focus();
    const before = await frame.evaluate(() => lab.view());
    await page.keyboard.down("Space");
    await page.mouse.move(box.x + 700, box.y + 400);
    await page.mouse.down();
    await page.mouse.move(box.x + 800, box.y + 450, { steps: 10 });
    await page.mouse.up();
    await page.keyboard.up("Space");
    if (JSON.stringify(await frame.evaluate(() => lab.view())) === JSON.stringify(before))
      throw Error("Space did not pan");
    await expectIds([0], "Space pan creates no stroke");
    await page.mouse.move(box.x + 300, box.y + 450);
    await page.mouse.down();
    await page.mouse.move(box.x + 450, box.y + 460, { steps: 10 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expectIds([0], "Escape cancels active stroke after Space release");
    if (errors.length) throw Error(errors.join("; "));
    results.push({ variant, checks });
    await page.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(
    "PASS browser shortcut precedence, text/composition isolation, selection, history, held pan and cancellation on previous/shared previews",
  );
} finally {
  await browser.close();
}
