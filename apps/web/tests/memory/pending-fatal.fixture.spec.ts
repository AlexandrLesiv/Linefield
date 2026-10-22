import { test, expect } from "@playwright/test";
import { holdPreparationReplies } from "./held-preparation.ts";
import { observeEditorCalls } from "./editor-call-observation.ts";

for (const origin of ["metrics", "injected command", "injected getter", "injected destructor"])
  test(`MIG-WORKER-16 pending candidate ${origin} trap retires host work without further editor exports`, async ({
    page,
  }) => {
    await observeEditorCalls(page);
    await holdPreparationReplies(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/tests/fixtures/memory/app.html");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(750, 450, { steps: 128 });
    await page.mouse.up();
    await page.evaluate(() => {
      document.documentElement.dataset.holdReplies = "true";
    });
    await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
    await expect
      .poll(async () => Number(await page.locator("html").getAttribute("data-held-replies")))
      .toBeGreaterThan(0);
    if (origin === "metrics") {
      // Real Wasm trap is armed by isolated fixture injection, then browser resize triggers it.
      await page.locator("#arm").evaluate((button) => {
        if (!(button instanceof HTMLButtonElement)) throw Error("arm control");
        button.click();
      });
      await expect(page.locator("#arm")).toBeHidden();
      await page.setViewportSize({ width: 1200, height: 850 });
    } else {
      // Deliberate JS boundary exception exercises the separate command-origin teardown route.
      await page.evaluate((stage) => {
        document.documentElement.dataset.trapStage = stage;
      }, origin);
      await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    }
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "fatal");
    expect(Number(await page.locator("html").getAttribute("data-wrapped-calls"))).toBeGreaterThan(
      0,
    );
    expect(Number(await page.locator("html").getAttribute("data-engine-calls"))).toBeGreaterThan(0);
    await expect(page.locator("html")).toHaveAttribute("data-after-trap", "0");
    expect(
      Number(await page.locator("html").getAttribute("data-terminated-workers")),
    ).toBeGreaterThan(0);
    await page.locator(".back").click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.evaluate(() => document.dispatchEvent(new Event("release-held-preparation")));
    const gc = await page.context().newCDPSession(page);
    await gc.send("HeapProfiler.collectGarbage");
    await gc.detach();
    await page.waitForTimeout(100);
    await expect(page.locator("html")).toHaveAttribute("data-after-trap", "0");
    await page.getByRole("button", { name: "Resume temporary drawing", exact: true }).click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "fatal");
    await expect(page.getByRole("button", { name: /Retry/ })).toBeHidden();
    await expect(page.locator("html")).toHaveAttribute("data-after-trap", "0");
  });
