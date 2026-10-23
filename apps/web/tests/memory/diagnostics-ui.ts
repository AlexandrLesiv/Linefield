import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
export async function openDiagnostics(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Developer diagnostics", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Developer diagnostics" })).toBeVisible();
}
export async function beginCapture(page: Page): Promise<void> {
  await openDiagnostics(page);
  await page.getByRole("button", { name: "Capture for 30 seconds", exact: true }).click();
  await expect(page.locator("[data-memory-canvas]")).toBeFocused();
}
export async function drawDiagnosticStroke(page: Page, start = 300): Promise<void> {
  await page.mouse.move(start, 350);
  await page.mouse.down();
  await page.mouse.move(start + 220, 420, { steps: 18 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
}
export async function downloadReport(page: Page): Promise<string> {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON", exact: true }).click();
  const file = await download;
  const path = await file.path();
  if (!path) throw Error("diagnostics download has no local artifact");
  return readFile(path, "utf8");
}
