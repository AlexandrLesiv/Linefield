import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const fault of ["missing-exports", "fingerprint"]) {
    const page = await browser.newPage();
    if (fault === "fingerprint")
      await page.addInitScript(() => {
        const instantiate = WebAssembly.instantiateStreaming.bind(WebAssembly);
        WebAssembly.instantiateStreaming = async (...args) => {
          const result = await instantiate(...args);
          if (sessionStorage.getItem("linefield-test-fingerprint-injected")) return result;
          sessionStorage.setItem("linefield-test-fingerprint-injected", "1");
          const exports = result.instance.exports;
          return {
            module: result.module,
            instance: {
              exports: {
                ...exports,
                boundary_fingerprint_word(index) {
                  return exports.boundary_fingerprint_word(index) ^ 1;
                },
              },
            },
          };
        };
      });
    // Valid empty Wasm module simulates a stale/incompatible deployed engine.
    let invalid = fault === "missing-exports";
    await page.route("**/vector-editor/core.wasm", (route) =>
      invalid
        ? route.fulfill({
            contentType: "application/wasm",
            body: Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]),
          })
        : route.continue(),
    );
    await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65282/");
    await page.locator(".new-tile").click();
    const frame = page.frameLocator("iframe");
    await frame.locator("#status").filter({ hasText: "Drawing could not start" }).waitFor();
    invalid = false;
    await frame.getByRole("button", { name: "Retry", exact: true }).click();
    const documentFrame = page
      .frames()
      .find((candidate) => candidate.url().includes("/vector-editor/"));
    await documentFrame.waitForFunction(() => !!window.lab, {}, { timeout: 15000 });
    const box = await frame.locator("canvas").boundingBox();
    await page.mouse.move(box.x + 200, box.y + 250);
    await page.mouse.down();
    await page.mouse.move(box.x + 500, box.y + 300, { steps: 20 });
    await page.mouse.up();
    if ((await documentFrame.evaluate(() => window.lab.core.count())) !== 1)
      throw Error("Drawing did not recover after Retry");
    await page.getByRole("button", { name: "← Back", exact: true }).click();
    await page.locator(".drawing-surface").waitFor({ state: "detached" });
    console.log(`PASS ${fault} reports startup failure; Retry restores drawing and gallery`);
    await page.close();
  }
} finally {
  await browser.close();
}
