(async () => {
  const c = document.querySelector("canvas"),
    core = lab.core,
    checks = [],
    errors = [],
    pixels = [];
  const original = ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"].map((k) =>
    Object.getOwnPropertyDescriptor(c, k),
  );
  let captured = null;
  c.setPointerCapture = (id) => {
    captured = id;
  };
  c.hasPointerCapture = (id) => captured === id;
  c.releasePointerCapture = () => {
    captured = null;
  };
  const onerror = (e) => errors.push(e.message);
  window.addEventListener("error", onerror);
  const r = c.getBoundingClientRect(),
    click = (id) => document.querySelector("#" + id).click();
  const event = (type, x, y) =>
    c.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 801,
        pointerType: "pen",
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        pressure: 0.7,
        clientX: r.left + x,
        clientY: r.top + y,
      }),
    );
  const gesture = (points) => {
    event("pointerdown", ...points[0]);
    for (const p of points.slice(1)) event("pointermove", ...p);
    event("pointerup", ...points.at(-1));
  };
  const assert = (ok, label) => {
    if (!ok) throw Error(label);
    checks.push(label);
  };
  const paint = () =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const raw = (id) =>
    JSON.stringify(
      Array.from({ length: core.raw_length(id) }, (_, i) =>
        [0, 1, 2].map((k) => core.raw_point(id, i, k)),
      ),
    );
  const visible = () =>
    Array.from({ length: core.count() }, (_, i) => i).filter((i) => core.visible(i));
  const size = (n) => {
    document.querySelector("#slice-width-number").value = String(n);
    document.querySelector("#slice-width-number").dispatchEvent(new Event("change"));
  };
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
  const parity = async (label) => {
    const cached = await capture();
    lab.setCompositeCaching(false);
    lab.setSparseCoverage(false);
    const fresh = await capture();
    const result = { label, ...diff(cached, fresh) };
    pixels.push(result);
    assert(result.count === 0, label + " cached/atlas pixels match regular renderer");
    lab.setCompositeCaching(true);
    lab.setSparseCoverage(true);
    return cached;
  };
  try {
    assert(core.count() === 0, "isolated empty preview");
    document.querySelector("#width").value = "24";
    document.querySelector("#opacity").value = "45";
    document.querySelector("#color").value = "#d83842";
    gesture([
      [200, 240],
      [550, 240],
      [900, 240],
    ]);
    document.querySelector("#color").value = "#2868d8";
    gesture([
      [280, 120],
      [540, 250],
      [800, 380],
    ]);
    document.querySelector("#color").value = "#20905a";
    gesture([
      [300, 420],
      [550, 420],
      [800, 420],
    ]);
    const saved = [0, 1, 2].map(raw);
    const baseline = await capture();
    click("slice");
    click("slice-zero");
    event("pointerdown", 500, 90);
    event("pointermove", 500, 460);
    await paint();
    assert(visible().length === 6, "zero-width split exists before pointerup");
    event("pointerup", 500, 460);
    assert(
      visible().length === 6 && !core.visible(0) && !core.visible(1) && !core.visible(2),
      "zero width splits three strokes into six pieces",
    );
    assert(
      [0, 1, 2].every((id) => raw(id) === saved[id]),
      "raw samples unchanged after cut",
    );
    const zero = await parity("zero-width");
    const zeroDiff = diff(baseline, zero);
    pixels.push({ label: "zero width vs intact", ...zeroDiff });
    assert(zeroDiff.max <= 1, "zero-width cut has no dark translucent seam");
    click("undo");
    const restored = await capture();
    assert(diff(baseline, restored).count === 0, "undo restores original pixels exactly");
    click("redo");
    assert(visible().length === 6, "redo restores all fragments");
    click("select");
    click("selection-pick-mode");
    gesture([
      [340, 240],
      [340, 240],
    ]);
    await paint();
    const selected = lab.selection();
    assert(
      selected.length === 1 && core.stroke_order(selected[0]) === 0,
      "cut fragment selects independently",
    );
    gesture([
      [340, 240],
      [340, 310],
    ]);
    await paint();
    assert(core.stroke_offset(selected[0], 1) === 70, "selected fragment moves");
    const siblings = visible().filter((id) => core.stroke_order(id) === 0 && id !== selected[0]);
    assert(
      siblings.every((id) => core.stroke_offset(id, 1) === 0),
      "other fragment stays in place",
    );
    assert(
      core.stroke_blend_group(selected[0]) !== core.stroke_blend_group(siblings[0]),
      "independently moved pieces use separate blending",
    );
    await parity("moved fragment");
    click("undo");
    click("undo");
    assert(visible().length === 3, "undo move then slice restores originals");
    click("slice");
    size(24);
    event("pointerdown", 500, 90);
    event("pointermove", 500, 460);
    assert(visible().length === 6, "positive width cuts before pointerup");
    const live = await parity("live positive-width before release");
    assert(diff(baseline, live).count > 0, "ink visibly removed while pointer remains down");
    event("pointerup", 500, 460);
    await parity("positive-width");
    const before = core.count();
    gesture([
      [500, 90],
      [500, 460],
    ]);
    assert(core.count() === before, "same gap sliced again is a no-op");
    click("undo");
    assert(visible().length === 3, "no-op does not consume history");
    event("pointerdown", 500, 90);
    event("pointermove", 500, 460);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    event("pointerup", 500, 460);
    assert(visible().length === 3, "Escape cancels the entire gesture");
    event("pointerdown", 500, 90);
    event("pointermove", 500, 460);
    click("pen");
    event("pointerup", 500, 460);
    assert(visible().length === 3, "switching tools cancels unfinished cuts");
    click("slice");
    lab.layers.locked(0, true);
    gesture([
      [500, 90],
      [500, 460],
    ]);
    assert(visible().length === 3, "locked strokes protected");
    lab.layers.locked(0, false);
    lab.layers.visible(0, false);
    gesture([
      [500, 90],
      [500, 460],
    ]);
    lab.layers.visible(0, true);
    assert(visible().length === 3, "hidden strokes protected");
    lab.layers.create();
    document.querySelector("#slice-active-layer").checked = true;
    gesture([
      [500, 90],
      [500, 460],
    ]);
    assert(visible().length === 3, "active-layer-only excludes other layers");
    document.querySelector("#slice-active-layer").checked = false;
    gesture([
      [500, 90],
      [500, 460],
    ]);
    assert(visible().length === 6, "all editable layers sliced");
    await parity("layer history");
    click("reset");
    const wheel = (zoom) => {
      const old = lab.view().zoom;
      c.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: r.left + 500,
          clientY: r.top + 240,
          deltaY: -Math.log(zoom / old) / 0.001,
        }),
      );
    };
    for (const zoom of [8, 0.1, 8, 0.05, 1]) wheel(zoom);
    click("rotate");
    gesture([
      [r.width / 2 + 100, r.height / 2],
      [r.width / 2 + 70, r.height / 2 + 70],
    ]);
    await parity("rapid zoom and rotation");
    assert(
      [0, 1, 2].every((id) => raw(id) === saved[id]),
      "zoom rotation and history preserve original samples",
    );
    assert(errors.length === 0, "no uncaught browser errors");
    return {
      passed: true,
      checks,
      pixels,
      errors,
      dpr: devicePixelRatio,
      width: c.width,
      height: c.height,
    };
  } catch (error) {
    return { passed: false, failure: String(error), checks, pixels, errors };
  } finally {
    click("pen");
    ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"].forEach((k, i) => {
      if (original[i]) Object.defineProperty(c, k, original[i]);
      else delete c[k];
    });
    window.removeEventListener("error", onerror);
    lab.setCompositeCaching(true);
    lab.setSparseCoverage(true);
  }
})();
