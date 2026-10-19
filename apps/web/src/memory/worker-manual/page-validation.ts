import type { Request } from "./wire.ts";
export function validatePage(page: Extract<Request, { kind: "page" }>) {
  if (
    !(page.verbs instanceof Uint8Array) ||
    !(page.points instanceof Float32Array) ||
    !(page.weights instanceof Float32Array) ||
    page.verbs.length === 0 ||
    page.verbs.length > 4096 ||
    page.verbs.byteLength + page.points.byteLength + page.weights.byteLength > 256 * 1024 ||
    !Array.isArray(page.color) ||
    page.color.length !== 3 ||
    typeof page.done !== "boolean" ||
    page.color.some((v) => !Number.isFinite(v) || v < 0 || v > 1)
  )
    throw Error("page");
  let points = 0,
    weights = 0,
    open = false;
  for (const verb of page.verbs) {
    if (verb === 0 && !open) {
      open = true;
      points += 2;
    } else if (verb === 1 && open) points += 2;
    else if (verb === 2 && open) {
      points += 4;
      weights++;
    } else if (verb === 3 && open) open = false;
    else throw Error("page-contour");
  }
  if (
    open ||
    points !== page.points.length ||
    weights !== page.weights.length ||
    page.points.some((v) => !Number.isFinite(v) || Math.abs(v) >= 2 ** 22) ||
    page.weights.some((v) => !Number.isFinite(v) || v <= 0)
  )
    throw Error("page-coordinates");
}
