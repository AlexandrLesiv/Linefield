import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { digest } from "./vector-saving-recovery-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Isolated preview required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const failure of [false, true]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", (d) => d.accept());
    await page.goto(url);
    await page.locator(".new-tile").click();
    await page.locator("iframe").waitFor();
    let f = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
    await f.waitForFunction(() => !!window.lab);
    const result = await f.evaluate((failCapture) => {
      const c = document.querySelector("canvas"),
        r = c.getBoundingClientRect();
      const held = new Set();
      let stamp = performance.now();
      c.setPointerCapture = (id) => {
        if (failCapture && id !== 2) throw new DOMException("capture failure", "NotFoundError");
        held.add(id);
      };
      c.hasPointerCapture = (id) => held.has(id);
      c.releasePointerCapture = (id) => {
        held.delete(id);
      };
      const ev = (type, id, x, extra = {}) => {
        const e = new PointerEvent(type, {
          bubbles: true,
          pointerType: "pen",
          pointerId: id,
          isPrimary: true,
          buttons: type === "pointerup" ? 0 : 1,
          button: type === "pointerdown" || type === "pointerup" ? 0 : -1,
          pressure: 0.6,
          clientX: r.left + x,
          clientY: r.top + 200,
          ...extra,
        });
        Object.defineProperty(e, "timeStamp", { value: ++stamp });
        return e;
      };
      const send = (type, id, x, extra = {}, target = c) =>
        target.dispatchEvent(ev(type, id, x, extra));
      const raw = () =>
        Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
          String(lab.core.raw_region(0, i, 0)),
          lab.core.raw_local(0, i, 0),
          String(lab.core.raw_region(0, i, 1)),
          lab.core.raw_local(0, i, 1),
          lab.core.raw_point(0, i, 2),
        ]);
      send("pointerdown", 2, 200);
      send("pointermove", 2, 210);
      const original = raw();
      for (const extra of [
        { pointerType: "mouse" },
        { pointerType: "touch" },
        { isPrimary: false },
        { buttons: 0 },
      ])
        send("pointermove", 9, 900, extra);
      send("pointerup", 9, 900);
      // A separate event with an old timestamp cannot take ownership.
      const old = new PointerEvent("pointermove", {
        bubbles: true,
        pointerType: "pen",
        pointerId: 9,
        isPrimary: true,
        buttons: 1,
      });
      Object.defineProperty(old, "timeStamp", { value: 0 });
      c.dispatchEvent(old);
      const excluded = raw();
      const samples = [ev("pointermove", 3, 220), ev("pointermove", 3, 230, { buttons: 3 })];
      const transition = ev("pointermove", 3, 230);
      Object.defineProperty(transition, "getCoalescedEvents", { value: () => samples });
      c.dispatchEvent(transition);
      const after = raw(),
        active = lab.inputDiagnostics().state;
      const queuedUp = new PointerEvent("pointerup", {
        bubbles: true,
        pointerType: "pen",
        pointerId: 3,
        isPrimary: true,
        buttons: 0,
        button: 0,
      });
      Object.defineProperty(queuedUp, "timeStamp", { value: transition.timeStamp - 1 });
      c.dispatchEvent(queuedUp);
      send("pointermove", 2, 999);
      send("pointerup", 2, 999);
      send("pointercancel", 2, 999);
      send("lostpointercapture", 2, 999, { buttons: 0 });
      const retired = raw();
      send("pointermove", 3, 240, {}, document.body);
      send("pointermove", 4, 250);
      send("pointermove", 3, 999);
      send("pointermove", 4, 260, {}, document.body);
      send("pointerup", 4, 260, {}, document.body);
      send("pointerup", 4, 260);
      const completed = raw(),
        log = lab.inputDiagnostics();
      lab.core.undo();
      const undone = lab.core.visible(0);
      lab.core.redo();
      return {
        original,
        excluded,
        after,
        active,
        retired,
        completed,
        redone: raw(),
        undone,
        visible: lab.core.visible(0),
        log,
      };
    }, failure);
    assert.deepEqual(result.excluded, result.original);
    assert.deepEqual(result.after.slice(0, 2), result.original);
    assert.equal(result.after.length, 4);
    assert.equal(result.active.pointer, 3);
    assert.equal(result.active.revision, "0");
    assert.deepEqual(result.retired, result.after);
    assert.equal(result.completed.length, 7);
    assert.deepEqual(result.completed.slice(0, 4), result.after);
    assert.equal(result.undone, 0);
    assert.equal(result.visible, 1);
    assert.deepEqual(result.redone, result.completed);
    assert.equal(result.log.entries.filter((e) => e.kind === "pen-identity-transition").length, 2);
    assert.equal(result.log.entries.filter((e) => e.kind === "commit").length, 1);
    assert.equal(result.log.state.pointer, null);
    const before = await digest(f);
    await f.evaluate(() => lab.saving.flush(true));
    await page.reload();
    await page.locator("iframe").waitFor();
    f = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
    await f.waitForFunction(() => !!window.lab);
    assert.equal(await digest(f), before);
    const cancelled = await f.evaluate(() => {
      const c = document.querySelector("canvas");
      c.setPointerCapture = (id) => {
        if (id === 6) throw new DOMException("capture failure", "NotFoundError");
      };
      c.hasPointerCapture = () => false;
      c.releasePointerCapture = () => {};
      let stamp = performance.now();
      const send = (kind, id, target = c) => {
        const e = new PointerEvent(kind, {
          bubbles: true,
          pointerType: "pen",
          pointerId: id,
          isPrimary: true,
          buttons: 1,
          button: kind === "pointerdown" ? 0 : -1,
          clientX: 200,
          clientY: 200,
          pressure: 0.5,
        });
        Object.defineProperty(e, "timeStamp", { value: ++stamp });
        target.dispatchEvent(e);
      };
      send("pointerdown", 5);
      send("pointermove", 6);
      send("pointercancel", 6, document.body);
      return lab.inputDiagnostics();
    });
    assert.equal(cancelled.state.pointer, null);
    assert(
      cancelled.entries.some((e) => e.kind === "commit" && e.reason === "document-pointer-cancel"),
    );
    console.log(
      `pen identity transition captureFailure=${failure}: exact samples, continuity, exclusions, history and reload passed`,
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser.close();
}
