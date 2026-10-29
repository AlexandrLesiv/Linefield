/** Test-only settled drawing-buffer hash; never used for performance measurements. */
export async function captureDrawing(frame, rectangle = null) {
  return frame.evaluate(async (clip) => {
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
            const scale = canvas.width / canvas.getBoundingClientRect().width;
            const x = clip ? Math.round(clip.x * scale) : 0;
            const width = clip ? Math.round(clip.width * scale) : canvas.width;
            const height = clip ? Math.round(clip.height * scale) : canvas.height;
            const y = clip ? canvas.height - Math.round((clip.y + clip.height) * scale) : 0;
            latest = new Uint8Array(width * height * 4);
            gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, latest);
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
  }, rectangle);
}
