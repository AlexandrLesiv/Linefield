import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.workerObservations = [];
    const Original = window.Worker;
    window.Worker = class extends Original {
      constructor(...args) {
        super(...args);
        const record = { worker: this, url: String(args[0]), ready: false, terminated: false };
        window.workerObservations.push(record);
        this.addEventListener("message", (e) => {
          if (e.data?.ready) record.ready = true;
        });
        this.observation = record;
      }
      terminate() {
        this.observation.terminated = true;
        super.terminate();
      }
    };
  });
  await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65284/");
  await page.locator(".new-tile").click();
  const host = page.frameLocator("iframe");
  await host.locator("#brush").waitFor();
  const frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
  await frame.waitForFunction(() =>
    window.workerObservations.some(
      (record) => record.url.includes("geometry-worker") && record.ready && !record.terminated,
    ),
  );
  await frame.evaluate(() => {
    const record = window.workerObservations.find(
      (item) => item.url.includes("geometry-worker") && item.ready && !item.terminated,
    );
    if (!record) throw Error("No live geometry worker for injection");
    window.faultedGeometry = record;
    record.worker.postMessage({ id: 123456, input: null, tolerance: 1 });
  });
  await frame.waitForFunction(() => window.faultedGeometry.terminated);
  const box = await host.locator("canvas").boundingBox();
  await page.mouse.move(box.x + 200, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 850, box.y + 350, { steps: 100 });
  await page.mouse.up();
  await frame.waitForFunction(() => !window.lab.renderPending());
  if ((await frame.evaluate(() => window.lab.core.count())) !== 1)
    throw Error("Drawing did not survive worker failure");
  await host.locator("#undo").click();
  if ((await frame.evaluate(() => window.lab.core.visible(0))) !== 0)
    throw Error("Undo failed after worker failure");
  await host.locator("#redo").click();
  if ((await frame.evaluate(() => window.lab.core.visible(0))) !== 1)
    throw Error("Redo failed after worker failure");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS malformed actual geometry worker response triggers bounded synchronous recovery; drawing/history remain usable",
  );
} finally {
  await browser.close();
}
