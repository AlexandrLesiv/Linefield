import {
  fromNumber,
  subtractR,
  multiplyR,
  divideR,
  withinQuarterR,
  serializeR,
} from "./rational.ts";
export const inverseFixtures = [
  { id: "zero", point: 0, center: 0 },
  { id: "one", point: 1, center: 0 },
  { id: "fractional", point: 100.25, center: 100 },
  { id: "negative", point: -1, center: 0 },
  { id: "large-subtraction", point: 2 ** 52, center: -0.25 },
  { id: "subnormal", point: Number.MIN_VALUE, center: 0 },
  { id: "nonphysical-overflow-stress", point: Number.MAX_VALUE, center: 0 },
] as const;
export function inverseMeasure(point: number, center: number, zoom: number) {
  if (![point, center, zoom].every(Number.isFinite) || zoom <= 0)
    throw Error("invalid-mapping-input");
  const exact = divideR(subtractR(fromNumber(point), fromNumber(center)), fromNumber(zoom));
  const candidate = (point - center) / zoom;
  if (!Number.isFinite(candidate))
    return { outcome: "nonfinite-candidate" as const, exact: serializeR(exact) };
  const error = subtractR(fromNumber(candidate), exact);
  const projected = multiplyR(error, fromNumber(zoom));
  const roundTrip = candidate * zoom + center - point;
  return {
    outcome: "finite" as const,
    candidate,
    negativeZero: Object.is(candidate, -0),
    exact: serializeR(exact),
    inverseError: serializeR(error),
    projectedError: serializeR(projected),
    diagnosticWithinQuarterPoint: withinQuarterR(projected),
    numberRoundTrip: Number.isFinite(roundTrip)
      ? { outcome: "finite" as const, error: roundTrip }
      : { outcome: "nonfinite" as const },
  };
}
export function inverseMatrix() {
  return inverseFixtures.flatMap(({ id, point, center }) =>
    [0.1, 1, 8].map((zoom) => ({
      id,
      point,
      center,
      zoom,
      ...inverseMeasure(point, center, zoom),
    })),
  );
}
