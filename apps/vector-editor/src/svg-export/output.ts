import { OUTPUT_LIMIT } from "./types";
/** Fixed-size output parts avoid both one giant string and an unbounded part count. */
export class SvgOutput {
  private parts: ArrayBuffer[] = [];
  private pending = new Uint8Array(65536);
  private used = 0;
  bytes = 0;
  append(bytes: Uint8Array) {
    if (this.bytes + bytes.length > OUTPUT_LIMIT) throw Error("svg-output-limit");
    this.bytes += bytes.length;
    let offset = 0;
    while (offset < bytes.length) {
      const n = Math.min(bytes.length - offset, this.pending.length - this.used);
      this.pending.set(bytes.subarray(offset, offset + n), this.used);
      this.used += n;
      offset += n;
      if (this.used === this.pending.length) {
        this.parts.push(this.pending.buffer);
        this.pending = new Uint8Array(65536);
        this.used = 0;
      }
    }
  }
  finish() {
    if (this.used) this.parts.push(this.pending.slice(0, this.used).buffer);
    const blob = new Blob(this.parts, { type: "image/svg+xml" });
    this.clear();
    return blob;
  }
  clear() {
    this.parts = [];
    this.pending = new Uint8Array(0);
    this.used = 0;
  }
}
