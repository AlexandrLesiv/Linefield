import { compactGpu } from "./gpu-compaction.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
type Range = { offset: number; size: number };
type Slab = { buffer: WebGLBuffer; size: number; free: Range[]; live: number };
export type Allocation = {
  buffer: WebGLBuffer;
  offset: number;
  size: number;
  slab: Slab;
  used: number;
};
const budget = 128 * 1024 ** 2 - 256 * 1024;
export class GpuArena {
  private slabs: Slab[] = [];
  private values = new Map<bigint, Allocation>();
  private capacity = 0;
  private frame = 0;
  private disabled = false;
  private growth = true;
  private gl: WebGL2RenderingContext;
  private scratch: WebGLBuffer;
  private moves = 0;
  constructor(gl: WebGL2RenderingContext, scratch: WebGLBuffer) {
    this.scratch = scratch;
    this.gl = gl;
  }
  begin() {
    this.frame++;
    this.moves = 0;
  }
  private snapshot() {
    metrics.gpuAllocated = this.capacity;
    metrics.gpuLive = this.slabs.reduce((n, s) => n + s.live, 0);
    metrics.gpuFree = this.capacity - metrics.gpuLive;
  }
  private release(id: bigint) {
    const a = this.values.get(id);
    if (!a) return;
    a.slab.free.push({ offset: a.offset, size: a.size });
    a.slab.live -= a.size;
    this.values.delete(id);
    a.slab.free.sort((x, y) => x.offset - y.offset);
    for (let i = a.slab.free.length - 1; i > 0; i--) {
      const x = a.slab.free[i - 1],
        y = a.slab.free[i];
      if (x && y && x.offset + x.size === y.offset) {
        x.size += y.size;
        a.slab.free.splice(i, 1);
      }
    }
  }
  private allocate(size: number): Allocation | undefined {
    for (const slab of this.slabs) {
      const range = slab.free.find((r) => r.size >= size);
      if (!range) continue;
      const offset = range.offset;
      range.offset += size;
      range.size -= size;
      if (!range.size) slab.free.splice(slab.free.indexOf(range), 1);
      slab.live += size;
      return { buffer: slab.buffer, offset, size, slab, used: this.frame };
    }
    return undefined;
  }
  get(id: bigint, data: Float32Array): Allocation | undefined {
    if (this.disabled) return undefined;
    const existing = this.values.get(id);
    if (existing) {
      existing.used = this.frame;
      return existing;
    }
    if (this.values.size >= 4096) {
      const old = [...this.values].find(([, a]) => a.used !== this.frame);
      if (!old) return undefined;
      this.release(old[0]);
    }
    const size = 2 ** Math.ceil(Math.log2(Math.max(32, data.byteLength)));
    let result = this.allocate(size);
    if (!result) {
      for (const [key, a] of this.values) {
        if (a.used !== this.frame) {
          this.release(key);
          result = this.allocate(size);
          if (result) break;
        }
      }
    }
    if (!result && this.moves < 8) {
      compactGpu(this.gl, this.scratch, this.values.values(), 8);
      this.moves = 8;
      for (const slab of this.slabs) {
        const entries = [...this.values.values()]
          .filter((a) => a.slab === slab)
          .sort((a, b) => a.offset - b.offset);
        slab.free = [];
        let end = 0;
        for (const a of entries) {
          if (a.offset > end) slab.free.push({ offset: end, size: a.offset - end });
          end = a.offset + a.size;
        }
        if (end < slab.size) slab.free.push({ offset: end, size: slab.size - end });
      }
      result = this.allocate(size);
    }
    if (!result) this.growth = true;
    if (!result) return undefined;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, result.buffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, result.offset, data);
    metrics.gpuUploads++;
    metrics.gpuUploadBytes += data.byteLength;
    this.values.set(id, result);
    this.snapshot();
    return result;
  }
  maintain() {
    if (this.disabled || !this.growth) return;
    this.growth = false;
    const next = Math.min(4 * 1024 ** 2, Math.max(64 * 1024, this.capacity));
    if (this.capacity + next > budget) {
      this.snapshot();
      return;
    }
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      this.disabled = true;
      return;
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, next, this.gl.DYNAMIC_DRAW);
    if (this.gl.getError() !== this.gl.NO_ERROR) {
      this.gl.deleteBuffer(buffer);
      this.disabled = true;
      return;
    }
    this.slabs.push({ buffer, size: next, free: [{ offset: 0, size: next }], live: 0 });
    this.capacity += next;
    this.snapshot();
  }
  dispose() {
    for (const slab of this.slabs) this.gl.deleteBuffer(slab.buffer);
    this.slabs = [];
    this.values.clear();
    this.capacity = 0;
    this.snapshot();
  }
}
