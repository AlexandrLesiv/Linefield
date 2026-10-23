import type { Page } from "@playwright/test";
// Controlled screenshot measurement, not geometry tolerance or a performance probe.
export async function compositionEdges(page: Page, actual: Buffer, reference: Buffer) {
  return page.evaluate(
    async ({ a, b }) => {
      async function pixels(encoded: string) {
        const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d");
        if (!context) throw Error("pixel context unavailable");
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        return context.getImageData(0, 0, canvas.width, canvas.height);
      }
      const left = await pixels(a),
        right = await pixels(b);
      if (left.width !== right.width || left.height !== right.height) throw Error("dimensions");
      const rows: { y: number; edges: number[] }[] = [];
      let maxChannel = 0,
        changed = 0,
        ink = 0;
      for (let i = 0; i < left.data.length; i += 4) {
        const delta = Math.abs((left.data[i] ?? 0) - (right.data[i] ?? 0));
        maxChannel = Math.max(maxChannel, delta);
        changed += Number(delta > 0);
        ink += Number((left.data[i] ?? 255) < 128);
      }
      function edges(image: ImageData, y: number) {
        const found: number[] = [];
        for (let x = 1; x < image.width; x++) {
          const p = image.data[(y * image.width + x - 1) * 4] ?? 255;
          const q = image.data[(y * image.width + x) * 4] ?? 255;
          if (p < 128 !== q < 128) found.push(x - 1 + (127.5 - p) / (q - p));
        }
        return found;
      }
      for (let y = 0; y < right.height; y++) {
        const expected = edges(right, y),
          observed = edges(left, y);
        if (expected.length === 2 && observed.length === 2)
          rows.push({ y, edges: expected.map((value, i) => Math.abs(value - (observed[i] ?? 0))) });
      }
      // Exclude the synthetic line's caps; retain all channel differences separately.
      const central = rows.slice(Math.floor(rows.length / 5), Math.ceil((rows.length * 4) / 5));
      return {
        maxChannel,
        changed,
        ink,
        measuredRows: central.length,
        maxHorizontalContourDelta: Math.max(0, ...central.flatMap((row) => row.edges)),
        rows: central,
      };
    },
    { a: actual.toString("base64"), b: reference.toString("base64") },
  );
}
