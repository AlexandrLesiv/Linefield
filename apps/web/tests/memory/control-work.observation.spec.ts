import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";

test("MIG-WORKER-17 unchanged ink presentation avoids toolbar writes and reports bounded batch phases", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await page.evaluate(() => {
    const controls = document.querySelectorAll(".drawing-context, .drawing-rail");
    document.documentElement.dataset.controlWrites = "0";
    const observer = new MutationObserver((records) => {
      const count = Number(document.documentElement.dataset.controlWrites);
      document.documentElement.dataset.controlWrites = `${count + records.length}`;
    });
    for (const control of controls)
      observer.observe(control, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
  });
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await expect
    .poll(async () => Number(await page.locator("html").getAttribute("data-control-writes")))
    .toBeGreaterThan(0);
  await clear(page);
  await page.evaluate(() => {
    document.documentElement.dataset.controlWrites = "0";
  });
  await page.mouse.move(700, 400, { steps: 32 });
  await expect(page.locator("html")).toHaveAttribute("data-control-writes", "0");
  const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
  expect(snapshot?.dropped).toBe(0);
  const records = snapshot?.records ?? [];
  const phases = records.filter((r) => r.kind === "command-phase");
  expect(phases.length).toBeGreaterThan(0);
  for (const phase of phases) {
    const input = records.find((r) => r.kind === "input" && r.request === phase.request);
    expect(input?.outcome).toBe("ok");
    for (const key of ["owner", "session", "scene", "content", "mapping"])
      expect(phase[key]).toBe(input?.[key]);
    const times = [
      "callbackStart",
      "acquisitionEnd",
      "rustReturn",
      "stateUpdateEnd",
      "controlsSyncEnd",
      "contactSyncEnd",
      "callbackEnd",
    ].map((key) => Number(phase[key]));
    expect(times.every(Number.isFinite)).toBe(true);
    expect(times.every((time, index) => index === 0 || time >= (times[index - 1] ?? 0))).toBe(true);
  }
  expect(
    records.some((r) => r.kind === "stroke-count" && r.active && BigInt(r.count ?? 0) > 1n),
  ).toBe(true);
  await clear(page);
  await page.mouse.up();
  await complete(page);
  await expect
    .poll(async () => Number(await page.locator("html").getAttribute("data-control-writes")))
    .toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toBeEnabled();
});
