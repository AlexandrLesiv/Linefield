import { test, expect } from "@playwright/test";
test("MIG-WORKER-07 malformed worker geometry cannot replace completed artwork", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = Worker;
    let injected = false;
    window.Worker = class extends Original {
      override postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = [],
      ) {
        if (
          !injected &&
          message &&
          typeof message === "object" &&
          "kind" in message &&
          message.kind === "start" &&
          "request" in message
        ) {
          injected = true;
          document.documentElement.dataset.workerMalformed = "true";
          const request = message.request;
          queueMicrotask(() =>
            this.dispatchEvent(
              new MessageEvent("message", {
                data: {
                  kind: "page",
                  request,
                  data: new Float32Array([NaN, 0, 1, 0, 0, 1]),
                  origin: new Float64Array(2),
                  done: true,
                  heap: 65536,
                  duration: 0,
                },
              }),
            ),
          );
          return;
        }
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const clip = { x: 200, y: 200, width: 600, height: 450 },
    blank = await page.screenshot({ clip });
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(650, 450, { steps: 32 });
  await page.mouse.up();
  const artwork = await page.screenshot({ clip });
  expect(artwork.equals(blank)).toBe(false);
  await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-worker-malformed", "true");
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await page.getByRole("button", { name: "Reset canvas rotation", exact: true }).click();
  await expect.poll(async () => (await page.screenshot({ clip })).equals(artwork)).toBe(true);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect.poll(async () => (await page.screenshot({ clip })).equals(blank)).toBe(true);
});
