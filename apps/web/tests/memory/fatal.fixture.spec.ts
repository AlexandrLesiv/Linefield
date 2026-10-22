import { test, expect } from "@playwright/test";
import { settleSurface } from "./layout-assertions.ts";
test("WMR-04 isolated actual engine trap stays fatal across Back Resume without further Rust calls", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const instantiate = WebAssembly.instantiateStreaming;
    WebAssembly.instantiateStreaming = async (source, imports) => {
      const result = await instantiate(source, imports);
      const exports = { ...result.instance.exports };
      for (const [name, value] of Object.entries(exports)) {
        if (!name.startsWith("memory") || typeof value !== "function") continue;
        document.documentElement.dataset.wrappedCalls = `${
          Number(document.documentElement.dataset.wrappedCalls ?? 0) + 1
        }`;
        exports[name] = (...args: unknown[]) => {
          const dataset = document.documentElement.dataset;
          dataset.engineCalls = `${Number(dataset.engineCalls ?? 0) + 1}`;
          if (dataset.afterFatal !== undefined)
            dataset.afterFatal = `${Number(dataset.afterFatal) + 1}`;
          return Reflect.apply(value, undefined, args);
        };
      }
      Object.defineProperty(result.instance, "exports", { value: exports });
      return result;
    };
  });
  await page.goto("/tests/fixtures/memory/app.html");
  await page.getByRole("button", { name: "Arm isolated engine trap" }).click();
  await expect(page.locator("#arm")).toBeHidden();
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "fatal");
  await expect(page.getByRole("button", { name: /Retry/ })).toBeHidden();
  await settleSurface(page);
  await page.screenshot({ path: info.outputPath("fatal-editor.png") });
  const read = () =>
    page.evaluate(() => {
      document.dispatchEvent(new Event("fixture-observe"));
      return document.body.dataset.fixtureDiagnostics;
    });
  const before = await read();
  expect(Number(await page.locator("html").getAttribute("data-wrapped-calls"))).toBeGreaterThan(0);
  expect(Number(await page.locator("html").getAttribute("data-engine-calls"))).toBeGreaterThan(0);
  await page.evaluate(() => {
    document.documentElement.dataset.afterFatal = "0";
  });
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".prototype-label")).toContainText("cannot be recovered");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "fatal");
  expect(await read()).toBe(before);
  await expect(page.locator("html")).toHaveAttribute("data-after-fatal", "0");
});
