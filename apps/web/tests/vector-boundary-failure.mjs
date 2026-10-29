import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  // Valid empty Wasm module simulates a stale/incompatible deployed engine.
  await page.route("**/vector-editor/core.wasm", (route) =>
    route.fulfill({
      contentType: "application/wasm",
      body: Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]),
    }),
  );
  await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65282/");
  await page.locator(".new-tile").click();
  const frame = page.frameLocator("iframe");
  await frame.locator("#status").filter({ hasText: "Drawing engine memory is missing" }).waitFor();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  console.log("PASS incompatible Wasm reports startup failure and gallery remains reachable");
} finally {
  await browser.close();
}
