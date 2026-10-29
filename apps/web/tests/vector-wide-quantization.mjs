import { readFile, writeFile } from "node:fs/promises";
// Supplemental numerical qualification. The strict image fixture remains strict;
// this report must never be described as exact image parity.
const directory = process.env.LINEFIELD_EVIDENCE_DIR;
if (!directory) throw Error("Set LINEFIELD_EVIDENCE_DIR to captured wide-curve browser evidence");
const rows = [];
for (const extent of [1048576, 4294967296]) {
  for (const brush of [0, 1, 2]) {
    for (const stage of ["before", "sliced", "0.08", "-0.08"]) {
      const load = async (compact) =>
        JSON.parse(
          await readFile(`${directory}/${extent}-${brush}-${compact}-${stage}.json`, "utf8"),
        );
      const a = await load(true),
        b = await load(false);
      const size = stage === "before" || stage === "sliced" ? 132000 : 80000;
      if (a.pixels.length !== size * 4 || b.pixels.length !== size * 4)
        throw Error("Unexpected capture dimensions");
      let changed = 0,
        maximum = 0,
        alphaChanges = 0;
      for (let i = 0; i < a.pixels.length; i += 4) {
        let difference = false;
        for (let channel = 0; channel < 4; channel++) {
          const delta = Math.abs(a.pixels[i + channel] - b.pixels[i + channel]);
          if (channel === 3 && delta) alphaChanges++;
          if (delta) difference = true;
          maximum = Math.max(maximum, delta);
        }
        if (difference) changed++;
      }
      const geometryRequired = stage === "0.08" || stage === "-0.08";
      if (geometryRequired && (!a.geometry || !b.geometry))
        throw Error("Missing rotation geometry capture");
      let geometryDelta = a.geometry && b.geometry ? 0 : null;
      if (a.geometry || b.geometry) {
        if (!a.geometry || !b.geometry || a.geometry.level !== b.geometry.level)
          throw Error("Geometry capture mismatch");
        // Chunk zero intentionally contains a different first endpoint. Only the
        // three genuinely common chunks qualify for a geometric comparison.
        for (let i = 1; i < 4; i++) {
          const left = a.geometry.chunks[i],
            right = b.geometry.chunks[i];
          if (
            !left ||
            !right ||
            left.count !== right.count ||
            left.projected.length !== right.projected.length
          )
            throw Error("Common tessellation changed");
          for (let k = 0; k < left.projected.length; k++) {
            const delta = Math.abs(left.projected[k] - right.projected[k]);
            if (!Number.isFinite(delta)) throw Error("Nonfinite geometry");
            geometryDelta = Math.max(geometryDelta ?? 0, delta);
          }
        }
      }
      const limit = extent === 1048576 ? 0 : 1;
      const passed =
        changed <= limit &&
        maximum <= limit &&
        alphaChanges === 0 &&
        (geometryDelta === null ? !geometryRequired : geometryDelta <= (limit ? 1 / 65536 : 0));
      rows.push({
        extent,
        brush,
        stage,
        pixels: size,
        changed,
        maximum,
        alphaChanges,
        geometryDelta,
        geometryEvaluated: geometryDelta !== null,
        passed,
      });
    }
  }
}
await writeFile(
  `${directory}/quantization-envelope.json`,
  JSON.stringify(
    {
      profile: "wide-source-quantization-v1",
      exactParity: rows.every((r) => r.changed === 0),
      limits:
        "2^20 exact; 2^32 at most one pixel/one RGB level, alpha exact; captured rotation common projected geometry <=1/65536 unit; before/sliced geometry not evaluated",
      rows,
    },
    null,
    2,
  ),
);
if (rows.some((r) => !r.passed)) throw Error("Wide-source quantization envelope exceeded");
console.log(
  "PASS bounded wide-source quantization profile; this is NOT exact compact/wide image parity",
);
