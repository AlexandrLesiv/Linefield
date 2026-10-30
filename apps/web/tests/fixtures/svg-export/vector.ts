import type { Group } from "./gpu";
/** Experimental SVG silhouette; independent consumers determine AA parity. */
export function silhouette(group: Group) {
  if (group.brush !== 0) throw Error("svg-vector-material");
  const view = new DataView(group.bytes);
  const coordinate = (offset: number) =>
    group.coordinates?.[Math.floor(offset / 32) * 6 + (offset % 32) / 4] ??
    view.getFloat32(offset, true);
  let d = "";
  const circle = (x: number, y: number, r: number) =>
    `M${x + r} ${y}a${r} ${r} 0 1 1 ${-2 * r} 0a${r} ${r} 0 1 1 ${2 * r} 0Z`;
  for (let p = 0; p < view.byteLength; p += 32) {
    const x = coordinate(p),
      y = coordinate(p + 4),
      r = coordinate(p + 8),
      u = coordinate(p + 12),
      v = coordinate(p + 16),
      s = coordinate(p + 20);
    if (r > 0) d += circle(x, y, r);
    if (s > 0) d += circle(u, v, s);
    const length = Math.hypot(u - x, v - y),
      q = (r - s) / length;
    if (length > 0 && Math.abs(q) < 1) {
      const a = (u - x) / length,
        b = (v - y) / length,
        t = Math.sqrt(1 - q * q),
        nx = a * q - b * t,
        ny = b * q + a * t,
        mx = a * q + b * t,
        my = b * q - a * t;
      d += `M${x + r * mx} ${y + r * my}L${u + s * mx} ${v + s * my}L${u + s * nx} ${v + s * ny}L${x + r * nx} ${y + r * ny}Z`;
    }
  }
  if (!view.byteLength) return "";
  const color = `rgb(${view.getUint8(24)} ${view.getUint8(25)} ${view.getUint8(26)})`;
  return `<path fill="${color}" fill-opacity="${view.getUint8(27) / 255}" fill-rule="nonzero" d="${d}"/>`;
}
