import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/regional-camera-input";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65301/");
  await page.locator(".new-tile").click();
  await page.frameLocator("iframe").locator("#brush").waitFor();
  const frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  const result = await frame.evaluate(() => {
    const core = lab.core;
    const rows = [];
    for (const region of [0n, 65536n, (1n << 62n) + 31n]) {
      for (const zoom of [0.1, 1, 16]) {
        for (const angle of [0, Math.PI / 2, -0.7]) {
          const id = core.begin_fixed_width(8, 0, 1);
          for (const [index, x] of [200.125, 200.1875, 200.25].entries()) {
            const y = 190.5,
              cx = 300,
              cy = 200;
            if (!core.camera_push(x, y, cx, cy, zoom, angle, region, -region, 0.75))
              throw Error("Mapped sample rejected");
            const dx = (x - cx) / zoom,
              dy = (y - cy) / zoom;
            const expected = [
              Math.cos(angle) * dx + Math.sin(angle) * dy,
              -Math.sin(angle) * dx + Math.cos(angle) * dy,
            ];
            for (let axis = 0; axis < 2; axis++) {
              const actual =
                Number(core.raw_region(id, index, axis) - [region, -region][axis]) * 65536 +
                core.raw_local(id, index, axis);
              if (Math.abs(actual - expected[axis]) > 1e-10)
                throw Error(`Mapped canonical position changed: ${actual} vs ${expected[axis]}`);
            }
            if (core.raw_point(id, index, 2) !== 0.75) throw Error("Pressure changed");
          }
          const length = core.raw_length(id);
          for (const badZoom of [0, -1, NaN, Infinity])
            if (core.camera_push(1, 1, 0, 0, badZoom, angle, region, -region, 1))
              throw Error("Invalid camera accepted input");
          if (
            core.camera_push(NaN, 1, 0, 0, zoom, angle, region, -region, 1) ||
            core.camera_push(1, 1, 0, 0, zoom, angle, region, -region, NaN)
          )
            throw Error("Invalid position/pressure accepted");
          if (core.raw_length(id) !== length) throw Error("Rejected sample changed accepted data");
          core.commit();
          core.undo();
          core.redo();
          if (core.raw_length(id) !== length) throw Error("History lost mapped samples");
          rows.push({ region: String(region), zoom, angle, accepted: length });
        }
      }
    }
    const id = core.begin_fixed_width(8, 0, 1);
    if (
      core.camera_push(65536, 0, 0, 0, 1, 0, (1n << 63n) - 1n, 0n, 1) ||
      core.camera_push(-1, 0, 0, 0, 1, 0, -(1n << 63n), 0n, 1) ||
      core.raw_length(id)
    )
      throw Error("Mapped address overflow admitted a sample");
    core.cancel();
    return { rows, limitation: "Input admission only; renderer still uses zero regional origin." };
  });
  if (errors.length) throw Error(errors.join("; "));
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ browser: browser.version(), ...result }, null, 2),
  );
  console.log(
    `PASS ${result.rows.length} regional camera admission cases plus invalid input and overflow`,
  );
} finally {
  await browser.close();
}
