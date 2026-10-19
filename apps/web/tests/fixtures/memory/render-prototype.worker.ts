import CanvasKitInit from "canvaskit-wasm";
import type { Surface, GrDirectContext, PathBuilder, Path } from "canvaskit-wasm";
import canvasWasm from "canvaskit-wasm/bin/canvaskit.wasm?url";
import type { WorkerRequest, WorkerReply } from "./worker-wire.ts";
import { padding } from "./worker-wire.ts";
const ready = CanvasKitInit({ locateFile: () => canvasWasm });
let staging: Surface | null = null;
let front: Surface | null = null;
let context: GrDirectContext | null = null;
let handle: number | null = null;
let output: OffscreenCanvas | undefined;
let builder: PathBuilder | undefined;
let paths: { path: Path; color: number[] }[] = [];
let active = 0;
let offset = { x: 0, y: 0 };
const send = (value: WorkerReply, transfer: Transferable[] = []) =>
  self.postMessage(value, { transfer });
async function run(message: WorkerRequest) {
  const kit = await ready;
  if (!Number.isSafeInteger(message.id) || message.id <= 0) throw Error("invalid-id");
  if (message.kind === "init" || message.kind === "dispose") {
    builder?.delete();
    builder = undefined;
    for (const { path } of paths) path.delete();
    paths = [];
    staging?.delete();
    front?.delete();
    context?.delete();
    staging = front = context = null;
    if (handle !== null) kit.deleteContext(handle);
    handle = null;
    if (message.kind === "dispose") {
      send({ kind: "ack", id: message.id });
      return;
    }
    const plan = message.margin
      ? padding(message.width, message.height)
      : {
          x: 0,
          y: 0,
          width: message.width,
          height: message.height,
        };
    if (plan.width * plan.height > 8_388_608) throw Error("surface-limit");
    offset = plan;
    output = new OffscreenCanvas(plan.width, plan.height);
    handle = kit.GetWebGLContext(output, { depth: 0, antialias: 0, stencil: 1 });
    context = kit.MakeWebGLContext(handle);
    if (!context) throw Error("worker-webgl-unavailable");
    front = kit.MakeOnScreenGLSurface(context, plan.width, plan.height, kit.ColorSpace.SRGB);
    staging = kit.MakeRenderTarget(context, {
      width: plan.width,
      height: plan.height,
      colorType: kit.ColorType.RGBA_8888,
      alphaType: kit.AlphaType.Premul,
      colorSpace: kit.ColorSpace.SRGB,
    });
    if (!front || !staging) throw Error("worker-surface-unavailable");
    send({ kind: "ack", id: message.id });
    return;
  }
  if (!staging || !front || !output) throw Error("not-initialized");
  if (message.kind === "start") {
    if (paths.length || builder) throw Error("job-overlap");
    active = message.id;
    if (message.clear) staging.getCanvas().clear(kit.WHITE);
    send({ kind: "ack", id: message.id });
    return;
  }
  if (message.id !== active) throw Error("stale-job");
  if (message.kind === "page") {
    if (
      !(message.verbs instanceof Uint8Array) ||
      !(message.points instanceof Float32Array) ||
      !(message.weights instanceof Float32Array) ||
      message.verbs.length > 4096 ||
      message.verbs.byteLength + message.points.byteLength + message.weights.byteLength > 256 * 1024
    )
      throw Error("page-limit");
    builder ??= new kit.PathBuilder();
    const kinds = [kit.MOVE_VERB, kit.LINE_VERB, kit.CONIC_VERB, kit.CLOSE_VERB];
    if (message.verbs.some((v) => v > 3)) throw Error("invalid-verb");
    builder.addVerbsPointsWeights(
      Uint8Array.from(message.verbs, (v) => kinds[v]!),
      message.points,
      message.weights,
    );
    if (message.done) {
      paths.push({ path: builder.snapshot(), color: message.color });
      builder.delete();
      builder = undefined;
    }
    send({ kind: "ack", id: message.id });
    return;
  }
  if (builder || paths.length === 0) throw Error("unfinished-path");
  send({ kind: "busy", id: message.id });
  const start = performance.now();
  const paint = new kit.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(kit.PaintStyle.Fill);
  const canvas = staging.getCanvas();
  canvas.save();
  canvas.translate(offset.x, offset.y);
  try {
    for (const { path, color } of paths) {
      paint.setColor(kit.Color4f(color[0]!, color[1]!, color[2]!, 1));
      canvas.drawPath(path, paint);
    }
  } finally {
    canvas.restore();
    paint.delete();
    for (const { path } of paths) path.delete();
    paths = [];
  }
  const drawMs = performance.now() - start;
  const exportStart = performance.now();
  staging.flush();
  const image = staging.makeImageSnapshot();
  if (!image) throw Error("worker-snapshot");
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
      id: active,
      bitmap,
      drawMs,
      exportMs: performance.now() - exportStart,
      heap: heap instanceof Uint8Array ? heap.buffer.byteLength : 0,
      width: output.width,
      height: output.height,
    },
    [bitmap],
  );
}
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  void run(event.data).catch((error: unknown) =>
    send({
      kind: "failure",
      id: event.data.id,
      reason: error instanceof Error ? error.message : "worker-failed",
    }),
  );
};
