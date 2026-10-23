import { test, expect } from "@playwright/test";
import { forcePackedTargets } from "./packed-targets.ts";
for (const [mode, packed] of [
  ["order", false],
  ["order", true],
  ["boundary", false],
  ["cancel", false],
  ["query-error", false],
  ["progress", false],
] as const)
  test(`MIG-WORKER-05/13/36/37 cold lookahead ${mode} ${packed ? "packed" : "R8"}`, async ({
    page,
    browser,
  }, info) => {
    test.setTimeout(60000);
    if (packed) await forcePackedTargets(page);
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: `Run cold lookahead ${mode}`, exact: true }).click();
    await expect(page.locator("#result")).not.toHaveText("running", { timeout: 55000 });
    const raw = await page.locator("#result").innerText();
    await info.attach("cold-lookahead", { body: raw, contentType: "application/json" });
    await info.attach("browser-identity", {
      body: JSON.stringify({ browser: browser.version(), packed }),
      contentType: "application/json",
    });
    const result: { status: string; reason?: string } = JSON.parse(raw);
    expect(result.status, result.reason?.slice(0, 2500)).toBe("passed");
  });
