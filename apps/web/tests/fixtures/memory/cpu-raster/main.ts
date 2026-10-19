import { loadEngine } from "../../../../src/memory/loader.ts";
import { capture } from "./geometry.ts";
import type { Shape } from "./geometry.ts";
import { present } from "./present.ts";

const button = document.querySelector("button");
const foundOutput = document.querySelector("#result");
if (!button || !foundOutput) throw Error("fixture-markup");
const output = foundOutput;
button.addEventListener("click", () => {
  button.disabled = true;
  void run().catch((error: unknown) => {
    output.textContent = JSON.stringify({ status: "failed", reason: String(error) });
  });
});

async function run() {
  await loadEngine();
  const query = new URLSearchParams(location.search);
  const samples = Number(query.get("samples") ?? 256);
  if (![2, 256, 1024, 65_537, 65_538].includes(samples)) throw Error("sample-profile");
  const shape: Shape =
    query.get("shape") === "thin"
      ? "thin"
      : query.get("shape") === "retraced"
        ? "retraced"
        : "coincident";
  if ((shape === "thin") !== (samples === 2)) throw Error("thin-profile");
  const [width, height] = query.get("size") === "large" ? [4096, 2048] : [1024, 768];
  const captureStart = performance.now();
  const data = await capture(samples, shape, width!, height!);
  const geometryCaptureMs = Math.max(
    data.queryMs,
    performance.now() - captureStart - data.seedWallMs,
  );
  const worker = new Worker(new URL("./checkpoint.worker.ts", import.meta.url), { type: "module" });
  const start = performance.now();
  let stage = "worker-start";
  let details: unknown;
  const metadata = {
    samples,
    shape,
    width,
    height,
    inputVerbs: data.verbs,
    queryMs: data.queryMs,
    maximumQueryMs: data.maximumQueryMs,
    seedWallMs: data.seedWallMs,
    geometryCaptureMs,
  };
  const expire = () => {
    worker.terminate();
    output.textContent = JSON.stringify({
      status: "failed",
      reason: "worker-timeout",
      stage,
      elapsedWallMs: performance.now() - start,
      details,
      ...metadata,
      limitation: "stage watchdog; no exact operation duration or candidate pixel verdict",
    });
  };
  let timeout = setTimeout(expire, 15_000);
  worker.onerror = () => {
    clearTimeout(timeout);
    worker.terminate();
    output.textContent = JSON.stringify({
      status: "failed",
      reason: "worker-error",
      stage,
      details,
      ...metadata,
    });
  };
  worker.onmessage = (
    event: MessageEvent<{
      kind: string;
      stage?: string;
      details?: unknown;
      original?: Uint8Array;
      cpuReference?: Uint8Array;
      sentEpochMs?: number;
      candidate?: Uint8Array;
      bitmap?: ImageBitmap;
      status?: string;
      reason?: string;
      metrics?: { coldMs: number };
      verdict?: string;
    }>,
  ) => {
    clearTimeout(timeout);
    if (event.data.kind === "progress") {
      stage = event.data.stage ?? "unknown";
      details = event.data.details;
      timeout = setTimeout(expire, 5000);
      return;
    }
    worker.terminate();
    const { original, cpuReference, candidate, bitmap, ...result } = event.data;
    const transportToReceiveMs =
      result.sentEpochMs === undefined
        ? 0
        : Math.max(0, performance.timeOrigin + performance.now() - result.sentEpochMs);
    let bitmapSubmitMs = 0;
    let bitmapParity: ReturnType<typeof present>["parity"] | undefined;
    if (bitmap) {
      try {
        if (!candidate) {
          bitmap.close();
          throw Error("missing-candidate-pixels");
        }
        const presented = present(bitmap, width!, height!, candidate);
        bitmapSubmitMs = presented.submitMs;
        bitmapParity = presented.parity;
        if (bitmapParity.differentChannels) {
          result.status = "failed";
          result.reason = "bitmap-parity";
        }
      } catch (error: unknown) {
        result.status = "failed";
        result.reason = error instanceof Error ? error.message : "bitmap-presentation";
      }
    }
    // Diagnostic comparison pixels are painted after timed bitmap submission.
    for (const [id, pixels] of [
      ["reference", original],
      ["cpu-reference", cpuReference],
      ["candidate", candidate],
    ] as const) {
      if (!pixels || (id === "candidate" && bitmap)) continue;
      const canvas = document.getElementById(id);
      if (!(canvas instanceof HTMLCanvasElement)) throw Error("comparison-canvas");
      canvas.width = width!;
      canvas.height = height!;
      const context = canvas.getContext("2d");
      if (!context) throw Error("comparison-context");
      context.putImageData(new ImageData(new Uint8ClampedArray(pixels), width!, height!), 0, 0);
    }
    const coldSubmitMs =
      geometryCaptureMs + (result.metrics?.coldMs ?? 0) + transportToReceiveMs + bitmapSubmitMs;
    output.textContent = JSON.stringify({
      ...result,
      status: result.status ?? "failed",
      stage: result.stage ?? stage,
      details,
      ...metadata,
      bitmapSubmitMs,
      bitmapParity,
      transportToReceiveMs,
      coldSubmitMs,
      workerWallMs: performance.now() - start,
      ...(coldSubmitMs > 500 && result.status === "completed"
        ? { status: "failed", reason: "cpu-submit-cold-limit" }
        : {}),
    });
  };
  worker.postMessage(
    { width, height, pages: data.pages },
    data.pages.flatMap((page) => [page.verbs.buffer, page.points.buffer, page.weights.buffer]),
  );
}
