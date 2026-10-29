import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";
import { panToRegionalOrigin } from "./vector-regional-navigation.mjs";

const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/regional-view";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65304/");
  await page.locator(".new-tile").click();
  await page.frameLocator("iframe").locator("#brush").waitFor();
  const frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  async function draw(baseY) {
    await frame.evaluate((strokeY) => {
      const canvas = document.querySelector("canvas"),
        r = canvas.getBoundingClientRect();
      const names = ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"];
      const descriptors = names.map((name) => Object.getOwnPropertyDescriptor(canvas, name));
      canvas.setPointerCapture = () => {};
      canvas.hasPointerCapture = () => true;
      canvas.releasePointerCapture = () => {};
      const send = (type, x, pointY) =>
        canvas.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 312,
            pointerType: "pen",
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            pressure: 0.7,
            clientX: r.x + x,
            clientY: r.y + pointY,
          }),
        );
      try {
        document.querySelector("#pen").click();
        document.querySelector("#width").value = "24";
        send("pointerdown", 200, strokeY);
        for (let i = 1; i <= 4096; i++)
          send("pointermove", 200 + i / 8, strokeY + Math.sin(i / 160) * 35);
        send("pointerup", 712, strokeY + Math.sin(4096 / 160) * 35);
      } finally {
        names.forEach((name, i) =>
          descriptors[i]
            ? Object.defineProperty(canvas, name, descriptors[i])
            : delete canvas[name],
        );
      }
    }, baseY);
  }
  const hash = async () => Buffer.from(await captureDrawing(frame)).toString("hex");
  await draw(220);
  const near = await hash();
  const origin = 4294901760;
  await panToRegionalOrigin(frame, origin);
  await draw(400);
  const far = await hash();
  await panToRegionalOrigin(frame, -origin, "0");
  if ((await hash()) !== near)
    throw Error("Resident near drawing changed after regional roundtrip");
  await panToRegionalOrigin(frame, origin, String(BigInt(origin / 65536)), true);
  const held = await hash();
  if (held !== far)
    throw Error("Previously offscreen drawing absent or changed while pan remains held");
  await frame.evaluate(() =>
    document.querySelector("canvas").dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        pointerId: 311,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
      }),
    ),
  );
  if ((await hash()) !== held) throw Error("Pan release changed the accurate regional frame");
  const phases = await frame.evaluate(() => {
    const core = lab.core;
    let count = 0;
    for (const region of [-(1n << 63n), -1n, 0n, 1n, (1n << 63n) - 1n])
      for (const period of [24, 64, 256])
        for (const local of [-0.125, 0, 13.5, 65535.875]) {
          const modulus = BigInt(period);
          const base = Number((((region * 65536n) % modulus) + modulus) % modulus);
          const expected = (((base + (local % period)) % period) + period) % period;
          if (core.regional_phase(region, local, period) !== expected)
            throw Error("Paper/grid phase lost regional precision");
          count++;
        }
    if (
      core.count() !== 2 ||
      core.raw_region(0, 0, 0) !== 0n ||
      core.raw_region(1, 0, 0) !== 65535n
    )
      throw Error("View rebasing rewrote canonical data");
    return count;
  });
  if (errors.length) throw Error(errors.join("; "));
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ browser: browser.version(), near, far, held, phases, passed: true }, null, 2),
  );
  console.log(
    "PASS regional pan roundtrip, held-pointer offscreen drawing, stable release and 60 material phases",
  );
} finally {
  await browser.close();
}
