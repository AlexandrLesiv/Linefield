import { coefficients, addR } from "./rotation-corpus.ts";
import { bits, numberFromBits } from "./oracle.ts";
import { rational, fromNumber, subtractR, multiplyR, divideR } from "../regional/rational.ts";
import type { Rational } from "../regional/rational.ts";

const compare = (a: Rational, b: Rational): bigint => a.n * b.d - b.n * a.d;
const approximate = (r: Rational): number => Number(r.n) / Number(r.d);
function rootInterval(n: bigint): readonly [Rational, Rational] {
  const scaled = n << 512n;
  let low = 0n;
  let high = 4n << 256n;
  while (low + 1n < high) {
    const middle = (low + high) / 2n;
    if (middle * middle <= scaled) low = middle;
    else high = middle;
  }
  return [rational(low, 1n << 256n), rational(high, 1n << 256n)];
}
function certifyCoefficients(): number {
  const [l2, h2] = rootInterval(2n);
  const [l3, h3] = rootInterval(3n);
  const [l6, h6] = rootInterval(6n);
  const cases: readonly (readonly [number, Rational, Rational])[] = [
    [
      0.25881904510252074,
      divideR(subtractR(l6, h2), rational(4n)),
      divideR(subtractR(h6, l2), rational(4n)),
    ],
    [0.7071067811865476, divideR(l2, rational(2n)), divideR(h2, rational(2n))],
    [0.8660254037844386, divideR(l3, rational(2n)), divideR(h3, rational(2n))],
    [0.9659258262890683, divideR(addR(l6, l2), rational(4n)), divideR(addR(h6, h2), rational(4n))],
  ];
  for (const [value, low, high] of cases) {
    const lowerMid = divideR(
      addR(fromNumber(numberFromBits(bits(value) - 1n)), fromNumber(value)),
      rational(2n),
    );
    const upperMid = divideR(
      addR(fromNumber(numberFromBits(bits(value) + 1n)), fromNumber(value)),
      rational(2n),
    );
    if (compare(low, lowerMid) <= 0n || compare(high, upperMid) >= 0n)
      throw Error("coefficient-not-nearest");
  }
  return cases.length;
}

export function geometryObservations(): object {
  const certifiedConstants = certifyCoefficients();
  let maximumProjectionError = 0;
  let maximumNarrowingError = 0;
  let maximumCoordinate = 0;
  let maximumNormError = 0;
  let rows = 0;
  const observations: object[] = [];
  // Conservative complete-control envelope: stroke axis span, inverse-view half and radius.
  const span = 231705;
  for (const [step, { c, s }] of coefficients.entries()) {
    const norm = addR(
      multiplyR(fromNumber(c), fromNumber(c)),
      multiplyR(fromNumber(s), fromNumber(s)),
    );
    maximumNormError = Math.max(
      maximumNormError,
      Math.abs(approximate(subtractR(norm, rational(1n)))),
    );
    for (const zoom of [0.1, 1, 8])
      for (const extent of [1, 8192]) {
        const bound = span + (1.415 * (extent / 2 + 2)) / zoom + 2 * 256.000000000004;
        for (const x of [-bound, 0, bound])
          for (const y of [-bound, 0, bound]) {
            const exactX = addR(
              multiplyR(
                subtractR(
                  multiplyR(fromNumber(c), fromNumber(x)),
                  multiplyR(fromNumber(s), fromNumber(y)),
                ),
                fromNumber(zoom),
              ),
              fromNumber(extent / 2),
            );
            const exactY = addR(
              multiplyR(
                addR(
                  multiplyR(fromNumber(s), fromNumber(x)),
                  multiplyR(fromNumber(c), fromNumber(y)),
                ),
                fromNumber(zoom),
              ),
              fromNumber(extent / 2),
            );
            const px = (c * x - s * y) * zoom + extent / 2;
            const py = (s * x + c * y) * zoom + extent / 2;
            const error = Math.hypot(
              approximate(subtractR(fromNumber(px), exactX)),
              approximate(subtractR(fromNumber(py), exactY)),
            );
            const narrowing = Math.hypot(Math.fround(px) - px, Math.fround(py) - py);
            const magnitude = Math.max(Math.abs(px), Math.abs(py));
            if (magnitude >= 2 ** 22 || error + narrowing > 0.25) throw Error("geometry-envelope");
            maximumProjectionError = Math.max(maximumProjectionError, error);
            maximumNarrowingError = Math.max(maximumNarrowingError, narrowing);
            maximumCoordinate = Math.max(maximumCoordinate, magnitude);
            rows += 1;
            observations.push({ step, zoom, extent, x, y, error, narrowing, magnitude });
          }
      }
  }
  return {
    kind: "synthetic bounded projection only; not culling, hull or raster E2E",
    certifiedConstants,
    rows,
    maximumProjectionError,
    maximumNarrowingError,
    maximumCoordinate,
    maximumNormError,
    observations,
  };
}
