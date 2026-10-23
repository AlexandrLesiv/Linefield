// Fixed representation from web-sparse-coverage.md. Production does not allocate this yet.
export class SparseStorage {
  stamp = 0;
  readonly buffer = new ArrayBuffer(524288);
  readonly routes = new Int16Array(this.buffer, 0, 65536 * 2);
  readonly slots = new Uint16Array(this.buffer, 262144, 16384);
  readonly stamps = new Uint32Array(this.buffer, 294912, 16384);
  readonly destinations = new Int16Array(this.buffer, 360448, 2048);
  readonly descriptors = new Uint32Array(this.buffer, 364544, 8192);
  readonly fine = new Float64Array(this.buffer, 397312, 2048);
  readonly coarse = new Float64Array(this.buffer, 413696, 128);
  readonly projection = new Float64Array(this.buffer, 414720, 6144);
  readonly currentSlots = new Uint16Array(this.buffer, 463872, 1024);
  readonly registers = new Float64Array(this.buffer, 465920, 128);
  readonly bits = new DataView(this.buffer, 466944, 8);
  readonly matrix = new Float32Array(this.buffer, 466952, 9);
  readonly payloadBytes = 524288;
  readonly usedBytes = 470016;
  // One ArrayBuffer, eleven typed arrays and one DataView; object overhead is opaque.
  readonly wrapperObjects = 13;
}
