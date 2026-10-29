/** Actual-app worker instrumentation; no replacement geometry implementation. */
export async function observeGeometryWorker(page, forceFailure = false, corruptWide = false) {
  await page.addInitScript(
    ({ fail, corrupt }) => {
      const stats = (window.geometryWorkerStats = {
        inputs32: 0,
        inputs64: 0,
        outputs32: 0,
        outputs64: 0,
        maximumInputBytes: 0,
        maximumOutputBytes: 0,
        maximumPending: 0,
        detached: 0,
        corrupted: false,
        retired: false,
      });
      window.geometryWorkerRetired = false;
      const pending = new Set();
      const Original = window.Worker;
      window.Worker = class extends Original {
        constructor(...args) {
          super(...args);
          this.addEventListener("message", (event) => {
            if (event.data?.ready && fail)
              this.postMessage({ id: 999999, input: null, tolerance: 1 });
            const output = event.data?.output;
            if (output instanceof Float32Array || output instanceof Float64Array) {
              pending.delete(event.data.id);
              stats.maximumOutputBytes = Math.max(stats.maximumOutputBytes, output.byteLength);
              if (output instanceof Float64Array) {
                stats.outputs64++;
                if (corrupt && !stats.corrupted) {
                  event.data.output = new Float32Array(output);
                  stats.corrupted = true;
                }
              } else stats.outputs32++;
            }
          });
        }
        postMessage(message, transfer) {
          const input = message?.input;
          const geometry = input instanceof Float32Array || input instanceof Float64Array;
          if (geometry) {
            pending.add(message.id);
            stats.maximumPending = Math.max(stats.maximumPending, pending.size);
            stats.maximumInputBytes = Math.max(stats.maximumInputBytes, input.byteLength);
            if (input instanceof Float64Array) stats.inputs64++;
            else stats.inputs32++;
          }
          super.postMessage(message, transfer);
          if (geometry && input.buffer.byteLength === 0) stats.detached++;
        }
        terminate() {
          window.geometryWorkerRetired = stats.retired = true;
          super.terminate();
        }
      };
    },
    { fail: forceFailure, corrupt: corruptWide },
  );
}
