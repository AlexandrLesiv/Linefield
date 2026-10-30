export const TEXT_FONT = '32px "LinefieldTextV1", sans-serif';
let ready: Promise<(code: number) => boolean> | undefined;
function coverage(bytes: ArrayBuffer) {
  const d = new DataView(bytes),
    tables = d.getUint16(4);
  let cmap = 0;
  for (let i = 0; i < tables; i++) {
    const p = 12 + i * 16;
    if (d.getUint32(p) === 0x636d6170) cmap = d.getUint32(p + 8);
  }
  if (!cmap) throw Error("text-font-metadata");
  let chosen = 0,
    format = 0;
  for (let i = 0; i < d.getUint16(cmap + 2); i++) {
    const p = cmap + 4 + i * 8,
      platform = d.getUint16(p),
      encoding = d.getUint16(p + 2);
    if (platform !== 0 && !(platform === 3 && (encoding === 1 || encoding === 10))) continue;
    const offset = cmap + d.getUint32(p + 4),
      next = d.getUint16(offset);
    if (next === 12 || (!chosen && next === 4)) {
      chosen = offset;
      format = next;
    }
  }
  if (format === 12) {
    const groups = d.getUint32(chosen + 12);
    return (code: number) => {
      let low = 0,
        high = groups;
      while (low < high) {
        const mid = (low + high) >>> 1,
          p = chosen + 16 + mid * 12,
          first = d.getUint32(p),
          last = d.getUint32(p + 4);
        if (code < first) high = mid;
        else if (code > last) low = mid + 1;
        else return d.getUint32(p + 8) + code - first !== 0;
      }
      return false;
    };
  }
  if (format !== 4) throw Error("text-font-metadata");
  const count = d.getUint16(chosen + 6) / 2,
    ends = chosen + 14,
    starts = ends + count * 2 + 2,
    deltas = starts + count * 2,
    offsets = deltas + count * 2;
  return (code: number) => {
    if (code > 65535) return false;
    for (let i = 0; i < count; i++) {
      const end = d.getUint16(ends + i * 2);
      if (code > end) continue;
      const start = d.getUint16(starts + i * 2);
      if (code < start) return false;
      const delta = d.getInt16(deltas + i * 2),
        at = offsets + i * 2,
        offset = d.getUint16(at);
      const glyph = offset ? d.getUint16(at + offset + (code - start) * 2) : code;
      return glyph !== 0 && ((glyph + delta) & 65535) !== 0;
    }
    return false;
  };
}
export function textFont() {
  return (ready ??= (async () => {
    const response = await fetch("/fonts/NotoSans-Regular-v1.ttf", {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error("text-font-unavailable");
    const bytes = await response.arrayBuffer(),
      covers = coverage(bytes);
    const face = new FontFace("LinefieldTextV1", bytes);
    await face.load();
    const fonts =
      typeof document === "undefined"
        ? (globalThis as unknown as { fonts: FontFaceSet }).fonts
        : document.fonts;
    fonts.add(face);
    return covers;
  })().catch((error) => {
    ready = undefined;
    throw error;
  }));
}
