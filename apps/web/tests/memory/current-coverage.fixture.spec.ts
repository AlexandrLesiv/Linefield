import { test, expect } from "@playwright/test";
import { forcePackedTargets } from "./packed-targets.ts";
for (const packed of [false, true])
  for (const phase of ["before", "after"])
    test(`MIG-WORKER-32 extension failure ${phase} composite (${packed ? "packed" : "R8"})`, async ({
      page,
    }, info) => {
      if (packed) await forcePackedTargets(page);
      await page.goto("/tests/fixtures/memory/index.html");
      await page
        .getByRole("button", { name: `Run candidate failure ${phase} composite`, exact: true })
        .click();
      await expect(page.locator("#result")).toContainText('"status":"passed"');
      await info.attach("injected-host-boundary-fault", {
        body: await page.locator("#result").innerText(),
        contentType: "application/json",
      });
    });
for (const packed of [false, true])
  test(`MIG-WORKER-32 optional tail capacity defers without cancelling input (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    if (packed) await forcePackedTargets(page);
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: "Run tail capacity", exact: true }).click();
    await expect(page.locator("#result")).toContainText('"status":"passed"');
    await info.attach("host-typed-capacity-evidence", {
      body: await page.locator("#result").innerText(),
      contentType: "application/json",
    });
  });
test("MIG-WORKER-32 checked coverage wrappers and combined receipt lifetime capacity", async ({
  page,
}, info) => {
  await page.goto("/tests/fixtures/memory/index.html");
  await page.getByRole("button", { name: "Run coverage lifetime", exact: true }).click();
  await expect(page.locator("#result")).toContainText('"status":"passed"');
  await info.attach("typed-lifetime-evidence", {
    body: await page.locator("#result").innerText(),
    contentType: "application/json",
  });
});
test("MIG-WORKER-32 typed coverage authority, immutable successor and permanent lifetime fences", async ({
  page,
}, info) => {
  await page.goto("/tests/fixtures/memory/index.html");
  await page.getByRole("button", { name: "Run current coverage", exact: true }).click();
  await expect(page.locator("#result")).toContainText('"status":"passed"');
  await info.attach("typed-boundary-evidence", {
    body: await page.locator("#result").innerText(),
    contentType: "application/json",
  });
});
