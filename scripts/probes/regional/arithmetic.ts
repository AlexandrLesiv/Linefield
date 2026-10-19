import { add, decode, integer, multiply, subtract, withinQuarter, approximate } from "./dyadic.ts";
import type { Dyadic } from "./dyadic.ts";
export interface Position {
  region: bigint;
  local: number;
}
export interface Fixture {
  id: string;
  source: Position;
  sample: Position;
  placement: Position;
  view: Position;
}
export type Method = "relative-before-narrowing" | "absolute-number-negative-control";
export function exactDelta(a: Position, b: Position): Dyadic {
  return add(integer((a.region - b.region) * 65536n), subtract(decode(a.local), decode(b.local)));
}
export function exactPoint(f: Fixture, scale: number, zoom: number): Dyadic {
  return multiply(
    add(exactDelta(f.placement, f.view), multiply(decode(scale), exactDelta(f.sample, f.source))),
    decode(zoom),
  );
}
export function candidatePoint(f: Fixture, scale: number, zoom: number, method: Method): number {
  const delta = (a: Position, b: Position) =>
    method === "relative-before-narrowing"
      ? Number(a.region - b.region) * 65536 + (a.local - b.local)
      : Number(a.region) * 65536 + a.local - (Number(b.region) * 65536 + b.local);
  const placement = delta(f.placement, f.view);
  const original = delta(f.sample, f.source);
  return (placement + scale * original) * zoom;
}
export function measure(f: Fixture, scale: number, zoom: number, method: Method) {
  const value = candidatePoint(f, scale, zoom, method);
  if (!Number.isFinite(value)) return { outcome: "nonfinite-candidate" as const };
  const error = subtract(decode(value), exactPoint(f, scale, zoom));
  return {
    outcome: "finite" as const,
    withinQuarterPoint: withinQuarter(error),
    approximateError: approximate(error),
    exactError: { numerator: error.n.toString(), binaryExponent: error.e },
  };
}
