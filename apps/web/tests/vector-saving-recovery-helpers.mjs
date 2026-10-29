export const seed = (f, sampleCount = 4) =>
  f.evaluate((count) => {
    const e = lab.core;
    e.begin_with_style(7, 0x235588, 0.2, 1.2, 0.7);
    for (let i = 0; i < count; i++)
      e.push_precise(100 + i / 100, 200 + Math.sin(i / 20) * 25, 0.3 + (i % 5) / 10);
    e.commit();
    lab.requestRedraw();
  }, sampleCount);
export const digest = (f) =>
  f.evaluate(async () => {
    const e = lab.core,
      parts = [];
    for (let id = 0; id < e.count(); id++) {
      const row = [
        id,
        e.visible(id),
        e.stroke_layer(id),
        e.stroke_width(id),
        e.color(id),
        e.opacity(id),
        e.brush(id),
      ];
      for (let i = 0; i < e.raw_length(id); i++)
        row.push(
          String(e.raw_region(id, i, 0)),
          e.raw_local(id, i, 0),
          String(e.raw_region(id, i, 1)),
          e.raw_local(id, i, 1),
          e.raw_point(id, i, 2),
        );
      parts.push(row);
    }
    return Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(parts))),
      ),
      (x) => x.toString(16).padStart(2, "0"),
    ).join("");
  });
export const savingWorker = (page) =>
  page.workers().find((w) => w.url().includes("/saving/worker.js"));
export async function waitMarker(worker) {
  for (let i = 0; i < 500; i++) {
    if (await worker.evaluate(() => !!globalThis.commitHeld)) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw Error("commit hold not reached");
}
