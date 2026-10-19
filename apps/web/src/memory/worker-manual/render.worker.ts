import CanvasKitInit from "canvaskit-wasm";
import type { Surface, GrDirectContext, PathBuilder } from "canvaskit-wasm";
import canvasWasm from "canvaskit-wasm/bin/canvaskit.wasm?url";
import { padding } from "./wire.ts";
import type { Request, Reply } from "./wire.ts";
import { validatePage } from "./page-validation.ts";
const ready = CanvasKitInit({ locateFile: () => canvasWasm });
let staging: Surface | null = null;
let front: Surface | null = null;
let context: GrDirectContext | null = null;
let output: OffscreenCanvas | undefined;
let builder: PathBuilder | undefined;
let job = 0;
let backing = 1;
let offset = { x: 0, y: 0 };
const send = (value: Reply, transfer: Transferable[] = []) => self.postMessage(value, { transfer });
async function run(message: Request) {
  const kit = await ready;
  if (!Number.isSafeInteger(message.id) || message.id <= 0) throw Error("id");
  if (message.kind === "init") {
    if (context || !Number.isFinite(message.backing) || message.backing < 1 || message.backing > 4)
      throw Error("init");
    offset = padding(message.width, message.height);
    backing = message.backing;
    const dimensions = padding(message.width, message.height);
    output = new OffscreenCanvas(dimensions.width, dimensions.height);
    output.addEventListener("webglcontextlost", () => send({ kind: "error", id: job }));
    const handle = kit.GetWebGLContext(output, { depth: 0, antialias: 0, stencil: 1 });
    context = kit.MakeWebGLContext(handle);
    if (!context) throw Error("context");
    front = kit.MakeOnScreenGLSurface(
      context,
      dimensions.width,
      dimensions.height,
      kit.ColorSpace.SRGB,
    );
    staging = kit.MakeRenderTarget(context, {
      width: dimensions.width,
      height: dimensions.height,
      colorType: kit.ColorType.RGBA_8888,
      alphaType: kit.AlphaType.Premul,
      colorSpace: kit.ColorSpace.SRGB,
    });
    if (!front || !staging) throw Error("surface");
    send({ kind: "ack", id: message.id });
    return;
  }
  if (!staging || !front || !output) throw Error("unavailable");
  if (message.kind === "start") {
    builder?.delete();
    builder = undefined;
    job = message.id;
    staging.getCanvas().clear(kit.WHITE);
    send({ kind: "ack", id: job });
    return;
  }
  if (message.id !== job) throw Error("stale");
  if (message.kind === "page") {
    validatePage(message);
    builder ??= new kit.PathBuilder();
    const kinds = [kit.MOVE_VERB, kit.LINE_VERB, kit.CONIC_VERB, kit.CLOSE_VERB];
    builder.addVerbsPointsWeights(
      Uint8Array.from(message.verbs, (v) => kinds[v]!),
      message.points,
      message.weights,
    );
    if (message.done) {
      const path = builder.snapshot();
      builder.delete();
      builder = undefined;
      const paint = new kit.Paint();
      paint.setAntiAlias(true);
      paint.setStyle(kit.PaintStyle.Fill);
      paint.setColor(kit.Color4f(message.color[0]!, message.color[1]!, message.color[2]!, 1));
      const canvas = staging.getCanvas();
      canvas.save();
      canvas.translate(offset.x, offset.y);
      canvas.scale(backing, backing);
      try {
        canvas.drawPath(path, paint);
      } finally {
        canvas.restore();
        paint.delete();
        path.delete();
      }
    }
    send({ kind: "ack", id: job });
    return;
  }
  if (builder) throw Error("incomplete");
  staging.flush();
  const image = staging.makeImageSnapshot();
  if (!image) throw Error("snapshot");
  try {
    front.getCanvas().clear(kit.WHITE);
    front.getCanvas().drawImage(image, 0, 0);
    front.flush();
  } finally {
    image.delete();
  }
  const bitmap = output.transferToImageBitmap();
  const heap: unknown = Reflect.get(kit, "HEAPU8");
  send(
    {
      kind: "frame",
      id: job,
      bitmap,
      width: output.width,
      height: output.height,
      heap: heap instanceof Uint8Array ? heap.buffer.byteLength : 0,
    },
    [bitmap],
  );
}
self.onmessage = (event: MessageEvent<Request>) => {
  void run(event.data).catch(() => send({ kind: "error", id: event.data.id }));
};
