import type { Core } from "./core";

/** Transport value only: normalization and coordinate arithmetic belong to Rust. */
export type RegionalAddress = Readonly<{ region: bigint; local: number }>;
const MIN_REGION = -(1n << 63n);
const MAX_REGION = (1n << 63n) - 1n;
function validTransport(region: bigint, local: number): boolean {
  // Wasm accepts BigInt but wraps values outside i64; reject before crossing.
  return (
    typeof region === "bigint" &&
    region >= MIN_REGION &&
    region <= MAX_REGION &&
    Number.isFinite(local)
  );
}

export function createRegionalAddressAdapter(core: Core) {
  function copyResult(ok: number): RegionalAddress | null {
    if (!ok) return null;
    return Object.freeze({
      region: core.regional_result_region(),
      local: core.regional_result_local(),
    });
  }
  return {
    transform(
      x: RegionalAddress,
      y: RegionalAddress,
      scale: number,
      angle: number,
      dx = 0,
      dy = 0,
    ): boolean {
      if (
        !validTransport(x.region, x.local) ||
        !validTransport(y.region, y.local) ||
        ![scale, angle, dx, dy].every(Number.isFinite)
      )
        return false;
      return !!core.transform_update_regional(
        x.region,
        x.local,
        y.region,
        y.local,
        scale,
        angle,
        dx,
        dy,
      );
    },
    append(x: RegionalAddress, y: RegionalAddress, pressure: number): boolean {
      if (
        !validTransport(x.region, x.local) ||
        !validTransport(y.region, y.local) ||
        !Number.isFinite(pressure)
      )
        return false;
      return !!core.push_regional(x.region, x.local, y.region, y.local, pressure);
    },
    normalize(region: bigint, local: number): RegionalAddress | null {
      if (!validTransport(region, local)) return null;
      return copyResult(core.regional_normalize(region, local));
    },
    offset(address: RegionalAddress, delta: number): RegionalAddress | null {
      if (!validTransport(address.region, address.local) || !Number.isFinite(delta)) return null;
      return copyResult(core.regional_offset(address.region, address.local, delta));
    },
  };
}
