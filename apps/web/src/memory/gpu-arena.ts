import { Residency, transition } from "./residency.ts";
import type { ResidencyToken, IdleBudget } from "./residency.ts";
import { compactGpu } from "./gpu-compaction.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
type Range = { offset: number; size: number };
type Slab = { buffer: WebGLBuffer; size: number; free: Range[]; live: number };
export type Allocation = {
  buffer: WebGLBuffer;
  offset: number;
  size: number;
  slab: Slab;
  usedPass: number;
  admitted: number;
};
export class GpuArena {
  private slabs: Slab[] = [];
  private values = new Map<bigint, Allocation>();
  private capacity = 0;
  private live = 0;
  private ranges = 0;
  private residency = new Residency((credit, budget) => this.idle(credit, budget));
  private scan: MapIterator<[bigint, Allocation]> | undefined;
  private scanning: ResidencyToken | undefined;
  protect() {
    this.scan = undefined;
    this.scanning = undefined;
    return this.residency.open();
  }
  unprotect(token: ResidencyToken, accepted: boolean) {
    this.residency.close(token, accepted);
  }
  private idle(credit: ResidencyToken | undefined, budget: IdleBudget) {
    if (!credit || this.residency.active) return false;
    if (this.scanning !== credit) {
      this.scanning = credit;
      this.scan = this.values.entries();
    }
    while (transition(budget)) {
      const free = this.capacity - this.live;
      if (free >= credit.bytes && 4096 - this.values.size >= credit.pages) return false;
      const next = this.scan?.next().value;
      if (!next) return false;
      if (next[1].usedPass === credit.sequence) continue;
      this.release(next[0]);
      metrics.gpuPressureRetirements++;
      this.snapshot();
    }
    return true;
  }
  private disabled = false;
  private growth = true;
  private gl: WebGL2RenderingContext;
  private scratch: WebGLBuffer;
  private moves = 0;
  private budget: number;
  constructor(gl: WebGL2RenderingContext, scratch: WebGLBuffer, targets: number) {
    this.scratch = scratch;
    this.gl = gl;
    this.budget = Math.min(128 * 1024 ** 2, 192 * 1024 ** 2 - targets) - 256 * 1024;
  }
  begin() {
    this.moves = 0;
  }
  get bytes() {
    return this.capacity;
  }
  get metadataEstimate() {
    return this.values.size * 160 + this.slabs.length * 128 + this.ranges * 48 + 256;
  }
  private snapshot() {
    metrics.gpuAllocated = this.capacity;
    metrics.gpuLive = this.live;
    metrics.gpuFree = this.capacity - this.live;
    metrics.gpuAllocations = this.values.size;
    metrics.gpuMetadataEstimate = this.metadataEstimate;
  }
  private release(id: bigint) {
    const a = this.values.get(id);
    if (!a) return;
    a.slab.free.push({ offset: a.offset, size: a.size });
    a.slab.live -= a.size;
    this.values.delete(id);
    this.live -= a.size;
    this.ranges++;
    // Constant-work idle release. Fragmented ranges are reconciled only by the
    // existing non-idle compaction fallback; aggregate free bytes are not a fit promise.
  }

  private allocate(size: number): Allocation | undefined {
    for (const slab of this.slabs) {
      const range = slab.free.find((r) => r.size >= size);
      if (!range) continue;
      const offset = range.offset;
      range.offset += size;
      range.size -= size;
      if (!range.size) {
        slab.free.splice(slab.free.indexOf(range), 1);
        this.ranges--;
      }
      slab.live += size;
      this.live += size;
      return {
        buffer: slab.buffer,
        offset,
        size,
        slab,
        usedPass: this.residency.active?.sequence ?? 0,
        admitted: this.residency.admit(),
      };
    }
    return undefined;
  }
  get(id: bigint, data: Float32Array): Allocation | undefined {
    if (this.disabled || !this.residency.enabled) return undefined;
    const existing = this.values.get(id);
    if (existing) {
      existing.usedPass = this.residency.active?.sequence ?? 0;
      this.values.delete(id);
      this.values.set(id, existing);
      metrics.gpuRetainedHits++;
      return existing;
    }
    const size = 2 ** Math.ceil(Math.log2(Math.max(32, data.byteLength)));
    if (this.values.size >= 4096) return this.refuse(size);
    let result = this.allocate(size);
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
      this.ranges = this.slabs.reduce((n, slab) => n + slab.free.length, 0);
      result = this.allocate(size);
    }
    if (!result) this.growth = true;
    if (!result) return this.refuse(size);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, result.buffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, result.offset, data);
    metrics.gpuUploads++;
    metrics.gpuUploadBytes += data.byteLength;
    this.values.set(id, result);
    this.snapshot();
    return result;
  }
  private refuse(size: number) {
    if (size <= 32768) {
      metrics.gpuCapacityRefusals++;
      this.residency.refuse(size, 1, 0, 4194304);
    }
    return undefined;
  }
  maintain() {
    if (this.disabled || !this.growth) return;
    this.growth = false;
    const next = Math.min(4 * 1024 ** 2, Math.max(64 * 1024, this.capacity));
    if (this.capacity + next > this.budget) {
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
    this.ranges++;
    this.snapshot();
  }
  dispose() {
    this.stop();
    for (const slab of this.slabs) this.gl.deleteBuffer(slab.buffer);
    this.slabs = [];
    this.values.clear();
    this.capacity = 0;
    this.live = 0;
    this.ranges = 0;
    this.snapshot();
  }
  stop() {
    this.disabled = true;
    this.residency.stop();
  }
}
