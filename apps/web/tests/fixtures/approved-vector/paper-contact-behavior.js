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
    samples = {},
    errors = [];
  const assert = (ok, label) => {
    if (!ok) throw Error(label);
    checks.push(label);
  };
  const select = (id, value) => {
    const e = document.querySelector("#" + id);
    e.value = String(value);
    e.dispatchEvent(new Event("change"));
  };
  const input = (id, value) => {
    const e = document.querySelector("#" + id);
    e.value = String(value);
    e.dispatchEvent(new Event("input"));
  };
  const r = c.getBoundingClientRect(),
    core = lab.core;
  const saved = ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"].map((k) =>
    Object.getOwnPropertyDescriptor(c, k),
  );
  let captured = null;
  c.setPointerCapture = (id) => (captured = id);
  c.hasPointerCapture = (id) => captured === id;
  c.releasePointerCapture = () => (captured = null);
  const event = (type, x, y, p) =>
    c.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 901,
        pointerType: "pen",
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        pressure: p,
        clientX: r.left + x,
        clientY: r.top + y,
      }),
    );
  const stroke = (y, p) => {
    const id = core.count();
    event("pointerdown", 100, y, p);
    for (let i = 1; i <= 160; i++) event("pointermove", 100 + i * 3.5, y, p);
    event("pointerup", 660, y, 0);
    return id;
  };
  const tone = (pixels, y) => {
    let total = 0,
      min = 255,
      max = 0,
      n = 0;
    const row = c.height - 1 - Math.floor((y * c.height) / r.height);
    for (let x = 240; x < 540; x++) {
      const value = pixels[(row * c.width + Math.floor((x * c.width) / r.width)) * 4];
      total += value;
      min = Math.min(min, value);
      max = Math.max(max, value);
      n++;
    }
    return { mean: total / n, min, max };
  };
  const onerror = (e) => errors.push(e.message);
  window.addEventListener("error", onerror);
  try {
    assert(core.count() === 0, "isolated empty fixture");
    select("paper-style", "none");
    select("grid-style", "none");
    input("color", "#000000");
    select("brush", 1);
    assert(+document.querySelector("#width").value === 3, "hard pencil starts fine");
    input("width", 7);
    select("brush", 2);
    assert(+document.querySelector("#width").value === 12, "soft pencil starts wider");
    select("brush", 1);
    assert(+document.querySelector("#width").value === 7, "each brush remembers its width");
    const ids = [];
    for (const kind of [1, 2]) {
      select("brush", kind);
      input("width", 24);
      input("opacity", 100);
      const y = kind === 1 ? 140 : 330;
      const light = stroke(y, 0.2),
        dark = stroke(y + 65, 1);
      ids.push(light, dark);
      const pixels = await capture();
      samples[kind] = { light: tone(pixels, y), dark: tone(pixels, y + 65) };
      assert(core.brush(light) === kind && core.brush(dark) === kind, "stored brush " + kind);
      assert(
        Math.abs(core.raw_point(light, 50, 2) - 0.2) < 1e-6 && core.raw_point(dark, 50, 2) === 1,
        "raw pressure retained " + kind,
      );
      assert(
        255 - samples[kind].dark.mean > (255 - samples[kind].light.mean) * 1.3,
        "pressure increases darkness " + kind,
      );
      assert(samples[kind].dark.max - samples[kind].dark.min > 15, "visible grain " + kind);
      stroke(y + 65, 1);
      const overlap = await capture();
      samples[kind].overlap = tone(overlap, y + 65);
      assert(
        255 - samples[kind].overlap.mean > (255 - samples[kind].dark.mean) * 1.25,
        "separate full-opacity pencil strokes accumulate " + kind,
      );
    }
    assert(
      samples[2].dark.mean < samples[1].dark.mean - 10,
      "soft pencil is darker than hard at equal width and pressure",
    );
    const baseline = await capture();
    lab.setSparseCoverage(false);
    lab.setCompositeCaching(false);
    const uncached = await capture();
    assert(
      diff(baseline, uncached).count === 0,
      "mixed pencil cached/atlas pixels match regular renderer",
    );
    lab.setSparseCoverage(true);
    lab.setCompositeCaching(true);
    document.querySelector("#undo").click();
    const one = await capture();
    assert(diff(one, baseline).count > 0, "undo removes last pencil pass");
    document.querySelector("#redo").click();
    assert(diff(baseline, await capture()).count === 0, "redo restores exact pencil pixels");
    const fingerprint = JSON.stringify(
      ids.map((id) =>
        Array.from({ length: core.raw_length(id) }, (_, i) =>
          [0, 1, 2].map((k) => core.raw_point(id, i, k)),
        ),
      ),
    );
    for (const zoom of [8, 0.1, 16, 0.05, 1]) {
      const old = lab.view().zoom;
      c.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: r.left + 400,
          clientY: r.top + 300,
          deltaY: -Math.log(zoom / old) / 0.001,
        }),
      );
      await capture();
    }
    document.querySelector("#reset").click();
    assert(
      diff(baseline, await capture()).count === 0,
      "rapid zoom roundtrip restores exact grain",
    );
    assert(
      fingerprint ===
        JSON.stringify(
          ids.map((id) =>
            Array.from({ length: core.raw_length(id) }, (_, i) =>
              [0, 1, 2].map((k) => core.raw_point(id, i, k)),
            ),
          ),
        ),
      "zoom never rewrites raw pressure",
    );
    select("brush", 0);
    assert(
      ids.every((id, i) => core.brush(id) === (i < 2 ? 1 : 2)),
      "changing brush does not restyle existing strokes",
    );
    assert(errors.length === 0, "no browser errors");
    return { passed: true, checks, samples, dpr: devicePixelRatio, errors };
  } catch (error) {
    return { passed: false, failure: String(error), checks, samples, errors };
  } finally {
    ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"].forEach((key, i) => {
      if (saved[i]) Object.defineProperty(c, key, saved[i]);
      else delete c[key];
    });
    window.removeEventListener("error", onerror);
    lab.setSparseCoverage(true);
    lab.setCompositeCaching(true);
  }
})();
