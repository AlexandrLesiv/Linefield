/** Test-only settled drawing-buffer hash; never used for performance measurements. */
export async function captureDrawing(frame) {
  return frame.evaluate(async () => {
    const canvas = document.querySelector("canvas"),
      gl = canvas.getContext("webgl2");
    const methods = ["drawArrays", "drawArraysInstanced"];
    const descriptors = methods.map((name) => Object.getOwnPropertyDescriptor(gl, name));
    let latest;
    const restore = () =>
      methods.forEach((name, index) =>
        descriptors[index] ? Object.defineProperty(gl, name, descriptors[index]) : delete gl[name],
      );
    try {
      for (const name of methods) {
        const draw = gl[name].bind(gl);
        gl[name] = (...args) => {
          const result = draw(...args);
          if (gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === null) {
            const read = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
            latest = new Uint8Array(canvas.width * canvas.height * 4);
            gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, latest);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
          }
          return result;
        };
      }
      lab.requestRedraw();
      for (let tries = 0; tries < 240; tries++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!lab.renderPending() && latest) {
          if (gl.getError()) throw Error("readback failed");
          return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", latest)));
        }
      }
      throw Error("readback timeout");
    } finally {
      restore();
    }
  });
}
