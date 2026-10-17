import { expect, test } from "@playwright/test";

const shadow = "rgba(0, 0, 0, 0.12) 0px 5px 18px 0px";

for (const colorScheme of ["light", "dark"] as const) {
  test(`WEB-ME01 ${colorScheme} menu retains hover elevation through Rename and clears on Cancel`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    const card = page.locator('[data-id="sample-0"]');
    await card.hover();
    await expect(card).toHaveCSS("box-shadow", shadow);
    await card.locator(".more").click();
    await page.getByRole("menuitem", { name: "Rename", exact: true }).hover();
    await expect(card).toHaveCSS("box-shadow", shadow);
    await page.mouse.move(1, 1);
    await expect(card).toHaveCSS("box-shadow", shadow);
    await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
    await expect(card).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.16) 0px 5px 18px 0px");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.mouse.move(1, 1);
    await expect(page.locator(".rename-dialog")).toHaveCount(0);
    await expect(card).toHaveCSS("box-shadow", "none");
  });
}

test("WEB-ME02 keyboard menu retains elevation during closing and releases after dismissal", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.locator('[data-id="sample-0"]');
  await card.locator(".more").focus();
  await page.keyboard.press("Enter");
  await expect(card).toHaveCSS("box-shadow", shadow);
  await page.keyboard.press("Escape");
  await page.getByRole("menu").evaluate((node) => {
    node.getAnimations().forEach((motion) => {
      motion.pause();
      motion.currentTime = 130;
    });
  });
  await expect(card).toHaveCSS("box-shadow", shadow);
  await page.getByRole("menu").evaluate((node) => {
    node.getAnimations().forEach((motion) => motion.finish());
  });
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(card).toHaveCSS("box-shadow", "none");
});
