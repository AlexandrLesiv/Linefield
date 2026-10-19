import type { PathPage } from "../../../src/memory/path-page.ts";

// Experiment only: conservative positive-weight conic control hulls, after Rust projection.
// This is not the proposed shared culler and does not avoid any Rust query/copy cost.
export function cullCompleteContours(page: PathPage, width: number, height: number): PathPage {
  const verbs: number[] = [];
  const points: number[] = [];
  const weights: number[] = [];
  let point = 0;
  let weight = 0;
  let firstVerb = 0;
  let firstPoint = 0;
  let firstWeight = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < page.verbs.length; index++) {
    const verb = page.verbs[index];
    if (verb === 0) {
      firstVerb = index;
      firstPoint = point;
      firstWeight = weight;
      minX = minY = Infinity;
      maxX = maxY = -Infinity;
    }
    const count = verb === 2 ? 4 : verb === 0 || verb === 1 ? 2 : 0;
    for (let end = point + count; point < end; point += 2) {
      minX = Math.min(minX, page.points[point]!);
      maxX = Math.max(maxX, page.points[point]!);
      minY = Math.min(minY, page.points[point + 1]!);
      maxY = Math.max(maxY, page.points[point + 1]!);
    }
    if (verb === 2) {
      if (!(page.weights[weight]! > 0)) throw Error("unsupported-conic");
      weight++;
    }
    if (verb === 3 && maxX >= -2 && maxY >= -2 && minX <= width + 2 && minY <= height + 2) {
      verbs.push(...page.verbs.slice(firstVerb, index + 1));
      points.push(...page.points.slice(firstPoint, point));
      weights.push(...page.weights.slice(firstWeight, weight));
    }
  }
  return {
    ...page,
    verbs: Uint8Array.from(verbs),
    points: Float32Array.from(points),
    weights: Float32Array.from(weights),
  };
}
