import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
type RecordValue = Readonly<Record<string, string | number | boolean>>;
export async function complete(
  page: Page,
  noLiveOwner = false,
  active = false,
  observe?: (records: readonly RecordValue[]) => void,
  accepted?: RecordValue,
) {
  let input = accepted;
  const overlays = new Map<number, RecordValue>();
  await expect
    .poll(async () => {
      const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
      if (!snapshot) throw Error("observation build required");
      if (snapshot.dropped) throw Error("observation ring overflow");
      observe?.(snapshot.records);
      let matched = false;
      for (const r of snapshot.records) {
        if (noLiveOwner && r.kind === "live-owner")
          throw Error("historical Redo created a live owner");
        if (r.kind === "input" && ["ok", "noop"].includes(`${r.outcome}`)) input = r;
        if (r.kind === "overlay-submit" && typeof r.serial === "number") overlays.set(r.serial, r);
        if (
          active &&
          r.kind === "overlay-submit" &&
          r.complete &&
          input &&
          ["owner", "session", "scene", "content", "mapping"].every(
            (key) => r[key] === input?.[key],
          )
        )
          matched = true;
        const overlay = typeof r.serial === "number" ? overlays.get(r.serial) : undefined;
        if (
          r.kind === "receipt-ack" &&
          overlay?.complete &&
          input &&
          ["owner", "session", "content", "mapping"].every(
            (key) => r[key] === input?.[key] && r[key] === overlay[key],
          )
        )
          matched = true;
      }
      if (overlays.size > 32) overlays.delete(overlays.keys().next().value ?? -1);
      return matched;
    })
    .toBe(true);
  return input;
}
export async function clear(page: Page) {
  await page.evaluate(() => window["__linefieldPerfRead"]?.());
}
