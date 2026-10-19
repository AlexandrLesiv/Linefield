import type { Page } from "@playwright/test";
export async function inkBounds(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
) {
  const png = await page.screenshot({ clip });
  return page.evaluate(async (encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (v) => v.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let minX = bitmap.width,
      minY = bitmap.height,
      maxX = -1,
      maxY = -1;
    for (let y = 0; y < bitmap.height; y++)
      for (let x = 0; x < bitmap.width; x++) {
        const i = (y * bitmap.width + x) * 4;
        if (data[i]! < 200 && data[i + 1]! < 200 && data[i + 2]! < 200) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    bitmap.close();
    return { minX, minY, maxX, maxY };
  }, png.toString("base64"));
}
