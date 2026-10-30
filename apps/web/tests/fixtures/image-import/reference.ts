import type { Item, View } from "./types";
export function reference(items: Item[], view: View, asset: (id: number) => ImageBitmap) {
  const canvas = new OffscreenCanvas(view.width, view.height),
    ctx = canvas.getContext("2d")!;
  if (view.background !== "transparent") {
    ctx.fillStyle = view.background;
    ctx.fillRect(0, 0, view.width, view.height);
  }
  for (const item of items) {
    ctx.save();
    ctx.globalAlpha = item.opacity;
    if (item.kind === "image") {
      ctx.setTransform(...item.transform);
      ctx.drawImage(asset(item.id), 0, 0);
    } else {
      ctx.strokeStyle = `rgb(${item.color.map((v) => Math.round(v * 255)).join(",")})`;
      ctx.lineWidth = item.radius * 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(...item.from);
      ctx.lineTo(...item.to);
      ctx.stroke();
    }
    ctx.restore();
  }
  const referencePixels = ctx.getImageData(0, 0, view.width, view.height).data;
  if (view.background === "transparent")
    for (let i = 0; i < referencePixels.length; i += 4)
      for (let c = 0; c < 3; c++)
        referencePixels[i + c] = Math.round(
          (referencePixels[i + c]! * referencePixels[i + 3]!) / 255,
        );
  return referencePixels;
}
