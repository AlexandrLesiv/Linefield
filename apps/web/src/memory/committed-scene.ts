import type { Paint, Path } from "canvaskit-wasm";
import type { Presentation } from "./presentation.ts";
export const nextTurn = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
export function drawCommitted(display: Presentation, path: Path, paint: Paint, backing: number) {
  const target = display.owner.staging?.getCanvas();
  if (!target) throw Error("display-unavailable");
  target.save();
  target.scale(backing, backing);
  try {
    target.drawPath(path, paint);
  } finally {
    target.restore();
  }
}
