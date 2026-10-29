import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/regional-editing";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65300/");
  await page.locator(".new-tile").click();
  await page.frameLocator("iframe").locator("#brush").waitFor();
  const frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  const result = await frame.evaluate(() => {
    const core = lab.core;
    const rows = [];
    const regionPairs = [
      [0n, 0n],
      [65536n, -65536n],
      [(1n << 62n) + 17n, -(1n << 61n) + 9n],
    ];
    const variants = [
      [2, 0],
      [1, Math.PI / 2],
      [0.5, -0.7],
      [3, 2.2],
    ];
    for (const [rx, ry] of regionPairs) {
      const id = core.begin_fixed_width(8, 0, 1);
      for (const local of [10.125, 10.1875, 10.25])
        if (!lab.regional.append({ region: rx, local }, { region: ry, local: 12.5 }, 0.75))
          throw Error("Regional sample rejected");
      core.commit();
      const raw = () =>
        Array.from({ length: core.raw_length(id) }, (_, i) => [
          String(core.raw_region(id, i, 0)),
          core.raw_local(id, i, 0),
          String(core.raw_region(id, i, 1)),
          core.raw_local(id, i, 1),
          core.raw_point(id, i, 2),
        ]);
      const original = JSON.stringify(raw());
      const placement = () =>
        [0, 1].map((axis) => ({
          region: core.stroke_placement_region(id, axis),
          local: core.stroke_placement_local(id, axis),
        }));
      const relative = () =>
        placement().map((p, axis) => Number(p.region - [rx, ry][axis]) * 65536 + p.local);
      for (const [scale, angle] of variants) {
        core.move_begin();
        core.move_add(id);
        const revision = core.transform_revision();
        if (
          lab.regional.transform(
            { region: 1n << 63n, local: 0 },
            { region: ry, local: 0 },
            scale,
            angle,
          )
        )
          throw Error("Out-of-range pivot crossed checked boundary");
        if (core.transform_revision() !== revision) throw Error("Rejected pivot mutated revision");
        const pivotX = 12.125,
          pivotY = 14.25,
          dx = 0.125,
          dy = -0.25;
        const update = () =>
          lab.regional.transform(
            { region: rx, local: pivotX },
            { region: ry, local: pivotY },
            scale,
            angle,
            dx,
            dy,
          );
        if (!update()) throw Error("Valid regional transform rejected");
        const a = scale * Math.cos(angle),
          b = scale * Math.sin(angle);
        const expected = [
          pivotX - a * pivotX + b * pivotY + dx,
          pivotY - b * pivotX - a * pivotY + dy,
        ];
        const actual = relative();
        for (const shift of [-1n, 0n, 1n]) {
          const projection = lab.regional.projection(id, rx + shift, ry - shift);
          if (!projection || !Object.isFrozen(projection))
            throw Error("Projection transport not immutable");
          const wanted = [
            a,
            b,
            expected[0] - Number(shift) * 65536,
            expected[1] + Number(shift) * 65536,
          ];
          for (let k = 0; k < 4; k++)
            if (Math.abs(projection[k] - wanted[k]) > 1e-10)
              throw Error("Relative projection flattened regional origin");
        }
        for (const [badId, badRegion] of [
          [-1, rx],
          [core.count(), rx],
          [id, 1n << 63n],
        ])
          if (lab.regional.projection(badId, badRegion, ry) !== null)
            throw Error("Invalid projection transport accepted");
        for (let axis = 0; axis < 2; axis++)
          if (Math.abs(actual[axis] - expected[axis]) > 1e-10)
            throw Error(`Regional composition mismatch: ${actual} vs ${expected}`);
        const changed = JSON.stringify(placement(), (_, value) =>
          typeof value === "bigint" ? String(value) : value,
        );
        if (
          !update() ||
          JSON.stringify(placement(), (_, value) =>
            typeof value === "bigint" ? String(value) : value,
          ) !== changed
        )
          throw Error("Repeated preview compounded instead of using gesture snapshot");
        core.move_commit();
        core.undo();
        if (relative().some((value) => value !== 0))
          throw Error("Transform Undo changed placement");
        core.redo();
        if (
          JSON.stringify(placement(), (_, value) =>
            typeof value === "bigint" ? String(value) : value,
          ) !== changed
        )
          throw Error("Transform Redo changed placement");
        if (JSON.stringify(raw()) !== original) throw Error("Transform rewrote canonical data");
        core.undo();
        rows.push({ region: [String(rx), String(ry)], scale, angle, actual, expected });
      }
      core.move_begin();
      core.move_add(id);
      if (!lab.regional.transform({ region: rx, local: 12 }, { region: ry, local: 14 }, 2, 0.2))
        throw Error("Cancel fixture rejected");
      core.move_cancel();
      if (relative().some((value) => value !== 0)) throw Error("Cancel retained transform");
    }
    return {
      rows,
      limitation: "Actual application/Wasm boundary; not full-range visual projection acceptance.",
    };
  });
  if (errors.length) throw Error(errors.join("; "));
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ browser: browser.version(), ...result }, null, 2),
  );
  console.log(`PASS ${result.rows.length} regional scale/rotation/history cases in application`);
} finally {
  await browser.close();
}
