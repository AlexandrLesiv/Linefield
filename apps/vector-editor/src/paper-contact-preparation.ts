import { installPaperContactData } from "./paper-contact-material";
const BYTES = 16777216;
const HASH = "b95350973d88b284919349b4d69bd50ca0394174e4117652d1060d4b60b7283b";
let preparation: Promise<void> | undefined;
let cancel = () => {};
export const materialPreparation = { mode: "pending", milliseconds: 0 };
export function cancelPaperContactPreparation(): void {
  cancel();
}
/** Optional warm-up. It never gates input; first pencil use retains the original fallback. */
export function preparePaperContact(): Promise<void> {
  return (preparation ??= new Promise((resolve) => {
    const start = performance.now();
    let worker: Worker | undefined,
      done = false,
      received = false;
    const release = () => {
      if (worker) {
        worker.onmessage = null;
        worker.terminate();
        worker = undefined;
      }
    };
    const finish = (mode: string) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      release();
      materialPreparation.mode = mode;
      materialPreparation.milliseconds = performance.now() - start;
      resolve();
    };
    const timeout = setTimeout(() => finish("synchronous-fallback"), 5000);
    cancel = () => finish("synchronous-fallback");
    try {
      worker = new Worker(new URL("./paper-contact-worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onerror = worker.onmessageerror = () => finish("synchronous-fallback");
      worker.onmessage = async ({ data: message }) => {
        if (done || received) return;
        received = true;
        release();
        try {
          const data = message?.data;
          if (
            message?.version !== 1 ||
            !(data instanceof Uint8Array) ||
            !(data.buffer instanceof ArrayBuffer) ||
            data.byteOffset !== 0 ||
            data.byteLength !== BYTES ||
            data.buffer.byteLength !== BYTES
          )
            throw Error("Invalid bounded material payload");
          const digest = await crypto.subtle.digest("SHA-256", data.buffer);
          if (done) return;
          const hash = Array.from(new Uint8Array(digest), (value) =>
            value.toString(16).padStart(2, "0"),
          ).join("");
          if (hash !== HASH) throw Error("Material version mismatch");
          installPaperContactData(data);
          finish("worker");
        } catch {
          finish("synchronous-fallback");
        }
      };
    } catch {
      finish("synchronous-fallback");
    }
  }));
}
