import { test, expect } from "@playwright/test";
import { observeEditorCalls } from "./editor-call-observation.ts";
import { forcePackedTargets } from "./packed-targets.ts";
for (const packed of [false, true])
  for (const name of [
    "publication-promote",
    "publication-fold",
    "publication-create",
    "publication-create-release",
    "query",
    "release",
    "render",
    "invisible",
    "before",
    "after",
    "draw",
    "capacity",
    "same",
    "multiple",
  ])
    test(`MIG-TILE-02/05/06 prefix seed ${name} ${packed ? "packed" : "normal"}`, async ({
      page,
      browser,
    }, info) => {
      if (packed) await forcePackedTargets(page);
      if (name.startsWith("publication-")) await observeEditorCalls(page);
      await page.goto("/tests/fixtures/memory/index.html");
      await page.getByRole("button", { name: `Run prefix seed ${name}`, exact: true }).click();
      await expect(page.locator("#result")).not.toHaveText("running", { timeout: 20000 });
      const result = await page.locator("#result").innerText();
      await info.attach("prefix-seed-boundary", {
        body: JSON.stringify({
          version: browser.version(),
          result,
          packed,
          evidence: "actual generated engine/preparation/GL boundary with controlled faults",
        }),
        contentType: "application/json",
      });
      expect(result).toContain('"status":"passed"');
    });
