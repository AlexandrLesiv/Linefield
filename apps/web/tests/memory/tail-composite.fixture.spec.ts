import { test, expect } from "@playwright/test";
import { forcePackedTargets } from "./packed-targets.ts";
for (const packed of [false, true]) {
  test(`MIG-LIVE-08 renderer-boundary translucent retained front and secondary source-over (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    if (packed) await forcePackedTargets(page);
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: "Run tail composite", exact: true }).click();
    await expect(page.locator("#result")).toContainText('"status":"passed"');
    await expect(page.locator("#result")).toContainText(`"packed":${packed}`);
    await info.attach("renderer-boundary-evidence", {
      body: await page.locator("#result").innerText(),
      contentType: "application/json",
    });
  });
}
