import { test, expect } from "@playwright/test";
import { observeEditorCalls } from "./editor-call-observation.ts";
for (const [id, name] of [
  ["04", "CPU pressure"],
  ["04", "GPU pressure"],
  ["04", "GPU count"],
  ["15/27/28", "cleanup"],
  ["05/16/24/28", "candidate rejected"],
  ["05/16/24/28", "candidate receipt rejected"],
  ["05/16/24/28", "candidate residency rejected"],
  ["07/16/24/28", "candidate operation rejected"],
  ["05/16/24/28", "candidate notification rejected"],
  ["05/16/24/28", "stored cleanup rejected"],
  ["04/05/16/24/28", "page release"],
  ["04/05/16/24/28", "ticket release"],
  ["04/05/16/24/28", "ticket code"],
  ["05/16/24", "CPU lifetime"],
  ["05/16/24", "CPU rejected"],
  ["05/16/24", "CPU context lost"],
])
  test(`MIG-WORKER-${id} retention ${name} boundary`, async ({ page }, info) => {
    test.setTimeout(180000);
    await observeEditorCalls(page);
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: `Run retention ${name}`, exact: true }).click();
    await expect(page.locator("#result")).not.toHaveText("running", { timeout: 150000 });
    const result = await page.locator("#result").innerText();
    expect(result).toContain('"status":"passed"');
    await info.attach("retention-lifetime-boundary", {
      body: result,
      contentType: "application/json",
    });
  });
