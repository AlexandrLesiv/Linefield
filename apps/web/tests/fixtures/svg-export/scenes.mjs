export function scene(core, name) {
  const stroke = (brush, width, opacity, points, regional = false) => {
    core.begin_with_style(
      width,
      brush === 0 ? 0x224466 : brush === 1 ? 0x884422 : 0x335533,
      0.1,
      1,
      opacity,
    );
    core.set_active_brush(brush);
    for (const [x, y, p] of points) {
      if (regional) core.push_regional(3n * 2n ** 44n, x, 3n * 2n ** 44n, y, p);
      else core.push_precise(x, y, p);
    }
    core.commit();
  };
  const wave = Array.from({ length: 40 }, (_, i) => [
    20 + i * 4,
    70 + Math.sin(i / 3) * 35,
    0.2 + (i % 8) / 10,
  ]);
  if (name === "subpixel") {
    for (const [width, y] of [
      [0.1, 30],
      [0.3, 60],
      [0.7, 90],
      [1, 120],
    ])
      stroke(0, width, 0.6, [
        [20, y, 1],
        [170, y, 1],
      ]);
    for (const width of [0.1, 0.3, 0.7, 1]) stroke(0, width, 0.6, [[40 + width * 100, 160, 1]]);
  } else if (name === "slice") {
    stroke(0, 30, 0.5, [
      [20, 80, 1],
      [180, 80, 1],
    ]);
    core.slice_begin(0, 0);
    core.slice_push(96, 20);
    core.slice_push(96, 150);
    core.slice_commit();
    stroke(1, 30, 0.6, [
      [30, 120, 0.5],
      [160, 40, 0.7],
    ]);
  } else if (name === "transform") {
    stroke(2, 24, 0.6, wave);
    core.move_begin();
    core.move_add(0);
    core.transform_update(96, 96, 1.1, 0.35, 0, 0);
    core.move_commit();
    stroke(0, 8, 0.4, [
      [30, 30, 1],
      [170, 150, 1],
    ]);
  } else {
    const regional = name === "regional";
    stroke(0, 24, 0.6, wave, regional);
    stroke(
      1,
      30,
      0.5,
      [
        [30, 120, 0.5],
        [170, 30, 0.8],
      ],
      regional,
    );
    stroke(
      2,
      25,
      0.6,
      [
        [30, 30, 0.8],
        [170, 150, 0.5],
      ],
      regional,
    );
  }
  return {
    count: core.count(),
    raw: Array.from({ length: core.count() }, (_, id) => core.raw_length(id)),
  };
}
