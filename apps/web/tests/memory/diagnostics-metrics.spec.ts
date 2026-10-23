import { test, expect } from "@playwright/test";
import { openDiagnostics } from "./diagnostics-ui.ts";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
});
test("DIAG-05 only actual command-bearing pointer callbacks contribute, then pinned metrics settle idle", async ({
  page,
}) => {
  await openDiagnostics(page);
  const panel = page.getByRole("dialog", { name: "Developer diagnostics" });
  await panel.getByRole("checkbox", { name: "Pin metrics" }).check();
  await panel.getByRole("button", { name: "Close", exact: true }).click();
  await page.mouse.move(300, 350);
  await page.mouse.down();
  await page.mouse.move(500, 400, { steps: 3 });
  await page.mouse.up();
  await openDiagnostics(page);
  const count = panel
    .locator("dt", { hasText: "Input callbacks in window" })
    .locator("..")
    .locator("dd");
  await expect(count).toHaveText("5");
  // Header pointer movement does not acquire canvas input or issue an editing command.
  await page.mouse.move(300, 20, { steps: 8 });
  await expect(panel.getByText("Idle; last observation retained.", { exact: true })).toBeVisible();
  await expect(count).toHaveText("5");
  await expect(
    panel.locator("dt", { hasText: "Accepted not submitted" }).locator("..").locator("dd"),
  ).toHaveText("Unavailable");
});
test("DIAG-05 baseline-only steady drawing does not mutate diagnostics settings presentation", async ({
  page,
}) => {
  await page.mouse.move(300, 350);
  await page.mouse.down();
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  const observer = await page
    .getByRole("button", { name: "Settings", exact: true })
    .evaluateHandle((node) => {
      let count = 0;
      const mutations = new MutationObserver((records) => {
        count += records.length;
      });
      mutations.observe(node, { attributes: true, childList: true, subtree: true });
      return {
        read: () => count + mutations.takeRecords().length,
        disconnect: () => mutations.disconnect(),
      };
    });
  await page.mouse.move(700, 450, { steps: 20 });
  expect(await observer.evaluate((value) => value.read())).toBe(0);
  await observer.evaluate((value) => value.disconnect());
  await observer.dispose();
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Undo last action" })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
});
