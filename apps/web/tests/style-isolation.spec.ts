import { testOrigin } from "./origin.ts";
import { test, expect } from "@playwright/test";

test("WEB-STYLE-01 component styling is local, independent of legacy query hooks", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(() => {
    const source = document.querySelector<HTMLElement>(".drawing-tile");
    if (!source) throw Error("Missing gallery tile");
    const local = source.cloneNode(true);
    if (!(local instanceof HTMLElement)) throw Error("Missing clone");
    local.classList.remove("drawing-tile");
    source.parentElement?.append(local);
    const plain = document.createElement("button");
    plain.className = "drawing-tile";
    source.parentElement?.append(plain);
    const styles = (node: HTMLElement) => {
      const css = getComputedStyle(node);
      return {
        display: css.display,
        background: css.backgroundColor,
        borderRadius: css.borderRadius,
      };
    };
    const values = { source: styles(source), local: styles(local), plain: styles(plain) };
    local.remove();
    plain.remove();
    return values;
  });
  expect(result.local).toEqual(result.source);
  expect(result.plain).not.toEqual(result.source);
  await page.goto("/drawing/sample-0");
  await expect(page.locator(".back")).toBeFocused();
  const iconSizes = await page.locator(".drawing-tool svg").evaluateAll((icons) => {
    const tool = icons[0];
    if (!tool) throw Error("Missing tool icon");
    const unstyled = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tool.parentElement?.append(unstyled);
    const widths = [getComputedStyle(tool).width, getComputedStyle(unstyled).width];
    unstyled.remove();
    return widths;
  });
  expect(iconSizes[0]).toBe("28px");
  expect(iconSizes[1]).not.toBe("28px");
});

for (const scheme of ["light", "dark"] as const) {
  test(`WEB-STYLE-02 touch dialog ${scheme} retains secondary and primary backgrounds`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      colorScheme: scheme,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(`${testOrigin}/`);
    await page.locator('[data-id="sample-0"] .more').tap();
    await page.getByRole("menuitem", { name: "Rename", exact: true }).tap();
    const background = await page.locator(".rename-dialog").evaluate((node) => {
      const css = getComputedStyle(node);
      return { panel: css.backgroundColor, primary: css.color };
    });
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).toHaveCSS(
      "background-color",
      background.panel,
    );
    await expect(page.getByRole("button", { name: "Rename", exact: true })).toHaveCSS(
      "background-color",
      background.primary,
    );
    await context.close();
  });
}
