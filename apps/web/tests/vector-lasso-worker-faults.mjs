/** Browser-only faults target the Lasso worker, never material/geometry workers. */
export function installLassoFault(mode) {
  const instantiate = WebAssembly.instantiateStreaming.bind(WebAssembly);
  WebAssembly.instantiateStreaming = async (...args) => {
    const result = await instantiate(...args),
      e = result.instance.exports;
    return {
      module: result.module,
      instance: {
        exports: {
          ...e,
          count() {
            if (mode === "hold-guard" && window.lassoFault?.armed) {
              window.lassoFault.armed = false;
              throw Error("Injected Lasso guard failure");
            }
            return e.count();
          },
          session_selection_set(id, selected) {
            if (
              mode === "hold-apply" &&
              window.lassoFault?.armed &&
              ++window.lassoFault.applied === 2
            ) {
              window.lassoFault.armed = false;
              throw Error("Injected selection publication failure");
            }
            return e.session_selection_set(id, selected);
          },
        },
      },
    };
  };
  const Original = window.Worker;
  window.lassoFault = { mode, created: 0, terminated: 0, held: [], sent: 0 };
  window.Worker = class extends Original {
    constructor(url, options) {
      const target = String(url).includes("lasso-worker");
      if (target && (mode === "throw" || mode === "wide-throw"))
        throw Error("Injected Lasso constructor failure");
      super(url, options);
      this.target = target;
      if (target) window.lassoFault.created++;
    }
    set onmessage(callback) {
      this.callback = callback;
      super.onmessage = (event) => {
        if (!this.target || event.data.ready) {
          callback?.(event);
          return;
        }
        window.lassoFault.sent++;
        if (mode === "hang") return;
        if (mode.startsWith("hold")) {
          window.lassoFault.held.push(() => callback?.(event));
          return;
        }
        if (mode === "malformed") callback?.({ data: { ids: [999999] } });
        else if (mode === "duplicate") callback?.({ data: { ids: [0, 0] } });
        else if (mode === "error") callback?.({ data: { error: "Injected Lasso failure" } });
        else callback?.(event);
      };
    }
    get onmessage() {
      return this.callback;
    }
    postMessage(data, transfer) {
      if (this.target)
        window.lassoFault.wide = data.strokes.some((s) =>
          s.chunks.some((c) => c.data instanceof Float64Array),
        );
      return super.postMessage(data, transfer);
    }
    terminate() {
      if (this.target && !this.retired) {
        this.retired = true;
        window.lassoFault.terminated++;
      }
      super.terminate();
    }
  };
}
export async function drawLassoScene(frame) {
  await frame.evaluate(async () => {
    const canvas = document.querySelector("canvas"),
      r = canvas.getBoundingClientRect();
    canvas.setPointerCapture = () => {};
    canvas.hasPointerCapture = () => true;
    canvas.releasePointerCapture = () => {};
    window.lassoEvent = (type, x, y) =>
      canvas.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 701,
          pointerType: "pen",
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
          pressure: 0.7,
          clientX: r.left + x,
          clientY: r.top + y,
        }),
      );
    for (let id = 0; id < 3; id++) {
      document.querySelector("#pen").click();
      for (let i = 0; i < 513; i++)
        window.lassoEvent(
          i ? "pointermove" : "pointerdown",
          200 +
            i * (id === 2 ? 1 : 0.4) -
            (window.lassoFault.mode.startsWith("wide") && id === 0 && i === 0 ? 4294967296 : 0),
          220 + id * 45 + Math.sin(i / 30) * 12,
        );
      window.lassoEvent(
        "pointerup",
        200 + 512 * (id === 2 ? 1 : 0.4),
        220 + id * 45 + Math.sin(512 / 30) * 12,
      );
    }
    for (let i = 0; i < 300 && lab.renderPending(); i++)
      await new Promise((resolve) => requestAnimationFrame(resolve));
    window.rawLasso = () =>
      Array.from({ length: lab.core.count() }, (_, id) =>
        Array.from({ length: lab.core.raw_length(id) }, (unused, i) => [
          String(lab.core.raw_region(id, i, 0)),
          String(lab.core.raw_region(id, i, 1)),
          lab.core.raw_local(id, i, 0),
          lab.core.raw_local(id, i, 1),
          lab.core.raw_point(id, i, 2),
        ]),
      );
    window.originalLasso = JSON.stringify(window.rawLasso());
    document.querySelector("#select").click();
    document.querySelector("#selection-partial").checked = false;
    window.queryLasso = () => {
      window.lassoEvent("pointerdown", 150, 150);
      let previous = [150, 150];
      for (const p of [
        [500, 150],
        [500, 380],
        [150, 380],
        [150, 150],
      ]) {
        for (let i = 1; i <= 256; i++)
          window.lassoEvent(
            "pointermove",
            previous[0] + ((p[0] - previous[0]) * i) / 256,
            previous[1] + ((p[1] - previous[1]) * i) / 256,
          );
        previous = p;
      }
      window.lassoEvent("pointerup", 150, 150);
    };
  });
}
