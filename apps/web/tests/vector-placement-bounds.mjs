import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/placement-bounds";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.LINEFIELD_PREVIEW_URL);
  await page.getByRole("button", { name: "New drawing", exact: true }).click();
  await page.frameLocator("iframe").locator("#brush").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  const result = await frame.evaluate(() => {
    const c = lab.core,
      max = (1n << 63n) - 1n;
    const ids = [0n, max].map((region) => {
      const id = c.begin_fixed_width(8, 0, 1);
      if (!lab.regional.append({ region, local: 0.125 }, { region: 0n, local: 0.25 }, 0.75))
        throw Error("Setup rejected");
      c.commit();
      return id;
    });
    const read = () =>
      ids.map((id) => [
        String(c.stroke_placement_region(id, 0)),
        c.stroke_placement_local(id, 0),
        c.stroke_transform(id, 0),
        c.stroke_transform(id, 1),
        String(c.raw_region(id, 0, 0)),
        c.raw_local(id, 0, 0),
        c.raw_point(id, 0, 2),
      ]);
    const original = JSON.stringify(read());
    c.move_begin();
    ids.forEach((id) => c.move_add(id));
    const revision = c.transform_revision();
    for (const dx of [65536, Infinity, NaN, Number.MAX_VALUE]) {
      if (c.move_update(dx, 0)) throw Error("Invalid group translation accepted");
      if (c.transform_revision() !== revision || JSON.stringify(read()) !== original)
        throw Error("Rejected group partially mutated");
    }
    if (!c.move_update(-(2 ** 31), 0)) throw Error("Valid regional displacement rejected");
    const changed = read();
    if (
      changed.some(
        (row, i) =>
          JSON.stringify(row.slice(4)) !== JSON.stringify(JSON.parse(original)[i].slice(4)),
      )
    )
      throw Error("Valid move changed raw samples");
    if (changed[0][0] !== "-32768" || changed[1][0] !== String(max - 32768n))
      throw Error("Incorrect regional displacement");
    c.move_commit();
    c.undo();
    if (JSON.stringify(read()) !== original) throw Error("Undo failed");
    c.redo();
    if (JSON.stringify(read()) !== JSON.stringify(changed)) throw Error("Redo failed");
    c.undo();
    c.move_begin();
    ids.forEach((id) => c.move_add(id));
    if (!c.move_update(-(2 ** 31), 0)) throw Error("Cancel setup rejected");
    c.move_cancel();
    if (JSON.stringify(read()) !== original) throw Error("Cancel failed");
    return { rejected: 4, displacement: -(2 ** 31), changed, rawAndHistoryPreserved: true };
  });
  if (errors.length) throw Error(errors.join("; "));
  await writeFile(`${output}/results.json`, JSON.stringify(result, null, 2));
  console.log(
    "PASS regional group overflow/nonfinite atomic rejection; large valid move, Undo/Redo and cancel",
  );
} finally {
  await browser.close();
}
