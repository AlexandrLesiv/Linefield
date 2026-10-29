import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";
const output =
  process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/worker-material/recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  rows = [];
try {
  for (const fault of [
    "none",
    "throw",
    "malformed",
    "corrupt",
    "oversized",
    "hang",
    "early-pencil",
    "slow-digest",
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (fault === "slow-digest")
      await page.addInitScript(() => {
        const digest = crypto.subtle.digest.bind(crypto.subtle);
        crypto.subtle.digest = async (algorithm, data) => {
          if (data.byteLength === 16777216)
            await new Promise((resolve) => setTimeout(resolve, 3000));
          return digest(algorithm, data);
        };
      });
    await page.addInitScript(() => {
      window.materialWorkers = { created: 0, terminated: 0 };
      const Native = Worker;
      window.Worker = class extends Native {
        constructor(url, options) {
          super(url, options);
          if (String(url).includes("paper-contact-worker")) {
            window.materialWorkers.created++;
            const terminate = this.terminate.bind(this);
            this.terminate = () => {
              window.materialWorkers.terminated++;
              terminate();
            };
          }
        }
      };
    });
    if (fault === "oversized")
      await page.route("**/paper-contact-worker-*.js", async (route) => {
        const response = await route.fetch();
        const prefix = `const send=self.postMessage.bind(self);self.postMessage=(message)=>{const buffer=new ArrayBuffer(16777217);const data=new Uint8Array(buffer,1);data.set(message.data);send({version:1,data},[buffer]);};`;
        await route.fulfill({
          contentType: "application/javascript",
          body: prefix + (await response.text()),
        });
      });
    if (fault !== "none" && fault !== "slow-digest" && fault !== "oversized")
      await page.route("**/paper-contact-worker-*.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: {
            throw: 'throw Error("injected bake failure")',
            malformed: "postMessage({version:1,data:new Uint8Array(1)})",
            corrupt:
              "const data=new Uint8Array(16777216);postMessage({version:1,data},[data.buffer])",
            oversized:
              "const buffer=new ArrayBuffer(16777217);const data=new Uint8Array(buffer,1);postMessage({version:1,data},[buffer])",
            hang: "/* intentionally never replies */",
            "early-pencil": "/* intentionally never replies */",
          }[fault],
        }),
      );
    await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65339/");
    await page.locator(".new-tile").click();
    const host = page.frameLocator("iframe");
    await host.locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab, {}, { timeout: 15000 });
    const beforeInk = performance.now();
    const images = [];
    for (const brush of [0, 1, 2]) {
      await host.locator("#brush").selectOption(String(brush));
      const b = await host.locator("canvas").boundingBox();
      await page.mouse.move(b.x + 200, b.y + 180 + brush * 100);
      await page.mouse.down();
      await page.mouse.move(b.x + 550, b.y + 220 + brush * 100, { steps: 32 });
      await page.mouse.up();
      images.push(await captureDrawing(frame));
      if (brush === 0) {
        if ((fault === "hang" || fault === "early-pencil") && performance.now() - beforeInk > 2000)
          throw Error("Ink blocked by optional material worker");

        if (fault === "hang") {
          await frame.evaluate(() => {
            if (lab.brushStats().materialPreparation.mode !== "pending")
              throw Error("Hang was not pending during Ink");
            window.savedMaterialCore = lab.core;
          });
          await page.getByRole("button", { name: "← Back", exact: true }).click();
          await page.locator(".drawing-surface").waitFor({ state: "detached" });
          await page.locator(".new-tile").click();
          await host.locator("#brush").waitFor();
          if (
            !(await frame.evaluate(
              () => lab.core === window.savedMaterialCore && lab.core.count() === 1,
            ))
          )
            throw Error("Pending-material Back/Resume lost engine or stroke");
        }
        if (fault !== "early-pencil" && fault !== "slow-digest")
          await frame.waitForFunction(
            () => lab.brushStats().materialPreparation.mode !== "pending",
            {},
            { timeout: 8000 },
          );
      }
    }
    if (fault === "slow-digest") await page.waitForTimeout(3100);
    if (errors.length) throw Error(errors.join("\n"));
    const state = await frame.evaluate(() => ({
      stats: lab.brushStats(),
      workers: window.materialWorkers,
      raw: Array.from({ length: lab.core.count() }, (_, id) =>
        Array.from({ length: lab.core.raw_length(id) }, (_point, i) => [
          String(lab.core.raw_region(id, i, 0)),
          String(lab.core.raw_region(id, i, 1)),
          lab.core.raw_local(id, i, 0),
          lab.core.raw_local(id, i, 1),
          lab.core.raw_point(id, i, 2),
        ]),
      ),
    }));
    if (state.workers.created !== 1 || state.workers.terminated !== 1)
      throw Error("Unbounded material worker lifecycle");
    if (
      state.stats.materialPreparation.mode !==
      (fault === "none" ? "worker" : "synchronous-fallback")
    )
      throw Error("Wrong material recovery mode");
    rows.push({ fault, state, images });
    await page.close();
  }
  for (const row of rows.slice(1))
    if (
      JSON.stringify(row.images) !== JSON.stringify(rows[0].images) ||
      JSON.stringify(row.state.raw) !== JSON.stringify(rows[0].state.raw)
    )
      throw Error(`Recovery parity failed ${row.fault}`);
  await writeFile(`${output}/results.json`, JSON.stringify(rows, null, 2));
  console.log(
    "PASS eight material modes, exact three-brush images/raw, one worker terminated per session",
  );
} finally {
  await browser.close();
}
