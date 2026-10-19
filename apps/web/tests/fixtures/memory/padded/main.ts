import { loadEngine } from "../../../../src/memory/loader.ts";
import { present } from "../cpu-raster/present.ts";
import { cases, sizes } from "./catalogue.ts";
import { capture } from "./geometry.ts";

const button = document.querySelector("button");
const foundOutput = document.querySelector("#result");
if (!button || !foundOutput) throw Error("fixture-markup");
const output = foundOutput;
button.addEventListener("click", () => {
  button.disabled = true;
  void run().catch((error: unknown) => {
    output.textContent = JSON.stringify({
      status: "failed",
      outcome: "failure",
      reason: String(error),
    });
  });
});

async function run() {
  await loadEngine();
  const query = new URLSearchParams(location.search);
  const item = cases.find((value) => value.id === query.get("case"));
  const size = sizes.find((value) => value.id === query.get("size"));
  const halo = Number(query.get("halo"));
  const legacy = query.get("mode") === "legacy";
  if (!item || !size || ![0, 1, 2, 4, 8].includes(halo) || (legacy && halo !== 0))
    throw Error("fixture-selection");
  const { width, height } = size;
  const data = await capture(item, width, height);
  const metadata = {
    case: item,
    size,
    halo,
    legacy,
    inputVerbs: data.verbs,
    seedWallMs: data.seedWallMs,
    queryMs: data.queryMs,
    maximumQueryMs: data.maximumQueryMs,
  };
  const worker = new Worker(new URL("./checkpoint.worker.ts", import.meta.url), { type: "module" });
  const start = performance.now();
  let stage = "worker-start",
    details: unknown;
  const fail = (reason: string) => {
    worker.terminate();
    output.textContent = JSON.stringify({
      status: "failed",
      outcome: "failure",
      reason,
      stage,
      details,
      ...metadata,
      elapsedWallMs: performance.now() - start,
      limitation: "watchdog/error is not exact operation duration or candidate pixel verdict",
    });
  };
  let timeout = setTimeout(() => fail("worker-timeout"), 5000);
  worker.onerror = () => {
    clearTimeout(timeout);
    fail("worker-error");
  };
  worker.onmessage = (
    event: MessageEvent<{
      kind: string;
      status?: string;
      outcome?: string;
      reason?: string;
      stage?: string;
      details?: unknown;
      reference?: Uint8Array;
      candidate?: Uint8Array;
      gpuPixels?: Uint8Array;
      bitmap?: ImageBitmap;
    }>,
  ) => {
    clearTimeout(timeout);
    if (event.data.kind === "progress") {
      stage = event.data.stage ?? "unknown";
      details = event.data.details;
      timeout = setTimeout(() => fail("worker-timeout"), 5000);
      return;
    }
    worker.terminate();
    const { reference, candidate, gpuPixels, bitmap, ...result } = event.data;
    let bitmapParity: ReturnType<typeof present>["parity"] | undefined;
    try {
      if (bitmap) {
        if (!candidate) {
          bitmap.close();
          throw Error("missing-candidate");
        }
        bitmapParity = present(bitmap, width, height, candidate).parity;
        if (bitmapParity.differentChannels) {
          result.outcome = "mismatch";
          result.reason = "bitmap-parity";
        }
      }
      for (const [id, pixels] of [
        ["reference", reference],
        ["candidate-raw", candidate],
        ["gpu", gpuPixels],
      ] as const) {
        if (!pixels) continue;
        const canvas = document.getElementById(id);
        if (!(canvas instanceof HTMLCanvasElement)) throw Error("diagnostic-canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw Error("diagnostic-context");
        context.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
      }
    } catch (error: unknown) {
      result.status = "failed";
      result.outcome = "failure";
      result.reason = error instanceof Error ? error.message : "presentation-failure";
    }
    output.textContent = JSON.stringify({
      ...result,
      status: result.status ?? "failed",
      outcome: result.outcome ?? "failure",
      stage: result.stage ?? stage,
      details,
      ...metadata,
      bitmapParity,
      workerWallMs: performance.now() - start,
    });
  };
  worker.postMessage(
    { width, height, halo, legacy, pages: data.pages },
    data.pages.flatMap((page) => [page.verbs.buffer, page.points.buffer, page.weights.buffer]),
  );
}
