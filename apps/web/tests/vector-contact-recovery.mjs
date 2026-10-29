import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { digest } from "./vector-saving-recovery-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Isolated preview required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const source of ["pen", "mouse"])
    for (const scenario of [
      "new-id",
      "same-id",
      "hover",
      "coalesced-hover",
      "outside-up",
      "foreign-pending",
      "pending-pressed",
      "pending-capture",
    ]) {
      const page = await browser.newPage();
      page.on("dialog", (d) => d.accept());
      await page.goto(url);
      await page.locator(".new-tile").click();
      await page.locator("iframe").waitFor();
      let f = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await f.waitForFunction(() => !!window.lab);
      const result = await f.evaluate(
        ({ source, scenario }) => {
          const c = document.querySelector("canvas"),
            r = c.getBoundingClientRect();
          c.setPointerCapture = () => {};
          c.hasPointerCapture = () => true;
          c.releasePointerCapture = () => {};
          let stamp = performance.now();
          const event = (type, extra = {}) => {
            const e = new PointerEvent(type, {
              bubbles: true,
              pointerType: source,
              pointerId: 2,
              isPrimary: true,
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              pressure: 0.6,
              clientX: r.left + 200,
              clientY: r.top + 200,
              ...extra,
            });
            Object.defineProperty(e, "timeStamp", { value: ++stamp });
            return e;
          };
          const send = (type, extra = {}, target = c) => target.dispatchEvent(event(type, extra));
          const raw = (id) =>
            Array.from({ length: lab.core.raw_length(id) }, (_, i) => [
              String(lab.core.raw_region(id, i, 0)),
              lab.core.raw_local(id, i, 0),
              String(lab.core.raw_region(id, i, 1)),
              lab.core.raw_local(id, i, 1),
              lab.core.raw_point(id, i, 2),
            ]);
          send("pointerdown");
          for (let i = 1; i <= 20; i++) send("pointermove", { clientX: r.left + 200 + i });
          const before = raw(0);
          send("pointerup", { pointerId: 3 }); // Reported mismatch must not commit by itself.
          const afterForeign = lab.inputDiagnostics().state;
          if (scenario === "outside-up")
            send("pointerup", { clientX: r.left + 220 }, document.body);
          else if (scenario.startsWith("pending-")) {
            c.hasPointerCapture = () => false;
            send("lostpointercapture", { buttons: 0, button: -1 });
            send(scenario === "pending-pressed" ? "pointermove" : "gotpointercapture");
          } else if (scenario.includes("hover")) {
            const samples =
              scenario === "coalesced-hover"
                ? [
                    event("pointermove", { clientX: r.left + 221 }),
                    event("pointermove", { clientX: r.left + 222, buttons: 3 }),
                  ]
                : [];
            const hover = event("pointermove", {
              buttons: 0,
              button: -1,
              pressure: 0,
              clientX: r.left + 800,
            });
            Object.defineProperty(hover, "getCoalescedEvents", { value: () => samples });
            c.dispatchEvent(hover);
          } else {
            if (scenario === "foreign-pending") {
              c.hasPointerCapture = () => false;
              send("lostpointercapture", { buttons: 0, button: -1 });
              send(
                "pointerdown",
                { pointerType: source === "pen" ? "mouse" : "pen" },
                document.body,
              );
            }
            const id = scenario === "same-id" ? 2 : 3;
            send("pointerdown", { pointerId: id, clientX: r.left + 400 });
            send("pointermove", { pointerId: id, clientX: r.left + 410 });
            send("pointerup", { pointerId: id, clientX: r.left + 410 });
            send("pointerup", { pointerId: 2 });
          }
          return {
            before,
            afterForeign,
            after: raw(0),
            count: lab.core.count(),
            log: lab.inputDiagnostics(),
          };
        },
        { source, scenario },
      );
      assert.equal(result.afterForeign.pointer, 2);
      assert.equal(result.afterForeign.revision, "0");
      assert.deepEqual(result.after.slice(0, result.before.length), result.before);
      assert.equal(
        result.after.length,
        result.before.length + (scenario === "coalesced-hover" ? 2 : 0),
      );
      assert.equal(result.log.state.pointer, null);
      const expected = ["new-id", "same-id", "foreign-pending"].includes(scenario) ? 2 : 1;
      assert.equal(result.log.entries.filter((e) => e.kind === "commit").length, expected);
      assert(result.log.entries.some((e) => e.kind === "document-pointerup"));
      const before = await digest(f);
      const history = await f.evaluate((count) => {
        const remaining = [];
        for (let i = 0; i < count; i++) {
          lab.core.undo();
          remaining.push(
            Array.from({ length: lab.core.count() }, (_, id) => lab.core.visible(id)).reduce(
              (a, b) => a + b,
              0,
            ),
          );
        }
        for (let i = 0; i < count; i++) lab.core.redo();
        return remaining;
      }, expected);
      assert.deepEqual(history, expected === 2 ? [1, 0] : [0]);
      assert.equal(await digest(f), before);
      if (scenario === "new-id") {
        const worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
        await worker.evaluate(() => {
          const handler = self.onmessage;
          self.onmessage = function (event) {
            if (event.data.kind === "commit") {
              self.postMessage({ id: event.data.id, error: "injected-storage-failure" });
              return;
            }
            return handler.call(self, event);
          };
        });
        assert.equal(
          await f.evaluate(() =>
            lab.saving.flush(true).then(
              () => false,
              () => true,
            ),
          ),
          true,
        );
        assert.equal(await digest(f), before);
        await f.evaluate(() => lab.saving.retry());
      }
      await f.evaluate(() => lab.saving.flush(true));
      assert.equal(await f.evaluate(() => lab.saving.state().phase), "saved");
      await page.reload();
      await page.locator("iframe").waitFor();
      f = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await f.waitForFunction(() => !!window.lab);
      assert.equal(await digest(f), before);
      console.log(
        `${source}/${scenario}: accepted samples, commit count and durable reload passed`,
      );
      await page.close();
    }
} finally {
  await browser.close();
}
