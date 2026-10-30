import type { ExportOptions, ExportView, SvgExportCore } from "./types";
export class ExportSession {
  readonly token: number;
  constructor(readonly core: SvgExportCore) {
    this.token = core.svg_begin();
    if (!this.token) throw Error("svg-active-or-busy");
  }
  async prepare(options: ExportOptions, gate: () => Promise<void>): Promise<ExportView> {
    const { core: c, token: t } = this;
    let first = true;
    for (;;) {
      if (!first) await gate();
      first = false;
      const state = c.svg_prepare(t);
      if (state === 1) continue;
      if (state !== 2)
        throw Error(c.svg_error(t) === 6 ? "svg-memory-limit" : "svg-snapshot-changed");
      break;
    }
    if (
      c.svg_configure(
        t,
        options.density,
        options.background === "current" ? 0 : options.background === "white" ? 1 : 2,
        Number(options.grid),
      ) !== 1
    )
      throw Error("svg-options-unsupported");
    for (;;) {
      await gate();
      const state = c.svg_measure(t);
      if (state === 1) continue;
      if (state !== 2) throw Error(c.svg_error(t) === 2 ? "svg-extent-limit" : "svg-bounds-failed");
      break;
    }
    const v = (i: number) => c.svg_view(t, i);
    return {
      x: v(0),
      y: v(1),
      width: v(2),
      height: v(3),
      density: v(4),
      paper: v(5),
      grid: v(6),
      pixelWidth: v(7),
      pixelHeight: v(8),
      regionX: String(c.svg_origin_region(t, 0)),
      regionY: String(c.svg_origin_region(t, 1)),
    };
  }
  text(length: number) {
    const error = this.core.svg_error(this.token);
    if (error)
      throw Error(
        error === 5
          ? "svg-output-limit"
          : error === 6
            ? "svg-memory-limit"
            : "svg-serialization-failed",
      );
    if (!Number.isInteger(length) || length < 0 || length > 65536)
      throw Error("svg-serialization-boundary");
    return new Uint8Array(this.core.memory.buffer, this.core.svg_text_ptr(this.token), length);
  }
  async retire() {
    this.core.svg_cancel(this.token);
    while (this.core.svg_cleanup(this.token) !== 1)
      await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
