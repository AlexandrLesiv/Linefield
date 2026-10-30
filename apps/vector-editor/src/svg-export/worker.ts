import { createGpu } from "./gpu";
import { OUTPUT_LIMIT, PNG_CHUNK, type WorkerRequest, type WorkerReply } from "./types";
let gpu: Awaited<ReturnType<typeof createGpu>> | undefined;
let png: Blob | undefined,
  offset = 0,
  active = false,
  busy = false;
const permit = async () => {
  for (;;) {
    if (!active) return;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
};
self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if ("active" in data) {
    active = data.active;
    return;
  }
  const { id, command } = data;
  const reply = (value: Omit<WorkerReply, "id"> = {}, transfer: Transferable[] = []) =>
    self.postMessage({ id, ...value }, { transfer });
  if (busy) {
    reply({ error: "svg-worker-busy" });
    return;
  }
  busy = true;
  try {
    await permit();
    switch (command.kind) {
      case "init":
        if (gpu) throw Error("svg-worker-already-initialized");
        gpu = await createGpu(command.view, command.wasmUrl, permit);
        reply();
        break;
      case "background":
        if (!gpu || png) throw Error("svg-worker-state");
        await gpu.background();
        reply();
        break;
      case "packet":
        if (!gpu || png) throw Error("svg-worker-state");
        await gpu.packet(command.values, command.last);
        reply();
        break;
      case "image":
        if (!gpu || png) throw Error("svg-worker-state");
        await gpu.image(command.blob, command.values);
        reply();
        break;
      case "text":
        if (!gpu || png) throw Error("svg-worker-state");
        await gpu.text(command.values, command.text);
        reply();
        break;
      case "png":
        if (!gpu || png) throw Error("svg-worker-state");
        png = await gpu.png();
        offset = 0;
        if (png.size > OUTPUT_LIMIT * 0.75) throw Error("svg-output-limit");
        reply({ pngBytes: png.size });
        break;
      case "pull": {
        if (!gpu || !png) throw Error("svg-worker-state");
        const bytes = await png.slice(offset, offset + PNG_CHUNK).arrayBuffer();
        gpu.healthy();
        offset += bytes.byteLength;
        const done = offset === png.size;
        if (done) png = undefined;
        reply({ bytes, done }, [bytes]);
        break;
      }
      case "finish":
        if (!gpu || png) throw Error("svg-worker-state");
        gpu.healthy();
        gpu.dispose();
        gpu = undefined;
        reply();
        break;
    }
  } catch (error) {
    gpu?.dispose();
    gpu = undefined;
    png = undefined;
    reply({ error: error instanceof Error ? error.message : "svg-worker-failure" });
  } finally {
    busy = false;
  }
};
