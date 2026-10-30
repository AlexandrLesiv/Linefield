import type { PaperSettings } from "../../../../vector-editor/src/paper-background";
import { capture } from "./snapshot";
type Result = {
  id: number;
  bytes: ArrayBuffer;
  svg: string;
  milliseconds: number;
  encoded: number;
  pixels: number;
};
import type { Group, View } from "./gpu";
let serial = 0,
  worker: Worker;
const requests = new Map<
  number,
  {
    resolve: (value: Result) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
function reset(reason = "svg-worker-reset") {
  worker?.terminate();
  for (const request of requests.values()) {
    clearTimeout(request.timer);
    request.reject(Error(reason));
  }
  requests.clear();
  worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }) => {
    const pending = requests.get(data.id);
    if (!pending) return;
    requests.delete(data.id);
    clearTimeout(pending.timer);
    if (data.error) pending.reject(Error(data.error));
    else pending.resolve(data);
  };
  worker.onerror = () => reset("svg-worker-failure");
  worker.onmessageerror = () => reset("svg-worker-message-failure");
}
reset();
async function job(
  groups: Group[],
  view: View,
  mode: string,
  tile = 1024,
  gutter = 4,
  paper?: PaperSettings,
) {
  if (requests.size) throw Error("svg-job-busy");
  const bytes = groups.reduce(
    (sum, group) => sum + group.bytes.byteLength + (group.coordinates?.byteLength ?? 0),
    0,
  );
  if (bytes > 16 * 1024 * 1024) throw Error("svg-fixture-derived-limit");
  const id = ++serial,
    copies = groups.map((group) => ({
      ...group,
      bytes: group.bytes.slice(0),
      coordinates: group.coordinates?.slice(),
    }));
  const result = new Promise<Result>((resolve, reject) =>
    requests.set(id, {
      resolve,
      reject,
      timer: setTimeout(() => reset("svg-worker-timeout"), 30000),
    }),
  );
  const transfer: ArrayBuffer[] = [];
  for (const group of copies) {
    transfer.push(group.bytes);
    if (group.coordinates) transfer.push(group.coordinates.buffer as ArrayBuffer);
  }
  worker.postMessage({ id, groups: copies, view, mode, tile, gutter, paper }, transfer);
  return result;
}
async function pixels(blob: Blob, width: number, height: number, matte: string) {
  const image = new Image(),
    url = URL.createObjectURL(blob);
  try {
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = matte;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function compare(
  groups: Group[],
  view: View,
  mode = "raster",
  tile = 1024,
  gutter = 4,
  matte = "white",
  paper?: PaperSettings,
) {
  const reference = await job(groups, view, "reference", tile, gutter, paper),
    candidate = await job(groups, view, mode, tile, gutter, paper);
  const width = Math.ceil(view.width * view.density),
    height = Math.ceil(view.height * view.density);
  const a = await pixels(new Blob([reference.bytes], { type: "image/png" }), width, height, matte),
    b = await pixels(new Blob([candidate.svg], { type: "image/svg+xml" }), width, height, matte);
  let changed = 0,
    max = 0,
    sum = 0,
    seamChanged = 0;
  for (let p = 0; p < width * height; p++) {
    let different = false;
    for (let c = 0; c < 4; c++) {
      const delta = Math.abs(a[p * 4 + c] - b[p * 4 + c]);
      max = Math.max(max, delta);
      sum += delta;
      different ||= delta !== 0;
    }
    if (different) {
      changed++;
      if ((p % width) % tile < 2 || Math.floor(p / width) % tile < 2) seamChanged++;
    }
  }
  const difference = document.createElement("canvas");
  difference.width = width;
  difference.height = height;
  const context = difference.getContext("2d")!,
    image = context.createImageData(width, height);
  for (let i = 0; i < a.length; i++) image.data[i] = i % 4 === 3 ? 255 : Math.abs(a[i] - b[i]);
  context.putImageData(image, 0, 0);
  return {
    reference: Array.from(new Uint8Array(reference.bytes)),
    difference: difference.toDataURL("image/png"),
    matte,
    width,
    height,
    changed,
    max,
    mean: sum / a.length,
    seamChanged,
    referenceMs: reference.milliseconds,
    exportMs: candidate.milliseconds,
    svgBytes: new TextEncoder().encode(candidate.svg).length,
    pngBytes: candidate.encoded,
    rasterPixels: candidate.pixels,
    svg: candidate.svg,
  };
}
function capsuleGroup(
  id: number,
  brush: number,
  capsules: number[],
  color = 0x223344,
  opacity = 0.5,
  width = 24,
): Group {
  const bytes = new ArrayBuffer((capsules.length / 6) * 32),
    f = new Float32Array(bytes),
    b = new Uint8Array(bytes),
    packed = Math.max(
      0,
      Math.min(65535, Math.round((Math.log2(Math.max(2 ** -32, width)) + 32) * 1024)),
    );
  for (let i = 0; i < capsules.length / 6; i++) {
    for (let k = 0; k < 6; k++) f[i * 8 + k] = capsules[i * 6 + k];
    b.set(
      [
        (color >>> 16) & 255,
        (color >>> 8) & 255,
        color & 255,
        Math.round(opacity * 255),
        brush,
        packed & 255,
        packed >>> 8,
        id & 255,
      ],
      i * 32 + 24,
    );
  }
  return { id, brush, bytes };
}
Object.assign(window, {
  svgProbe: {
    capture,
    reset,
    compare,
    job,
    capsuleGroup,
    cancel: (id: number = serial) => worker.postMessage({ id, cancel: true }),
  },
});
