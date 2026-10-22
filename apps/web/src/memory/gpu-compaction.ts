import type { Allocation } from "./gpu-arena.ts";
export function compactGpu(
  gl: WebGL2RenderingContext,
  scratch: WebGLBuffer,
  values: Iterable<Allocation>,
  budget: number,
) {
  const byBuffer = new Map<WebGLBuffer, Allocation[]>();
  for (const value of values) {
    const group = byBuffer.get(value.buffer) ?? [];
    group.push(value);
    byBuffer.set(value.buffer, group);
  }
  let moved = 0;
  for (const entries of byBuffer.values()) {
    entries.sort((a, b) => a.offset - b.offset);
    let end = 0;
    for (const value of entries) {
      if (value.offset !== end) {
        if (moved === budget) return moved;
        // WebGL forbids overlapping same-buffer copies: reuse the reserved stream buffer.
        gl.bindBuffer(gl.COPY_READ_BUFFER, value.buffer);
        gl.bindBuffer(gl.COPY_WRITE_BUFFER, scratch);
        gl.copyBufferSubData(
          gl.COPY_READ_BUFFER,
          gl.COPY_WRITE_BUFFER,
          value.offset,
          0,
          value.size,
        );
        gl.bindBuffer(gl.COPY_READ_BUFFER, scratch);
        gl.bindBuffer(gl.COPY_WRITE_BUFFER, value.buffer);
        gl.copyBufferSubData(gl.COPY_READ_BUFFER, gl.COPY_WRITE_BUFFER, 0, end, value.size);
        value.offset = end;
        moved++;
      }
      end = value.offset + value.size;
    }
  }
  return moved;
}
