import { frames } from "../../../src/memory/frame-bridge.ts";
import { buildFrame } from "../../../src/memory/frame-builder.ts";
import type { regionFixture } from "./region-fixture.ts";
type Fixture = Awaited<ReturnType<typeof regionFixture>>;
type Check = (value: boolean, label: string) => void;
export function regionImage(
  pixels: Uint8Array,
  width: number,
  height: number,
  shift: readonly [number, number] = [0, 0],
) {
  let ink = 0,
    paper = 0,
    exposedInk = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = ((height - 1 - y) * width + x) * 4;
      const color = [pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0];
      const painted = color.some((value) => value < 240);
      ink += Number(painted);
      paper += Number(color.every((value) => value === 255));
      const exposed =
        x < shift[0] || x >= width + shift[0] || y < shift[1] || y >= height + shift[1];
      exposedInk += Number(painted && exposed);
    }
  return { ink, paper, exposedInk };
}
export function exactRegion(actual: Uint8Array, expected: Uint8Array, check: Check) {
  check(actual.length === expected.length, "reference dimensions match");
  let different = 0;
  for (let i = 0; i < actual.length; i++) if (i % 4 !== 3 && actual[i] !== expected[i]) different++;
  check(different === 0, `exact reference RGB: ${different} changed channels`);
  return different;
}
export async function canonicalRegion(f: Fixture, actual: Uint8Array, check: Check) {
  const full = frames.canonical(f.state());
  check(full.code === "ok", "canonical reference captured");
  try {
    check(
      await buildFrame(
        f.state,
        f.cache,
        f.renderer,
        full,
        f.detail,
        () => true,
        new AbortController().signal,
        undefined,
        undefined,
        true,
      ),
      "canonical reference rendered",
    );
    const rebuilt = f.pixels();
    const image = regionImage(rebuilt, f.renderer.width, f.renderer.height);
    check(image.ink > 0 && image.paper > 0, "canonical reference has positive ink and paper");
    return { ...image, different: exactRegion(actual, rebuilt, check) };
  } finally {
    frames.release(f.state(), full.id);
  }
}
