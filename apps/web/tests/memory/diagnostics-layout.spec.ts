import { test, expect } from "@playwright/test";
for (const locale of ["en-US", "uk-UA"] as const)
  test.describe(locale, () => {
    test.use({ locale });
    const uk = locale === "uk-UA";
    const labels = {
      settings: uk ? "Налаштування" : "Settings",
      title: uk ? "Діагностика для розробників" : "Developer diagnostics",
      close: uk ? "Закрити" : "Close",
      back: uk ? "До налаштувань" : "Back to settings",
      pin: uk ? "Закріпити показники" : "Pin metrics",
    };
    test("DIAG-02/06 compact and enlarged diagnostics preserves canvas bounds and panel focus", async ({
      page,
    }, info) => {
      await page.goto("/");
      await page.locator(".new-tile").click();
      const canvas = page.locator("[data-memory-canvas]");
      await expect(canvas).toHaveAttribute("data-state", "ready");
      const settings = page.getByRole("button", { name: labels.settings, exact: true });
      const panel = page.getByRole("dialog", { name: labels.title });
      for (const [width, height, percent] of [
        [1440, 900, 100],
        [320, 568, 100],
        [493, 700, 200],
        [568, 320, 200],
      ] as const) {
        await page.setViewportSize({ width, height });
        await page.evaluate((value) => {
          document.documentElement.style.fontSize = `${value}%`;
        }, percent);
        await expect(canvas).toHaveAttribute("data-state", "ready");
        const before = await canvas.boundingBox();
        await settings.click();
        await page.getByRole("button", { name: labels.title, exact: true }).click();
        await expect(panel.getByRole("heading", { name: labels.title })).toBeFocused();
        const bounds = await panel.evaluate((node) => ({
          left: node.getBoundingClientRect().left,
          right: node.getBoundingClientRect().right,
          top: node.getBoundingClientRect().top,
          bottom: node.getBoundingClientRect().bottom,
          client: node.clientWidth,
          scroll: node.scrollWidth,
        }));
        expect(bounds.left).toBeGreaterThanOrEqual(7);
        expect(bounds.right).toBeLessThanOrEqual(width - 7);
        expect(bounds.top).toBeGreaterThanOrEqual(7);
        expect(bounds.bottom).toBeLessThanOrEqual(height - 7);
        expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
        expect(await canvas.boundingBox()).toEqual(before);
        await page.screenshot({
          path: info.outputPath(`${locale}-${width}-${height}-${percent}.png`),
        });
        await panel.getByRole("button", { name: labels.back, exact: true }).click();
        await expect(page.getByRole("button", { name: labels.title, exact: true })).toBeFocused();
        await page.getByRole("button", { name: labels.title, exact: true }).click();
        await page.keyboard.press("Escape");
        await expect(panel).toBeHidden();
        await expect(settings).toBeFocused();
      }
    });
    test("DIAG-02/06 pinned metrics passes real pointer input through and stays above footer", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto("/");
      await page.locator(".new-tile").click();
      await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
      await page.getByRole("button", { name: labels.settings, exact: true }).click();
      await page.getByRole("button", { name: labels.title, exact: true }).click();
      const panel = page.getByRole("dialog", { name: labels.title });
      await panel.getByRole("checkbox", { name: labels.pin }).check();
      await panel.getByRole("button", { name: labels.close, exact: true }).click();
      const overlay = page.locator(".drawing-surface aside[aria-hidden='true']");
      await expect(overlay).toBeVisible();
      await expect(overlay).toHaveCSS("pointer-events", "none");
      const bounds = await overlay.boundingBox();
      const footer = await page.locator(".canvas-footer").boundingBox();
      if (!bounds || !footer) throw Error("diagnostics layout missing");
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(footer.y - 7);
      const x = bounds.x + 24,
        y = bounds.y + 24;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 80, y + 80, { steps: 12 });
      await page.mouse.up();
      await expect(
        page.getByRole("button", { name: uk ? "Скасувати останню дію" : "Undo last action" }),
      ).toHaveAttribute("aria-disabled", "false");
    });
  });
