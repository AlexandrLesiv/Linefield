import { test, expect } from "@playwright/test";
import { forcePackedTargets } from "./packed-targets.ts";
for (const [id, name] of [
  ["36", "pressure"],
  ["37", "lifetime"],
  ["13", "cold yield"],
  ["35", "numerics"],
  ["36", "pins"],
  ["37", "getters"],
])
  test(`MIG-WORKER-${id} ordered visibility ${name} boundary`, async ({ page }, info) => {
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: `Run visibility ${name}`, exact: true }).click();
    await expect(page.locator("#result")).not.toHaveText("running");
    expect(await page.locator("#result").innerText()).toContain('"status":"passed"');
    await info.attach("typed-visibility-boundary", {
      body: await page.locator("#result").innerText(),
      contentType: "application/json",
    });
  });
for (const packed of [false, true])
  test(`MIG-WORKER-36 split-page host composition ${packed ? "packed" : "R8"}`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    if (packed) await forcePackedTargets(page);
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: "Run visibility composite", exact: true }).click();
    await expect(page.locator("#result")).not.toHaveText("running", { timeout: 55000 });
    expect(await page.locator("#result").innerText()).toContain('"status":"passed"');
    await info.attach("host-visibility-composition", {
      body: await page.locator("#result").innerText(),
      contentType: "application/json",
    });
  });
