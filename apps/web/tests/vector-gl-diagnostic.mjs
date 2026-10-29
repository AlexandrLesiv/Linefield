/** Test-only wall-clock attribution. Instrumented durations are not acceptance timings. */
export function installGlDiagnostic() {
  const methods = [
    "drawArrays",
    "drawArraysInstanced",
    "drawElements",
    "bufferData",
    "bufferSubData",
    "texImage2D",
    "texSubImage2D",
    "clear",
    "blitFramebuffer",
    "getParameter",
    "getError",
    "checkFramebufferStatus",
    "clientWaitSync",
    "fenceSync",
    "readPixels",
  ];
  window.glDiagnostic = { phase: "startup", slow: [], counts: {}, dropped: 0 };
  for (const name of methods) {
    const original = WebGL2RenderingContext.prototype[name];
    Object.defineProperty(WebGL2RenderingContext.prototype, name, {
      configurable: true,
      writable: true,
      value: function (...args) {
        const start = performance.now(),
          result = original.apply(this, args),
          duration = performance.now() - start;
        const state = window.glDiagnostic,
          key = `${state.phase}:${name}`;
        state.counts[key] = (state.counts[key] || 0) + 1;
        if (duration >= 1) {
          if (state.slow.length < 4096)
            state.slow.push({ phase: state.phase, method: name, start, duration });
          else state.dropped++;
        }
        return result;
      },
    });
  }
}
