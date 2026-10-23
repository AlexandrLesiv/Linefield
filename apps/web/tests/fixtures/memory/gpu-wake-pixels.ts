export type WakePixels = { visible: Uint8Array; retained: Uint8Array };
async function describe(data: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  let inkPixels = 0,
    paperPixels = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    const red = data[offset] ?? 0,
      green = data[offset + 1] ?? 0,
      blue = data[offset + 2] ?? 0;
    if (red < 240 || green < 240 || blue < 240) inkPixels++;
    if (red === 255 && green === 255 && blue === 255) paperPixels++;
  }
  return {
    bytes: data.length,
    sha256: [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join(""),
    inkPixels,
    paperPixels,
  };
}
export async function wakePixelsPresent(pixels: WakePixels) {
  const results = await Promise.all(
    (["visible", "retained"] as const).map(async (target) => ({
      target,
      ...(await describe(pixels[target])),
    })),
  );
  if (results.some((result) => !result.inkPixels || !result.paperPixels))
    throw Error(`actual prepared source must contain ink and paper: ${JSON.stringify(results)}`);
  return results;
}
export async function compareWakePixels(baseline: WakePixels, final: WakePixels) {
  const results = await Promise.all(
    (["visible", "retained"] as const).map(async (target) => {
      const before = baseline[target],
        after = final[target];
      let mismatchedBytes = 0;
      const samples: { offset: number; before: number | null; after: number | null }[] = [];
      for (let offset = 0; offset < Math.max(before.length, after.length); offset++) {
        if (before[offset] === after[offset]) continue;
        mismatchedBytes++;
        if (samples.length < 12)
          samples.push({ offset, before: before[offset] ?? null, after: after[offset] ?? null });
      }
      const [reference, actual] = await Promise.all([describe(before), describe(after)]);
      return { target, reference, actual, mismatchedBytes, samples };
    }),
  );
  if (
    results.some(
      (result) =>
        result.mismatchedBytes !== 0 ||
        !result.reference.inkPixels ||
        !result.reference.paperPixels ||
        !result.actual.inkPixels ||
        !result.actual.paperPixels,
    )
  )
    throw Error(`actual prepared source pixel verification: ${JSON.stringify(results)}`);
  return results;
}
