import { renderer } from "./offscreen-render.mjs";
let render;
self.onmessage = async ({ data }) => {
  try {
    if (data.canvas) {
      render = renderer(data.canvas, data.records);
      await render.complete();
      self.postMessage({ id: data.id, ready: true, bytes: render.bytes() });
      return;
    }
    const start = performance.now();
    render.draw(data.frame);
    const submission = performance.now() - start;
    await render.complete();
    const completion = performance.now() - start;
    const pixels = data.read ? render.pixels() : undefined;
    self.postMessage(
      { id: data.id, submission, completion, pixels, bytes: render.bytes() },
      pixels ? [pixels.buffer] : [],
    );
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error) });
  }
};
