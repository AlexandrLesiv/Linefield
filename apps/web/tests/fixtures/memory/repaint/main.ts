import { loadEngine } from "../../../../src/memory/loader.ts";
import { geometry } from "./geometry.ts";
import type { Shape } from "./geometry.ts";
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
  if (![256, 1024, 4096, 65_537].includes(samples)) throw Error("sample-profile");
  const shape: Shape = query.get("shape") === "retraced" ? "retraced" : "coincident";
  const [width, height] = query.get("size") === "large" ? [4096, 2048] : [1024, 768];
  const data = await geometry(samples, shape, width!, height!);
  const worker = new Worker(new URL("./checkpoint.worker.ts", import.meta.url), { type: "module" });
  const start = performance.now();
  let stage = "worker-start";
  let details: unknown;
  const expire = () => {
    worker.terminate();
    output.textContent = JSON.stringify({
      status: "failed",
      reason: "worker-timeout",
      stage,
      samples,
      shape,
      width,
      height,
      elapsedWallMs: performance.now() - start,
      details,
      inputVerbs: data.verbs,
      queryMs: data.queryMs,
      maximumQueryMs: data.maximumQueryMs,
      limitation: "watchdog termination; no exact primitive duration or pixel verdict",
    });
  };
  let timeout = setTimeout(expire, 15_000);
  worker.onerror = () => {
    clearTimeout(timeout);
    worker.terminate();
    output.textContent = JSON.stringify({ status: "failed", reason: "worker-error" });
  };
  worker.onmessage = (
    event: MessageEvent<{
      kind: string;
      reason?: string;
      stage?: string;
      details?: unknown;
      result?: unknown;
      original: Uint8Array;
      candidate: Uint8Array;
    }>,
  ) => {
    clearTimeout(timeout);
    if (event.data.kind === "progress") {
      stage = event.data.stage ?? "unknown";
      if (event.data.details !== undefined) details = event.data.details;
      timeout = setTimeout(expire, 5000);
      return;
    }
    worker.terminate();
    if (event.data.kind !== "result") {
      output.textContent = JSON.stringify({
        status: "failed",
        reason: event.data.reason,
        stage,
        details,
        samples,
        shape,
        width,
        height,
        inputVerbs: data.verbs,
      });
      return;
    }
    for (const [id, pixels] of [
      ["reference", event.data.original],
      ["candidate", event.data.candidate],
    ] as const) {
      const canvas = document.getElementById(id);
      if (!(canvas instanceof HTMLCanvasElement)) throw Error("canvas-markup");
      canvas.width = width!;
      canvas.height = height!;
      const context = canvas.getContext("2d");
      if (!context) throw Error("comparison-context");
      context.putImageData(new ImageData(new Uint8ClampedArray(pixels), width!, height!), 0, 0);
    }
    output.textContent = JSON.stringify({
      status: "completed",
      samples,
      shape,
      width,
      height,
      queryMs: data.queryMs,
      maximumQueryMs: data.maximumQueryMs,
      seedWallMs: data.seedWallMs,
      inputVerbs: data.verbs,
      workerWallMs: performance.now() - start,
      result: event.data.result,
    });
  };
  const transfer = data.pages.flatMap((page) => [
    page.verbs.buffer,
    page.points.buffer,
    page.weights.buffer,
  ]);
  worker.postMessage({ width, height, pages: data.pages }, transfer);
}
