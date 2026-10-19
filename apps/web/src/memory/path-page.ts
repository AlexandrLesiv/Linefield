import type { CanvasKit, PathBuilder } from "canvaskit-wasm";
import type { penBridge } from "./pen-bridge.ts";
export type PathPage = ReturnType<typeof penBridge.page>;
export function appendPathPage(kit: CanvasKit, builder: PathBuilder, page: PathPage): void {
  if (page.code !== "ok" || page.verbs.length > 4096) throw Error("invalid-scene");
  let points = 0;
  let weights = 0;
  let contour = false;
  for (const verb of page.verbs) {
    if (verb === 0) {
      if (contour) throw Error("invalid-scene");
      contour = true;
      points += 2;
    } else if (verb === 1 && contour) points += 2;
    else if (verb === 2 && contour) {
      points += 4;
      weights++;
    } else if (verb === 3 && contour) contour = false;
    else throw Error("invalid-scene");
  }
  if (
    contour ||
    points !== page.points.length ||
    weights !== page.weights.length ||
    page.points.some((value) => !Number.isFinite(value) || Math.abs(value) >= 2 ** 21) ||
    page.weights.some((value) => !Number.isFinite(value) || value <= 0)
  )
    throw Error("invalid-scene");
  const kinds = [kit.MOVE_VERB, kit.LINE_VERB, kit.CONIC_VERB, kit.CLOSE_VERB];
  const verbs = Uint8Array.from(page.verbs, (verb) => kinds[verb]!);
  builder.addVerbsPointsWeights(verbs, page.points, page.weights);
}
