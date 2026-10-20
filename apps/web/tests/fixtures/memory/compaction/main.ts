import { loadEngine } from "../../../../src/memory/loader.ts";
import { bridge } from "../../../../src/memory/bridge.ts";
import type { ReplyValue } from "../../../../src/memory/bridge.ts";
import { cases, sizes } from "../padded/catalogue.ts";
import { seed } from "../untiled/seed.ts";
import { capture, fingerprint } from "../untiled/capture.ts";
import { Publication } from "../untiled/publication.ts";
import { same } from "../untiled/protocol.ts";
import { comparePixels, inkPixels } from "../cpu-raster/raster.ts";
type Result =
  | { status: "progress"; stage: string }
  | { status: "failed"; reason: string }
  | {
      status: "completed";
      pixels: Uint8Array;
      references: Uint8Array[];
      bitmap: ImageBitmap;
      rows: unknown[];
      preparationHeapCapacity: number;
    };
const button = document.querySelector("button");
const output = document.querySelector("#result");
const source = document.querySelector("#source");
if (!button || !output || !source) throw Error("fixture-markup");
const json = (value: unknown) =>
  JSON.stringify(value, (_key, item: unknown) => (typeof item === "bigint" ? String(item) : item));
button.addEventListener("click", () => {
  button.disabled = true;
  void run();
});
function show(id: string, pixels: Uint8Array, width: number, height: number) {
  const canvas = document.getElementById(id);
  if (!(canvas instanceof HTMLCanvasElement)) throw Error("diagnostic-canvas");
  canvas.width = width;
  canvas.height = height;
  canvas
    .getContext("2d")!
    .putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
}
async function digest(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
}
async function run() {
  let state: ReplyValue | undefined;
  let worker: Worker | undefined;
  let bitmap: ImageBitmap | undefined;
  try {
    await loadEngine();
    const query = new URLSearchParams(location.search);
    const size = sizes.find((value) => value.id === query.get("size"));
    const item = cases.find((value) => value.id === query.get("case"));
    if (!size || !item) throw Error("fixture-row");
    state = await seed(item, size.width, size.height);
    const { frame } = await capture(state, size.width, size.height);
    const hashes = [];
    for (const stroke of frame.strokes)
      for (const page of stroke.pages)
        hashes.push(
          await Promise.all([
            digest(page.verbs),
            digest(
              new Uint8Array(page.points.buffer, page.points.byteOffset, page.points.byteLength),
            ),
            digest(
              new Uint8Array(page.weights.buffer, page.weights.byteOffset, page.weights.byteLength),
            ),
          ]),
        );
    source!.textContent = json({
      case: item,
      size,
      hashes,
      vectors: fingerprint(frame),
      frozenBeforeCandidate: true,
    });
    worker = new Worker(new URL("./checkpoint.worker.ts", import.meta.url), { type: "module" });
    const result = await new Promise<Exclude<Result, { status: "progress" }>>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => reject(Error("worker-stage-watchdog")), 5000);
      };
      worker!.onerror = () => {
        clearTimeout(timer);
        reject(Error("worker-error"));
      };
      worker!.onmessage = (event: MessageEvent<Result>) => {
        if (event.data.status === "progress") {
          console.info(`r08-stage:${event.data.stage}`);
          arm();
        } else {
          clearTimeout(timer);
          resolve(event.data);
        }
      };
      arm();
      worker!.postMessage({ frame, samples: BigInt(item.samples) });
    });
    if (result.status !== "completed") throw Error(result.reason);
    bitmap = result.bitmap;
    const first = result.references[0];
    const repeated = result.references[1];
    if (!first || !repeated) throw Error("missing-reference");
    const parity = comparePixels(first, result.pixels);
    const repeatability = comparePixels(first, repeated);
    const ink = inkPixels(result.pixels);
    show("reference", first, size.width, size.height);
    let reason: string | undefined;
    if (repeatability.differentChannels) reason = "reference-repeatability";
    else if (parity.differentChannels) reason = "candidate-reference-parity";
    else if (!ink || (item.id === "thin-horizontal" && ink !== 96)) reason = "known-ink";
    let submission: unknown;
    if (reason) show("candidate", result.pixels, size.width, size.height);
    else
      submission = new Publication().submit(
        bitmap,
        result.pixels,
        state,
        size.width,
        size.height,
        false,
        () => same(bridge.read(frame.state.owner), frame.state),
      );
    bitmap.close();
    bitmap = undefined;
    output!.textContent = json({
      status: reason ? "failed" : "completed",
      reason,
      parity,
      repeatability,
      ink,
      submission,
      rows: result.rows,
      preparationHeapCapacity: result.preparationHeapCapacity,
      scope:
        "preliminary static32-case corpus parity; finite capture/lifecycle/additional cases unrun",
      next: reason ? "stop candidate; preserve first failure" : "remaining Gate1 required",
    });
  } catch (error: unknown) {
    output!.textContent = json({
      status: "failed",
      reason: error instanceof Error ? error.message : "fixture-failure",
      scope: "preliminary static corpus; no full Gate1 or performance claim",
    });
  } finally {
    bitmap?.close();
    worker?.terminate();
    if (state) bridge.dispose(state.owner);
  }
}
