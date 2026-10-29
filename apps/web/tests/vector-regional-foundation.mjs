import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/regional-foundation";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65291/");
  await page.locator(".new-tile").click();
  const host = page.frameLocator("iframe");
  await host.locator("#brush").waitFor();
  const frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  const result = await frame.evaluate(() => {
    const core = lab.core,
      min = -(1n << 63n),
      max = (1n << 63n) - 1n;
    const cases = [];
    const read = () => [core.regional_result_region(), core.regional_result_local()];
    function check(operation, region, local, delta, expected) {
      const previous = read();
      const status =
        operation === "normalize"
          ? core.regional_normalize(region, local)
          : core.regional_offset(region, local, delta);
      const actual = read();
      const wanted = expected || previous;
      if (status !== Number(!!expected) || actual[0] !== wanted[0] || actual[1] !== wanted[1])
        throw Error(
          `${operation}: ${region}, ${local}, ${delta}: got ${status} ${actual}; expected ${expected}`,
        );
      cases.push({
        operation,
        region: String(region),
        local: String(local),
        delta: String(delta),
        status,
        result: [String(actual[0]), actual[1]],
      });
    }
    for (const region of [min, min + 1n, -65536n, -1n, 0n, 1n, 65536n, max - 1n, max]) {
      for (const local of [0, 0.0625, 32768.125, 65535.9375]) {
        check("normalize", region, local, 0, [region, local]);
        check("offset", region, local, 65536, region === max ? null : [region + 1n, local]);
        check("offset", region, local, -65536, region === min ? null : [region - 1n, local]);
      }
    }
    check("normalize", 0n, -0.0625, 0, [-1n, 65535.9375]);
    check("normalize", max, 65536, 0, null);
    check("normalize", min, -1, 0, null);
    check("offset", 0n, 65535.9375, 0.125, [1n, 0.0625]);
    check("offset", 0n, 0.0625, -0.125, [-1n, 65535.9375]);
    check("offset", min, 0.125, 2 ** 79, [0n, 0.125]);
    check("offset", max, 0.125, -(2 ** 79), [-1n, 0.125]);
    for (const bad of [NaN, Infinity, -Infinity, Number.MAX_VALUE]) {
      check("normalize", 0n, bad, 0, null);
      check("offset", 0n, 1, bad, null);
    }
    check("offset", 0n, -1, 0, null);
    check("offset", 0n, 65536, 0, null);
    let rejectsNumber = false;
    try {
      core.regional_normalize(0, 0);
    } catch (error) {
      rejectsNumber = error instanceof TypeError;
    }
    if (!rejectsNumber) throw Error("i64 region was silently accepted as a JS number");
    const adapter = lab.regional;
    const address = adapter.normalize(max - 1n, 0.125);
    const moved = adapter.offset(address, 65536);
    if (
      !Object.isFrozen(address) ||
      address.region !== max - 1n ||
      address.local !== 0.125 ||
      moved.region !== max ||
      moved.local !== 0.125
    )
      throw Error("Regional adapter did not copy a precise immutable result");
    const previous = read();
    for (const region of [max + 1n, min - 1n, 0, NaN])
      if (adapter.normalize(region, 0) !== null) throw Error("Out-of-range region crossed Wasm");
    if (
      adapter.offset({ region: max + 1n, local: 0 }, 1) !== null ||
      adapter.offset(address, Infinity) !== null ||
      adapter.normalize(0n, NaN) !== null
    )
      throw Error("Invalid regional transport accepted");
    const after = read();
    if (after[0] !== previous[0] || after[1] !== previous[1])
      throw Error("Rejected host transport changed shared output");
    return {
      adapterTransportChecked: true,
      cases,
      rejectsNumber,
      limitation: "Primitive boundary only; drawing still stores donor f32 samples.",
    };
  });
  const canvas = await host.locator("canvas").boundingBox();
  await page.mouse.move(canvas.x + 180, canvas.y + 250);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 450, canvas.y + 350, { steps: 16 });
  await page.mouse.up();
  await host.locator("#undo").click();
  await host.locator("#redo").click();
  const visible = await frame.evaluate(() => lab.core.count() === 1 && lab.core.visible(0) === 1);
  if (!visible || errors.length) throw Error(`Drawing/history failed: ${errors.join("; ")}`);
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ browser: browser.version(), ...result, drawingAndHistory: true }, null, 2),
  );
  console.log(
    `PASS ${result.cases.length} regional Wasm checks, typed region boundary, drawing/history`,
  );
} finally {
  await browser.close();
}
