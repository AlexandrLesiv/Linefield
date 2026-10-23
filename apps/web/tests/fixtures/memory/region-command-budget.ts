import { regionFixture } from "./region-fixture.ts";
import { canonicalRegion, regionImage } from "./region-oracle.ts";
export async function regionCommandBudget(
  canvas: HTMLCanvasElement,
  check: (value: boolean, label: string) => void,
) {
  const f = await regionFixture(canvas, { edge: true, strokes: 96, translucent: true }),
    gl = f.renderer.gl,
    draw = gl.drawArrays.bind(gl),
    geometry = gl.drawArraysInstanced.bind(gl),
    group = f.renderer.group.bind(f.renderer),
    submit = f.renderer.check.bind(f.renderer),
    clock = performance.now.bind(performance);
  const batches: { groups: number; copy: number; geometry: number; composite: number }[] = [];
  let current = { groups: 0, copy: 0, geometry: 0, composite: 0 };
  gl.drawArrays = (...args) => {
    if (args[2] === 3) current.copy++;
    else if (args[2] === 6) current.composite++;
    else throw Error("unexpected actual draw topology");
    draw(...args);
  };
  gl.drawArraysInstanced = (...args) => {
    current.geometry++;
    geometry(...args);
  };
  f.renderer.group = () => {
    current.groups++;
    group();
  };
  f.renderer.check = () => {
    const serial = submit();
    batches.push(current);
    current = { groups: 0, copy: 0, geometry: 0, composite: 0 };
    return serial;
  };
  try {
    const fixed = clock();
    // Expose the independent command cap; this is controlled correctness, not timing.
    Object.defineProperty(performance, "now", { configurable: true, value: () => fixed });
    f.pan(24);
    f.start();
    await f.idle();
    Object.defineProperty(performance, "now", { configurable: true, value: clock });
    const counts = batches.map((b) => b.groups + b.copy + b.geometry + b.composite);
    check(
      batches.length > 1 && counts[0] === 256 && batches[0]?.copy === 1,
      `first actual command batch includes copy within256: ${JSON.stringify(batches)}`,
    );
    check(
      counts.every((count) => count <= 256),
      "all actual charged batches respect256",
    );
    check(
      batches.every((b) => b.groups > 0 && b.geometry > 0 && b.composite > 0),
      "cap positive scene has actual group geometry and composite work in each batch",
    );
    gl.drawArrays = draw;
    gl.drawArraysInstanced = geometry;
    f.renderer.group = group;
    f.renderer.check = submit;
    const pixels = f.pixels();
    check(
      regionImage(pixels, f.renderer.width, f.renderer.height, [24, 0]).exposedInk > 0,
      "cap scene draws positive dirty-strip ink",
    );
    const canonical = await canonicalRegion(f, pixels, check);
    return {
      batches,
      canonical,
      evidence: "actual GL and group calls per submission; fixed clock correctness only",
    };
  } finally {
    Object.defineProperty(performance, "now", { configurable: true, value: clock });
    gl.drawArrays = draw;
    gl.drawArraysInstanced = geometry;
    f.renderer.group = group;
    f.renderer.check = submit;
    await f.close();
  }
}
