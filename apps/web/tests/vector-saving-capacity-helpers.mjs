import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
/** Sampled aggregate RSS, not private memory: shared pages may be counted multiple times. */
export function processMemory(root) {
  const samples = [];
  let running = false,
    phase = "startup";
  async function sample() {
    if (running) return;
    running = true;
    try {
      const { stdout } = await run("ps", ["-axo", "pid=,ppid=,rss="], {
        maxBuffer: 4 * 1024 * 1024,
      });
      const rows = stdout
        .trim()
        .split("\n")
        .map((line) => line.trim().split(/\s+/).map(Number));
      const owned = new Set([root]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const [pid, parent] of rows)
          if (owned.has(parent) && !owned.has(pid)) {
            owned.add(pid);
            changed = true;
          }
      }
      const rss = rows.filter(([pid]) => owned.has(pid)).reduce((n, row) => n + row[2] * 1024, 0);
      samples.push({ phase, time: Date.now(), rss, processes: owned.size });
    } finally {
      running = false;
    }
  }
  const timer = setInterval(() => void sample().catch(() => {}), 100);
  return {
    phase(value) {
      phase = value;
    },
    async stop() {
      clearInterval(timer);
      await sample();
      const peaks = {};
      for (const s of samples) peaks[s.phase] = Math.max(peaks[s.phase] || 0, s.rss);
      return {
        method:
          "100ms sampled descendant aggregate RSS; shared pages may be duplicated; GPU allocations not isolated",
        peaks,
        samples,
      };
    },
  };
}
export async function drawingDigest(frame) {
  return frame.evaluate(async () => {
    const e = lab.core,
      parts = [];
    const hash = async (bytes) =>
      Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
    for (let id = 0; id < e.count(); id++) {
      const length = e.raw_length(id);
      parts.push([
        id,
        length,
        e.visible(id),
        e.stroke_layer(id),
        e.brush(id),
        e.stroke_width(id),
        e.color(id),
        e.opacity(id),
        ...Array.from({ length: 4 }, (_, n) => e.stroke_transform(id, n)),
      ]);
      for (let start = 0; start < length; start += 4096) {
        const count = Math.min(4096, length - start),
          bytes = new Uint8Array(count * 40),
          view = new DataView(bytes.buffer);
        for (let j = 0; j < count; j++) {
          const index = start + j,
            at = j * 40;
          view.setBigInt64(at, e.raw_region(id, index, 0), true);
          view.setFloat64(at + 8, e.raw_local(id, index, 0), true);
          view.setBigInt64(at + 16, e.raw_region(id, index, 1), true);
          view.setFloat64(at + 24, e.raw_local(id, index, 1), true);
          view.setFloat32(at + 32, e.raw_point(id, index, 2), true);
        }
        parts.push(await hash(bytes));
      }
    }
    return {
      digest: await hash(new TextEncoder().encode(JSON.stringify(parts))),
      count: e.count(),
      samples: Array.from({ length: e.count() }, (_, id) => e.raw_length(id)).reduce(
        (a, b) => a + b,
        0,
      ),
    };
  });
}
export async function ready(page) {
  await page.locator("iframe:not([hidden])").waitFor({ timeout: 120000 });
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  if (!frame) throw Error("Editor missing");
  await frame.waitForFunction(() => !!window.lab, null, { timeout: 120000 });
  return frame;
}
