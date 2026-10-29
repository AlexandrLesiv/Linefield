(async () => {
  const c = document.querySelector("canvas");
  const capture = () =>
    new Promise((resolve, reject) => {
      const gl = c.getContext("webgl2"),
        names = ["drawArrays", "drawArraysInstanced"],
        desc = names.map((n) => Object.getOwnPropertyDescriptor(gl, n));
      let latest = null,
        frames = 0;
      const restore = () =>
        names.forEach((n, i) => (desc[i] ? Object.defineProperty(gl, n, desc[i]) : delete gl[n]));
      for (const name of names) {
        const draw = gl[name].bind(gl);
        gl[name] = function (...args) {
          const result = draw(...args);
          if (gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === null) {
            const read = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
            latest = new Uint8Array(c.width * c.height * 4);
            gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, latest);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
          }
          return result;
        };
      }
      lab.requestRedraw();
      function check() {
        if (++frames > 240) {
          restore();
          return reject(Error("render timeout"));
        }
        if (lab.renderPending()) return requestAnimationFrame(check);
        restore();
        if (!latest || gl.getError()) return reject(Error("capture failed"));
        resolve(latest);
      }
      requestAnimationFrame(check);
    });
  const diff = (a, b) => {
    let count = 0,
      max = 0;
    for (let i = 0; i < a.length; i += 4) {
      let delta = 0;
      for (let k = 0; k < 4; k++) delta = Math.max(delta, Math.abs(a[i + k] - b[i + k]));
      if (delta) count++;
      max = Math.max(max, delta);
    }
    return { count, max };
  };

  const checks = [],
    stats = {};
  const assert = (ok, label) => {
    if (!ok) throw Error(label);
    checks.push(label);
  };
  const core = lab.core,
    r = c.getBoundingClientRect(),
    gl = c.getContext("webgl2");
  const select = (id, v) => {
    const e = document.getElementById(id);
    e.value = String(v);
    e.dispatchEvent(new Event("change"));
  };
  const input = (id, v) => {
    const e = document.getElementById(id);
    e.value = String(v);
    e.dispatchEvent(new Event("input"));
  };
  const originals = ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"].map((k) =>
    Object.getOwnPropertyDescriptor(c, k),
  );
  let captured = null;
  c.setPointerCapture = (id) => (captured = id);
  c.hasPointerCapture = (id) => captured === id;
  c.releasePointerCapture = () => (captured = null);
  const event = (type, x, y) =>
    c.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 902,
        pointerType: "pen",
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        pressure: 1,
        clientX: r.left + x,
        clientY: r.top + y,
      }),
    );
  const zoom = (value) => {
    document.getElementById("reset").click();
    c.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        clientX: r.left + 500,
        clientY: r.top + 300,
        deltaY: -Math.log(value) / 0.001,
      }),
    );
  };
  const red = (p, x, y) => p[((c.height - 1 - y) * c.width + x) * 4];
  try {
    assert(core.count() === 0, "isolated empty fixture");
    select("paper-style", "none");
    select("grid-style", "none");
    select("brush", 2);
    input("width", 24);
    input("color", "#000000");
    input("opacity", 100);
    event("pointerdown", 80, 300);
    for (let i = 1; i <= 204; i++) event("pointermove", 80 + i * 5, 300);
    event("pointerup", 1100, 300);
    const raw = JSON.stringify(
      Array.from({ length: core.raw_length(0) }, (_, i) =>
        [0, 1, 2].map((k) => core.raw_point(0, i, k)),
      ),
    );
    const initial = await capture();
    zoom(8);
    const high = await capture();
    const sx = c.width / r.width,
      sy = c.height / r.height;
    let n = 0,
      white = 0,
      dark = 0;
    const histogram = new Uint32Array(256);
    for (let y = Math.floor(280 * sy); y < 320 * sy; y++)
      for (let x = Math.floor(250 * sx); x < 750 * sx; x++) {
        const value = red(high, x, y);
        n++;
        white += value === 255;
        dark += value < 160;
        histogram[value]++;
      }
    const quantile = (q) => {
      let count = 0;
      for (let value = 0; value < 256; value++) {
        count += histogram[value];
        if (count >= n * q) return value;
      }
      return 255;
    };
    stats.enlarged = {
      whiteFraction: white / n,
      darkFraction: dark / n,
      grayLevels: histogram.filter(Boolean).length,
      p10: quantile(0.1),
      p90: quantile(0.9),
    };
    assert(
      stats.enlarged.grayLevels > 12 &&
        stats.enlarged.p90 - stats.enlarged.p10 > 8 &&
        stats.enlarged.p10 < 240,
      "enlarged body retains varying gray graphite deposits",
    );
    lab.setCompositeCaching(false);
    lab.setSparseCoverage(false);
    assert(
      diff(high, await capture()).count === 0,
      "paper-contact high zoom matches uncached renderer",
    );
    lab.setCompositeCaching(true);
    lab.setSparseCoverage(true);
    zoom(0.05);
    const low = await capture();
    let gaps = 0,
      columns = 0;
    for (let x = Math.ceil(482 * sx); x < Math.floor(524 * sx); x++) {
      let value = 255;
      for (let y = Math.floor(300 * sy) - 3; y <= Math.floor(300 * sy) + 3; y++)
        value = Math.min(value, red(low, x, y));
      gaps += value === 255;
      columns++;
    }
    stats.minified = { gaps, columns };
    assert(gaps === 0, "minified paper contact averages without dashed hairline gaps");
    zoom(1);
    assert(
      diff(initial, await capture()).count === 0,
      "zoom roundtrip restores exact paper deposits",
    );
    const extension = gl.getExtension("WEBGL_lose_context");
    assert(!!extension, "context restoration test available");
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error("context restore timeout")), 5000);
      c.addEventListener(
        "webglcontextrestored",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      c.addEventListener(
        "webglcontextlost",
        () => requestAnimationFrame(() => extension.restoreContext()),
        { once: true },
      );
      extension.loseContext();
    });
    assert(
      diff(initial, await capture()).count === 0,
      "context restoration restores exact paper material and blending",
    );
    assert(
      raw ===
        JSON.stringify(
          Array.from({ length: core.raw_length(0) }, (_, i) =>
            [0, 1, 2].map((k) => core.raw_point(0, i, k)),
          ),
        ),
      "raw samples survive material rendering and context restoration",
    );
    stats.texture = lab.brushStats();
    return { passed: true, checks, stats, dpr: devicePixelRatio };
  } catch (error) {
    return { passed: false, failure: String(error), checks, stats };
  } finally {
    ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"].forEach((key, i) => {
      if (originals[i]) Object.defineProperty(c, key, originals[i]);
      else delete c[key];
    });
    lab.setCompositeCaching(true);
    lab.setSparseCoverage(true);
  }
})();
