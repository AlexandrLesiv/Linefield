import { test, expect } from "@playwright/test";
import {
  beginCapture,
  openDiagnostics,
  drawDiagnosticStroke,
  downloadReport,
} from "./diagnostics-ui.ts";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await beginCapture(page);
  await drawDiagnosticStroke(page);
  await openDiagnostics(page);
  await page.getByRole("button", { name: "Stop capture" }).click();
  await expect(page.getByRole("button", { name: "Download JSON" })).toBeEnabled();
});
test("DIAG-03 export failure retains report and a fresh explicit retry succeeds", async ({
  page,
}) => {
  const fault = await page.evaluateHandle(() => {
    const original = URL.createObjectURL;
    URL.createObjectURL = () => {
      throw Error("PRIVATE_EXPORT_CANARY");
    };
    return {
      restore: () => {
        URL.createObjectURL = original;
      },
    };
  });
  await page.getByRole("button", { name: "Download JSON" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Developer diagnostics" })
      .getByText(/Export could not finish/),
  ).toBeVisible();
  await fault.evaluate((value) => value.restore());
  await fault.dispose();
  const text = await downloadReport(page);
  expect(text).not.toContain("PRIVATE_EXPORT_CANARY");
  expect(JSON.parse(text)).toMatchObject({ reason: "manual", partial: false });
});
for (const action of ["stroke", "departure"] as const)
  test(`DIAG-03 ${action} fences a preparing export without a delayed download`, async ({
    page,
  }) => {
    let downloads = 0;
    page.on("download", () => downloads++);
    const gate = await page.evaluateHandle(() => {
      const original = window.setTimeout;
      let callback: (() => void) | undefined,
        blocked = false;
      const replacement = (handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        if (!blocked && timeout === 0 && typeof handler === "function") {
          blocked = true;
          return original(() => {
            callback = () => handler(...args);
          }, 0);
        }
        return original(handler, timeout, ...args);
      };
      Object.defineProperty(window, "setTimeout", {
        configurable: true,
        writable: true,
        value: replacement,
      });
      return {
        waiting: () => Boolean(callback),
        release: () => {
          window.setTimeout = original;
          callback?.();
          callback = undefined;
        },
      };
    });
    await page.getByRole("button", { name: "Download JSON" }).click();
    await expect.poll(() => gate.evaluate((value) => value.waiting())).toBe(true);
    await expect(
      page.getByText("Preparing JSON. Drawing remains available.", { exact: true }),
    ).toBeVisible();
    if (action === "stroke") await drawDiagnosticStroke(page, 500);
    else {
      await page.locator(".back").click();
      await expect(page.locator(".drawing-surface")).toHaveCount(0);
      await page.locator(".new-tile").click();
      await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
    }
    await gate.evaluate((value) => value.release());
    await gate.dispose();
    await openDiagnostics(page);
    await expect(page.getByRole("button", { name: "Download JSON" })).toBeEnabled();
    if (action === "stroke")
      await expect(
        page.getByText("Ready to download. Choose Download JSON again.", { exact: true }),
      ).toBeVisible();
    expect(downloads).toBe(0);
    expect(JSON.parse(await downloadReport(page))).toMatchObject({
      reason: "manual",
      partial: false,
    });
    expect(downloads).toBe(1);
  });
