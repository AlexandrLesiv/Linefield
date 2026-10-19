import { bridge } from "../../src/memory/bridge.ts";
import type { CanvasKit } from "canvaskit-wasm";
import { Presentation, publishFrame } from "../../src/memory/presentation.ts";
import { stagingSurface } from "../../src/memory/surface.ts";
import { pixelDigest } from "./geometry.ts";
export async function resourceLifetimes(kit: CanvasKit, canvas: HTMLCanvasElement) {
  const created = bridge.create();
  let state = bridge.enter(created.owner);
  state = bridge.metrics(state, 1n, 4096, 2048, 1);
  let failAllocation = false;
  let failEveryPublication = false;
  let failPublication = false;
  const display = new Presentation(
    kit,
    canvas,
    4096,
    2048,
    (runtime, context, width, height) => {
      if (failAllocation) {
        failAllocation = false;
        return null;
      }
      return stagingSurface(runtime, context, width, height);
    },
    (runtime, surface, image) => {
      if (failEveryPublication) {
        surface.getCanvas().clear(runtime.RED);
        throw Error("fixture-restoration-unavailable");
      }
      if (failPublication) {
        failPublication = false;
        surface.getCanvas().clear(runtime.RED);
        throw Error("fixture-publication");
      }
      publishFrame(runtime, surface, image);
    },
  );
  const resources = display.owner.resources;
  const builder = new kit.PathBuilder();
  resources.add("builder");
  const paint = new kit.Paint();
  resources.add("paint");
  paint.setColor(kit.BLACK);
  const paths = [];
  try {
    builder.addCircle(40, 40, 20);
    const first = builder.snapshot();
    resources.add("path");
    paths.push(first);
    const original = first.toCmds().slice();
    builder.addCircle(80, 40, 20);
    const second = builder.snapshot();
    resources.add("path");
    paths.push(second);
    const third = builder.detach();
    resources.add("path");
    paths.push(third);
    if (first.toCmds().join() !== original.join() || builder.countPoints() !== 0)
      throw Error("snapshot lifetime");
    display.render((target) => target.drawPath(first, paint));
    bridge.presented(state);
    const frontPixels = display.frontPixels();
    const before = await pixelDigest(display.pixels());
    const frontBefore = await pixelDigest(frontPixels);
    if (frontBefore !== before) throw Error("front differs from committed snapshot");
    const overTarget = display.stats();
    state = bridge.suspend(state, 2n);
    failAllocation = true;
    let allocationFailed = false;
    try {
      display.replaceStaging();
    } catch {
      allocationFailed = true;
    }
    if (!allocationFailed || (await pixelDigest(display.pixels())) !== before)
      throw Error("allocation preservation");
    display.replaceStaging();
    state = bridge.metrics(state, 3n, 4096, 2048, 1);
    failPublication = true;
    let publicationFailed = false;
    try {
      display.render((target) => target.drawPath(second, paint));
    } catch {
      publicationFailed = true;
    }
    const frontRestored = await pixelDigest(display.frontPixels());
    if (frontRestored !== frontBefore) throw Error("front restoration mismatch");
    if (
      !publicationFailed ||
      !display.lastFrameRestored ||
      (await pixelDigest(display.pixels())) !== before
    )
      throw Error("publication restoration");
    display.render((target) => target.drawPath(third, paint));
    const after = await pixelDigest(display.pixels());
    if (after === before) throw Error("snapshot copy-on-write");
    failEveryPublication = true;
    try {
      display.render();
    } catch {
      /* Both publication and restoration are unavailable. */
    }
    if (display.lastFrameRestored) throw Error("false restoration claim");
    state = bridge.suspend(state, 4n);
    const preserved = bridge.read(created.owner);
    if (
      preserved.owner !== created.owner ||
      preserved.canBeginInk ||
      preserved.phase !== "suspended"
    )
      throw Error("owner preservation");
    return {
      ownerPreserved: true,
      restorationUnavailable: true,
      frontBefore,
      frontRestored,
      allocationFailed,
      publicationFailed,
      frameRestored: true,
      overTarget,
      before,
      after,
      snapshots: {
        originalPoints: first.countPoints(),
        laterPoints: second.countPoints(),
        detachedPoints: third.countPoints(),
      },
    };
  } finally {
    for (const path of paths) resources.release("path", path);
    resources.release("builder", builder);
    resources.release("paint", paint);
    display.dispose();
    bridge.dispose(created.owner);
  }
}
