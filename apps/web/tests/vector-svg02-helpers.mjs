export function svgHelpers() {
  const check = (v, name) => {
    if (!v) throw Error(name);
  };
  const timings = [];
  function draw(c, opacity = 1, region = 0n) {
    c.begin_fixed_width(8, 0x236598, opacity);
    c.push_regional(region, 10.125, 0n, 20.25, 0.4);
    c.push_regional(region, 30.125, 0n, 30.5, 0.8);
    c.commit();
  }
  function seal(c, density = 2, bg = 2, grid = 0) {
    const t = c.svg_begin();
    check(t > 0, "begin");
    while (c.svg_prepare(t) === 1) {}
    check(c.svg_configure(t, density, bg, grid) === 1, "configure");
    let n = 0;
    while (c.svg_measure(t) === 1) {
      check(++n < 20000, "bounded measure completion");
    }
    check(c.svg_status(t) === 2, "sealed remains readable");
    return t;
  }
  function stream(c, t) {
    let groups = 0,
      packets = 0;
    while (c.svg_next(t, c.svg_tolerance(t))) {
      groups += c.svg_group_last(t);
      packets++;
    }
    check(c.svg_status(t) === 3, "geometry exhausts");
    return { groups, packets };
  }
  function retire(c, t) {
    c.svg_cancel(t);
    let n = 0;
    while (!c.svg_cleanup(t)) check(++n < 20000, "cleanup bounded completion");
    check(c.svg_status(t) === 0, "retired");
  }
  function text(c, t, n) {
    check(c.svg_error(t) === 0, "serializer succeeded");
    return new TextDecoder().decode(new Uint8Array(c.memory.buffer, c.svg_text_ptr(t), n));
  }
  async function png(c, t) {
    const canvas = new OffscreenCanvas(c.svg_view(t, 7), c.svg_view(t, 8));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#16487b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
  }
  function image(c, t, bytes, pattern = [49152]) {
    let out = text(c, t, c.svg_xml_image_begin(t)),
      offset = 0,
      index = 0;
    while (offset < bytes.length) {
      const count = Math.min(pattern[index++ % pattern.length], bytes.length - offset);
      new Uint8Array(c.memory.buffer, c.svg_png_input_ptr(t), count).set(
        bytes.subarray(offset, offset + count),
      );
      const start = performance.now(),
        n = c.svg_png_write(t, count);
      timings.push(performance.now() - start);
      out += text(c, t, n);
      offset += count;
    }
    return out + text(c, t, c.svg_xml_image_end(t));
  }
  return { check, timings, draw, seal, stream, retire, text, png, image };
}
